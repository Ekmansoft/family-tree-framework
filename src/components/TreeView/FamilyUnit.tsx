import React from 'react';

interface Person {
  id?: string;
  name?: string;
}

interface FamilyUnitProps {
  parents: Person[];
  children: Person[];
  selectedId?: string | null;
  onSelectPerson?: (id: string) => void;
  familyId?: string;
  onSelectFamily?: (id: string) => void;
}

const FamilyUnit: React.FC<FamilyUnitProps> = ({ parents, children, selectedId, onSelectPerson, familyId, onSelectFamily }) => {
  // Positions are expressed as percentage along the container width.
  const parentPositions = parents.length === 1 ? [50] : [40, 60];

  const childPositions = children.map((_, i) => {
    const start = 25;
    const end = 75;
    const count = children.length;
    if (count === 1) return 50;
    return start + (i * (end - start)) / (count - 1);
  });

  // Smaller layout for single-screen fit
  const height = 120;
  const parentY = 14;
  const childY = 78;

  // family box sits between parents and children
  const familyY = (parentY + childY) / 2;
  const familyX = parents.length > 0 ? (parentPositions.reduce((a, b) => a + b, 0) / parentPositions.length) : 50;

  return (
    <div className="family-unit">
      <svg className="family-connectors" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {/* Draw lines from each parent to the family box */}
        {parents.map((p, pi) => (
          <line
            key={`lp-${pi}`}
            x1={`${parentPositions[pi]}`}
            y1={`${parentY + 12}`}
            x2={`${familyX}`}
            y2={`${familyY}`}
            stroke="#666"
            strokeWidth={0.5}
          />
        ))}

        {/* Draw lines from family box to each child */}
        {childPositions.map((cx, ci) => (
          <line
            key={`lc-${ci}`}
            x1={`${familyX}`}
            y1={`${familyY}`}
            x2={`${cx}`}
            y2={`${childY}`}
            stroke="#666"
            strokeWidth={0.5}
          />
        ))}
      </svg>

      {/* Parents row */}
      <div className="parents-row">
        {parents.map((p, i) => {
          // transient debug: log individual's id and parsed dates when rendered
          try {
            if (typeof window !== 'undefined' && (window as any).SHOW_PERSON_RENDER_LOGS) {
              // eslint-disable-next-line no-console
              console.log('render person (parent):', p.id, { birthDate: (p as any).birthDate, deathDate: (p as any).deathDate });
            }
          } catch {}
          return (
            <div
              key={p.id || i}
              className={`person-box parent ${selectedId === p.id ? 'selected' : ''}`}
              style={{ left: `${parentPositions[i]}%`, transform: 'translateX(-50%)' }}
              onClick={() => onSelectPerson?.(p.id || '')}
              title={p.name || 'Unknown'}
            >
              <div className="person-name">{p.name || 'Unknown'}</div>
              {/* show birth/death if present on the person object */}
              {(p as any).birthDate || (p as any).deathDate ? (
                <div className="person-dates">{(p as any).birthDate?.iso || (p as any).birthDate?.approxIso || (p as any).birthDate?.original ? `b. ${((p as any).birthDate?.iso || (p as any).birthDate?.approxIso || (p as any).birthDate?.original)}` : ''}{(p as any).birthDate && (p as any).deathDate ? ' — ' : ''}{(p as any).deathDate?.iso || (p as any).deathDate?.approxIso || (p as any).deathDate?.original ? `d. ${((p as any).deathDate?.iso || (p as any).deathDate?.approxIso || (p as any).deathDate?.original)}` : ''}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Children row */}
      <div className="children-row">
        {children.map((c, i) => {
          try {
            if (typeof window !== 'undefined' && (window as any).SHOW_PERSON_RENDER_LOGS) {
              // eslint-disable-next-line no-console
              console.log('render person (child):', c.id, { birthDate: (c as any).birthDate, deathDate: (c as any).deathDate });
            }
          } catch {}
          return (
            <div
              key={c.id || i}
              className={`person-box child ${selectedId === c.id ? 'selected' : ''}`}
              style={{ left: `${childPositions[i]}%`, transform: 'translateX(-50%)' }}
              onClick={() => onSelectPerson?.(c.id || '')}
              title={c.name || 'Unknown'}
            >
              <div className="person-name">{c.name || 'Unknown'}</div>
              {(c as any).birthDate || (c as any).deathDate ? (
                <div className="person-dates">{(c as any).birthDate?.iso || (c as any).birthDate?.approxIso || (c as any).birthDate?.original ? `b. ${((c as any).birthDate?.iso || (c as any).birthDate?.approxIso || (c as any).birthDate?.original)}` : ''}{(c as any).birthDate && (c as any).deathDate ? ' — ' : ''}{(c as any).deathDate?.iso || (c as any).deathDate?.approxIso || (c as any).deathDate?.original ? `d. ${((c as any).deathDate?.iso || (c as any).deathDate?.approxIso || (c as any).deathDate?.original)}` : ''}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Family box in between parents and children */}
      <div
        className="family-box"
        style={{ left: `${familyX}%`, top: `${familyY}%`, transform: 'translate(-50%, -50%)' }}
        title={familyId ? `Family ${familyId}` : 'Family'}
        onClick={() => onSelectFamily?.(familyId || '')}
        role={onSelectFamily ? 'button' : undefined}
      >
        ▬
      </div>
    </div>
  );
};

export default FamilyUnit;
