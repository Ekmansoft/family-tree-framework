import React from 'react';

interface ConnectionLinesProps {
    familyPositions: Array<{ 
        id: string; 
        x: number; 
        y: number; 
        parents: string[]; 
        children: string[] 
    }>;
    pos: Record<string, { x: number; y: number }>;
    personEls: React.MutableRefObject<Map<string, HTMLDivElement>>;
    personHalfMap: React.MutableRefObject<Map<string, number>>;
    familyHalfMap: React.MutableRefObject<Map<string, number>>;
    containerRectRef: React.MutableRefObject<DOMRect | null>;
    actualTreeWidth: number;
    totalHeight: number;
}

/**
 * Renders SVG connection lines between persons and families
 * Handles fallback DOM measurements when positions aren't available
 */
export const ConnectionLines: React.FC<ConnectionLinesProps> = ({
    familyPositions,
    pos,
    personEls,
    personHalfMap,
    familyHalfMap,
    containerRectRef,
    actualTreeWidth,
    totalHeight
}) => {
    return (
        <svg 
            className="family-connectors" 
            viewBox={`0 0 ${actualTreeWidth} ${totalHeight}`} 
            style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                width: '100%', 
                height: `${totalHeight}px`, 
                pointerEvents: 'none' 
            }}
        >
            {/* Draw lines parent -> family, family -> child */}
            {familyPositions.map((fam) => (
                <g key={`fam-${fam.id}`}>
                    {fam.parents.map((pid, pi) => {
                        let p = pos[pid];
                        // fallback to DOM measurement if layout didn't assign pos yet
                        if (!p) {
                            const el = personEls.current.get(pid);
                            const crect = containerRectRef.current;
                            if (el && crect) {
                                try {
                                    const r = el.getBoundingClientRect();
                                    p = { 
                                        x: (r.left - crect.left) + r.width / 2, 
                                        y: (r.top - crect.top) + r.height / 2 
                                    };
                                } catch {
                                    p = { 
                                        x: el.offsetLeft + el.clientWidth / 2, 
                                        y: el.offsetTop + el.clientHeight / 2 
                                    };
                                }
                            }
                        }
                        if (!p) return null;
                        
                        const perHalf = personHalfMap.current.get(pid) ?? 
                            (personEls.current.get(pid)?.clientHeight 
                                ? personEls.current.get(pid)!.clientHeight / 2 
                                : 24);
                        const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                        const x1 = p.x;
                        const y1 = p.y + perHalf;
                        const x2 = fam.x;
                        const y2 = fam.y - famHalf;
                        
                        return (
                            <line 
                                key={`pf-${fam.id}-${pi}`} 
                                x1={`${x1}`} 
                                y1={`${y1}`} 
                                x2={`${x2}`} 
                                y2={`${y2}`} 
                                stroke="#666" 
                                strokeWidth={0.6} 
                            />
                        );
                    })}
                    
                    {fam.children.map((cid, ci) => {
                        let c = pos[cid];
                        if (!c) {
                            const el = personEls.current.get(cid);
                            const crect = containerRectRef.current;
                            if (el && crect) {
                                try {
                                    const r = el.getBoundingClientRect();
                                    c = { 
                                        x: (r.left - crect.left) + r.width / 2, 
                                        y: (r.top - crect.top) + r.height / 2 
                                    };
                                } catch {
                                    c = { 
                                        x: el.offsetLeft + el.clientWidth / 2, 
                                        y: el.offsetTop + el.clientHeight / 2 
                                    };
                                }
                            }
                        }
                        if (!c) return null;
                        
                        const perHalf = personHalfMap.current.get(cid) ?? 
                            (personEls.current.get(cid)?.clientHeight 
                                ? personEls.current.get(cid)!.clientHeight / 2 
                                : 24);
                        const famHalf = familyHalfMap.current.get(fam.id) ?? 9;
                        const x1 = fam.x;
                        const y1 = fam.y + famHalf;
                        const x2 = c.x;
                        const y2 = c.y - perHalf;
                        
                        return (
                            <line 
                                key={`fc-${fam.id}-${ci}`} 
                                x1={`${x1}`} 
                                y1={`${y1}`} 
                                x2={`${x2}`} 
                                y2={`${y2}`} 
                                stroke="#666" 
                                strokeWidth={0.6} 
                            />
                        );
                    })}
                </g>
            ))}
        </svg>
    );
};
