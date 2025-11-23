import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
// Ensure demo styles are loaded when running the demo directly
import '../../src/styles/index.css';
import { TreeView } from '../../src/components/TreeView/TreeView';
import { parseGedcom } from '../../src/parser';

const App: React.FC = () => {
    const [familyTree, setFamilyTree] = useState<{ individuals: any[]; families: any[] } | null>(null);

    useEffect(() => {
        const loadGedcom = async () => {
            try {
                const res = await fetch('./demo-family.ged');
                const text = await res.text();
                const parsed = parseGedcom(text);
                console.log('Parsed GEDCOM:', parsed);
                setFamilyTree(parsed);
            } catch (err) {
                console.error('Failed to load demo GEDCOM:', err);
            }
        };
        loadGedcom();
    }, []);
    const [demoFile, setDemoFile] = useState<string>('demo-family.ged');

    useEffect(() => {
        const loadGedcom = async () => {
            try {
                const res = await fetch(`./${demoFile}`);
                const text = await res.text();
                const parsed = parseGedcom(text);
                console.log('Parsed GEDCOM:', parsed);
                setFamilyTree(parsed);
                // clear selections when switching demos
                setSelectedId(null);
                setSelectedFamilyId(null);
            } catch (err) {
                console.error('Failed to load demo GEDCOM:', err);
            }
        };
        loadGedcom();
    }, [demoFile]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
    // zoom & pan state
    const [scale, setScale] = useState<number>(1);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panRef = React.useRef<HTMLDivElement | null>(null);
    const lastPan = React.useRef<{ x: number; y: number } | null>(null);
    const pinchRef = React.useRef<{ initialDist: number; initialScale: number } | null>(null);

    return (
        <div>
            <h1>Family Tree Demo</h1>
            <div style={{ marginBottom: 8 }}>
                <label htmlFor="demo-select" style={{ marginRight: 8 }}>Demo file:</label>
                <select id="demo-select" value={demoFile} onChange={(e) => setDemoFile(e.target.value)}>
                    <option value="demo-family.ged">Simple demo (2 parents, 3 children)</option>
                    <option value="demo-family-3gen.ged">3-generation demo</option>
                        <option value="sample-from-image.ged">Sample from image (Cruz / Willow branch)</option>
                </select>
            </div>
            {familyTree ? (
                <>
                    <div style={{ marginBottom: 12, padding: 8, background: '#fff', border: '1px solid #ddd' }}>
                        <strong>Debug: parsed GEDCOM</strong>
                        <div>Individuals: {familyTree.individuals.length}</div>
                        <div>Families: {familyTree.families.length}</div>
                        <div style={{ marginTop: 8 }}>
                            <strong>Individuals list:</strong>
                            <ul>
                                {familyTree.individuals.map((ind) => (
                                    <li key={ind.id}>{ind.id}: {ind.name || '(no name)'}</li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <strong>Families list:</strong>
                            <ul>
                                {familyTree.families.map((f) => (
                                    <li key={f.id}>{f.id}{f.children ? ` — ${f.children.length} children` : ''}</li>
                                ))}
                            </ul>
                        </div>
                        <pre style={{ maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(familyTree, null, 2)}</pre>
                    </div>
                    <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div>
                            <button onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>Zoom +</button>
                            <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))} style={{ marginLeft: 8 }}>Zoom -</button>
                            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} style={{ marginLeft: 8 }}>Reset</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="zoom-range">Zoom</label>
                            <input id="zoom-range" type="range" min="0.5" max="2" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                        </div>
                        <div style={{ color: '#666', fontSize: 13, marginLeft: 'auto' }}>Drag to pan</div>
                    </div>

                    <div
                        ref={panRef}
                        onMouseDown={(e) => {
                            setIsPanning(true);
                            lastPan.current = { x: e.clientX, y: e.clientY };
                        }}
                        onMouseMove={(e) => {
                            if (!isPanning || !lastPan.current) return;
                            const dx = e.clientX - lastPan.current.x;
                            const dy = e.clientY - lastPan.current.y;
                            lastPan.current = { x: e.clientX, y: e.clientY };
                            setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
                        }}
                        onMouseUp={() => { setIsPanning(false); lastPan.current = null; }}
                        onMouseLeave={() => { setIsPanning(false); lastPan.current = null; }}
                        onTouchStart={(e) => {
                            if (!panRef.current) return;
                            const touches = e.touches;
                            if (touches.length === 1) {
                                // single-finger pan
                                const t = touches[0];
                                setIsPanning(true);
                                lastPan.current = { x: t.clientX, y: t.clientY };
                            } else if (touches.length === 2) {
                                // pinch start
                                const t0 = touches[0];
                                const t1 = touches[1];
                                const dx = t1.clientX - t0.clientX;
                                const dy = t1.clientY - t0.clientY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                pinchRef.current = { initialDist: dist, initialScale: scale };
                            }
                        }}
                        onTouchMove={(e) => {
                            if (!panRef.current) return;
                            const touches = e.touches;
                            e.preventDefault();
                            if (touches.length === 1 && !pinchRef.current) {
                                const t = touches[0];
                                if (!lastPan.current) {
                                    lastPan.current = { x: t.clientX, y: t.clientY };
                                    return;
                                }
                                const dx = t.clientX - lastPan.current.x;
                                const dy = t.clientY - lastPan.current.y;
                                lastPan.current = { x: t.clientX, y: t.clientY };
                                setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
                            } else if (touches.length === 2 && pinchRef.current) {
                                const t0 = touches[0];
                                const t1 = touches[1];
                                const dx = t1.clientX - t0.clientX;
                                const dy = t1.clientY - t0.clientY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const s0 = pinchRef.current.initialScale;
                                const sNewRaw = s0 * (dist / pinchRef.current.initialDist);
                                const sNew = Math.max(0.5, Math.min(2, sNewRaw));

                                // Compute touch center relative to container
                                const rect = panRef.current.getBoundingClientRect();
                                const centerClientX = (t0.clientX + t1.clientX) / 2;
                                const centerClientY = (t0.clientY + t1.clientY) / 2;
                                const center = { x: centerClientX - rect.left, y: centerClientY - rect.top };

                                // Adjust offset so the focal point stays under fingers while scaling
                                setOffset((old) => {
                                    const sOld = scale;
                                    const sRatio = sNew / sOld;
                                    const newOffset = {
                                        x: old.x + (sRatio - 1) * (old.x - center.x),
                                        y: old.y + (sRatio - 1) * (old.y - center.y),
                                    };
                                    return newOffset;
                                });
                                setScale(sNew);
                            }
                        }}
                        onTouchEnd={(e) => {
                            // end pinch or pan
                            if (e.touches.length < 2) pinchRef.current = null;
                            if (e.touches.length === 0) {
                                setIsPanning(false);
                                lastPan.current = null;
                            }
                        }}
                        style={{ border: '1px solid #ddd', background: '#fafafa', overflow: 'auto', cursor: isPanning ? 'grabbing' : 'grab', height: 600, touchAction: 'none' as const }}
                    >
                        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', minHeight: 400 }}>
                            <TreeView
                                individuals={familyTree.individuals}
                                families={familyTree.families}
                                selectedId={selectedId}
                                onSelectPerson={(id: string) => setSelectedId(id)}
                                onSelectFamily={(fid: string) => setSelectedFamilyId(fid)}
                            />
                        </div>
                    </div>
                    {selectedId && (
                        <div className="editor">
                            <h3>Selected Person</h3>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(
                                    familyTree.individuals.find((i) => i.id === selectedId),
                                    null,
                                    2
                                )}
                            </pre>
                        </div>
                    )}
                    {selectedFamilyId && (
                        <div className="editor">
                            <h3>Selected Family</h3>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(familyTree.families.find((f) => f.id === selectedFamilyId), null, 2)}
                            </pre>
                        </div>
                    )}
                </>
            ) : (
                <div>Loading demo GEDCOM...</div>
            )}
        </div>
    );
};

class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error: Error | null; info: any | null }> {
    constructor(props: any) {
        super(props);
        this.state = { error: null, info: null };
    }
    componentDidCatch(error: Error, info: any) {
        // Log and store
        // eslint-disable-next-line no-console
        console.error('Uncaught error in demo render:', error, info);
        this.setState({ error, info });
    }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 20, background: '#fff', border: '1px solid #c00', color: '#900' }}>
                    <h2>Rendering Error</h2>
                    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
                        {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <details>
                            <summary>More info</summary>
                            <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(this.state.info, null, 2)}</pre>
                        </details>
                    </div>
                </div>
            );
        }
        return this.props.children as any;
    }
}

ReactDOM.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>,
    document.getElementById('root')
);