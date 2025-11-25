import React from 'react';

interface ControlPanelProps {
    maxGenerationsForward: number;
    maxGenerationsBackward: number;
    maxNumberOfTrees: number;
    scale: number;
    onMaxGenerationsForwardChange: (value: number) => void;
    onMaxGenerationsBackwardChange: (value: number) => void;
    onMaxNumberOfTreesChange: (value: number) => void;
    onScaleChange: (value: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
    maxGenerationsForward,
    maxGenerationsBackward,
    maxNumberOfTrees,
    scale,
    onMaxGenerationsForwardChange,
    onMaxGenerationsBackwardChange,
    onMaxNumberOfTreesChange,
    onScaleChange
}) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="gen-forward">Max generations forward</label>
                <input
                    id="gen-forward"
                    type="number"
                    min="1"
                    max="100"
                    value={maxGenerationsForward}
                    onChange={(e) => onMaxGenerationsForwardChange(Number(e.target.value))}
                    style={{ width: 60 }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="gen-backward">Max generations backward</label>
                <input
                    id="gen-backward"
                    type="number"
                    min="1"
                    max="100"
                    value={maxGenerationsBackward}
                    onChange={(e) => onMaxGenerationsBackwardChange(Number(e.target.value))}
                    style={{ width: 60 }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="trees-select">Max trees</label>
                <select
                    id="trees-select"
                    value={maxNumberOfTrees}
                    onChange={(e) => onMaxNumberOfTreesChange(Number(e.target.value))}
                >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="zoom-range">Zoom</label>
                <input
                    id="zoom-range"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    value={scale}
                    onChange={(e) => onScaleChange(Number(e.target.value))}
                />
            </div>
            <div style={{ color: '#666', fontSize: 13, marginLeft: 'auto' }}>Drag to pan</div>
        </div>
    );
};
