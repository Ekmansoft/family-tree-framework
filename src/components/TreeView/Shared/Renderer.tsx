import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Individual } from '../types';
import type { LayoutResult } from '../layouts/types';

export interface RendererProps {
  individuals: Individual[];
  layout: LayoutResult;
  selectedId?: string | null;
  onSelectPerson?: (id: string) => void;
  onSelectFamily?: (id: string) => void;
  onBounds?: (width: number, height: number) => void;
  boxWidth?: number;
  boxHeight?: number;
  /** When true, align connector endpoints to box edges using DOM measurements */
  enableConnectorEdgeAlignment?: boolean;
}

function formatGedcomDateForDisplay(d: any) {
  if (!d) return null;
  return d.iso || d.approxIso || d.original || null;
}

/**
 * Shared tree renderer that draws person boxes and connectors based on a generic layout
 * - Uses `layout.connections` when available (e.g., Ancestor layout)
 * - Falls back to `layout.familyPositions` to render parent/child connectors (Vertical layout)
 */
export const Renderer: React.FC<RendererProps> = ({
  individuals,
  layout,
  selectedId,
  onSelectPerson,
  onSelectFamily,
  onBounds,
  boxWidth = 140,
  boxHeight = 40,
  enableConnectorEdgeAlignment = true,
}) => {
  const { personPositions, familyPositions = [], bounds, connections = [] } = layout;

  // Report bounds
  useEffect(() => {
    try { onBounds && onBounds(bounds.width, bounds.height); } catch {}
  }, [bounds.width, bounds.height, onBounds]);

  // Refs used for connector endpoint alignment when family positions are used
  const personEls = useRef(new Map<string, HTMLDivElement>());
  const familyEls = useRef(new Map<string, HTMLDivElement>());
  const innerRef = useRef<HTMLDivElement | null>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const personHalfMap = useRef(new Map<string, number>());
  const familyHalfMap = useRef(new Map<string, number>());

  // Measure DOM to align connectors with box edges (optional)
  useLayoutEffect(() => {
    if (!enableConnectorEdgeAlignment) return;
    const pMap = new Map<string, number>();
    personEls.current.forEach((el, id) => {
      try {
        pMap.set(id, el.clientHeight / 2 || 24);
      } catch {
        pMap.set(id, 24);
      }
    });
    const fMap = new Map<string, number>();
    familyEls.current.forEach((el, id) => {
      try {
        fMap.set(id, el.clientHeight / 2 || 9);
      } catch {
        fMap.set(id, 9);
      }
    });
    personHalfMap.current = pMap;
    familyHalfMap.current = fMap;

    try {
      if (innerRef.current) {
        containerRectRef.current = innerRef.current.getBoundingClientRect();
      }
    } catch {
      containerRectRef.current = null;
    }
  }, [individuals, layout, enableConnectorEdgeAlignment]);

  const indById = useMemo(() => new Map<string, Individual>(individuals.map(i => [i.id, i])), [individuals]);

  return (
    <div className="tree-view" style={{ position: 'relative', width: bounds.width, height: bounds.height }}>
      <div ref={innerRef} style={{ position: 'relative', width: bounds.width, height: bounds.height }}>
        <svg
          className="family-connectors"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${bounds.height}px`, pointerEvents: 'none' }}
        >
          {connections && connections.length > 0 ? (
            connections.map((c, idx) => {
              const child = personPositions[c.from];
              const parent = personPositions[c.to];
              if (!child || !parent) return null;
              return (
                <line
                  key={`conn-${idx}`}
                  x1={`${child.x}`}
                  y1={`${child.y}`}
                  x2={`${parent.x}`}
                  y2={`${parent.y}`}
                  stroke="#666"
                  strokeWidth={0.8}
                />
              );
            })
          ) : (
            familyPositions.map((fam) => (
              <g key={`fam-${fam.id}`}>
                {fam.parents.map((pid, pi) => {
                  const p = personPositions[pid];
                  if (!p) return null;
                  const perHalf = personHalfMap.current.get(pid) ?? Math.max(20, Math.min(100, boxHeight / 2));
                  const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                  const x1 = p.x;
                  const y1 = p.y + perHalf;
                  const x2 = fam.x;
                  const y2 = fam.y - famHalf;
                  return (
                    <line key={`pf-${fam.id}-${pi}`} x1={`${x1}`} y1={`${y1}`} x2={`${x2}`} y2={`${y2}`} stroke="#666" strokeWidth={0.6} />
                  );
                })}
                {fam.children.map((cid, ci) => {
                  const c = personPositions[cid];
                  if (!c) return null;
                  const perHalf = personHalfMap.current.get(cid) ?? Math.max(20, Math.min(100, boxHeight / 2));
                  const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                  const x1 = fam.x;
                  const y1 = fam.y + famHalf;
                  const x2 = c.x;
                  const y2 = c.y - perHalf;
                  return (
                    <line key={`fc-${fam.id}-${ci}`} x1={`${x1}`} y1={`${y1}`} x2={`${x2}`} y2={`${y2}`} stroke="#666" strokeWidth={0.6} />
                  );
                })}
              </g>
            ))
          )}
        </svg>

        {individuals.map(ind => {
          const p = personPositions[ind.id];
          if (!p) return null;
          const birth = formatGedcomDateForDisplay((ind as any).birthDate);
          const death = formatGedcomDateForDisplay((ind as any).deathDate);
          const dateLine = birth || death ? `${birth ? `b. ${birth}` : ''}${birth && death ? ' — ' : ''}${death ? `d. ${death}` : ''}` : null;
          const genderClass = ind.gender === 'M' ? 'male' : ind.gender === 'F' ? 'female' : 'unknown';
          return (
            <div
              key={ind.id}
              className={`person-box ${selectedId === ind.id ? 'selected' : ''} ${genderClass}`}
              style={{ left: `${p.x}px`, top: p.y, transform: 'translate(-50%, -50%)', position: 'absolute', width: boxWidth }}
              onClick={() => onSelectPerson?.(ind.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPerson?.(ind.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${ind.name || ind.id}${dateLine ? `, ${dateLine}` : ''}`}
              data-person-id={ind.id}
              title={ind.name || ind.id}
              ref={(el) => {
                if (!enableConnectorEdgeAlignment) return;
                if (el) personEls.current.set(ind.id, el);
                else personEls.current.delete(ind.id);
              }}
            >
              <div className="person-name">{ind.name || ind.id}</div>
              {dateLine && <div className="person-dates">{dateLine}</div>}
              <div style={{ fontSize: 10, color: '#666' }}>{ind.id}</div>
            </div>
          );
        })}

        {familyPositions.map((fam) => (
          <div
            key={`fambox-${fam.id}`}
            className="family-box"
            style={{ left: `${fam.x}px`, top: fam.y, transform: 'translate(-50%, -50%)', position: 'absolute' }}
            onClick={() => onSelectFamily?.(fam.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectFamily?.(fam.id);
              }
            }}
            title={fam.id}
            role="button"
            tabIndex={0}
            aria-label={`Family ${fam.id}`}
            ref={(el) => {
              if (!enableConnectorEdgeAlignment) return;
              if (el) familyEls.current.set(fam.id, el);
              else familyEls.current.delete(fam.id);
            }}
            data-family-id={fam.id}
          >
            {fam.id}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Renderer;
