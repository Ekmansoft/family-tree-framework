import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
// Ensure demo styles are loaded when running the demo directly
import '../../src/styles/index.css';
import { TreeView } from '../../src/components/TreeView/TreeView';
import { parseGedcom } from '../../src/parser';
import { FileSelector } from './components/FileSelector';
import { DebugPanel } from './components/DebugPanel';
import { ControlPanel } from './components/ControlPanel';
import { PersonList } from './components/PersonList';
import { filterTreeByFocus } from './utils/filterTree';

const App: React.FC = () => {
    const [familyTree, setFamilyTree] = useState<{ individuals: any[]; families: any[] } | null>(null);
    const [demoFile, setDemoFile] = useState<string>('demo-family.ged');
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [focusItem, setFocusItem] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
    const [personQuery, setPersonQuery] = useState<string>('');
    const [maxGenerationsForward, setMaxGenerationsForward] = useState<number>(100);
    const [maxGenerationsBackward, setMaxGenerationsBackward] = useState<number>(10);
    const [maxNumberOfTrees, setMaxNumberOfTrees] = useState<number>(5);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const parsed = parseGedcom(text);
                console.log('Parsed uploaded GEDCOM:', parsed);
                setFamilyTree(parsed);
                setUploadedFileName(file.name);
                setDemoFile(''); // Clear demo file selection
                setSelectedId(null);
                setSelectedFamilyId(null);
                setFocusItem(null);
                // Auto-configure for large files
                if (parsed.individuals.length > 500) {
                    setShowDebugPanel(false);
                    setMaxNumberOfTrees(1);
                } else {
                    setShowDebugPanel(true);
                }
            } catch (err) {
                console.error('Failed to parse uploaded GEDCOM:', err);
                alert('Failed to parse GEDCOM file. Please check the console for details.');
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            console.error('Failed to read file');
            alert('Failed to read file');
            setIsLoading(false);
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        if (!demoFile) return; // Skip if using uploaded file
        
        const loadGedcom = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`./${demoFile}`);
                const text = await res.text();
                const parsed = parseGedcom(text);
                console.log('Parsed GEDCOM:', parsed);
                setFamilyTree(parsed);
                setUploadedFileName(null); // Clear uploaded file name when loading demo
                // clear selections when switching demos
                setSelectedId(null);
                setSelectedFamilyId(null);
                setFocusItem(null);
                // Auto-hide debug panel for large files and set max trees to 1
                if (parsed.individuals.length > 500) {
                    setShowDebugPanel(false);
                    setMaxNumberOfTrees(1);
                } else {
                    setShowDebugPanel(true);
                }
            } catch (err) {
                console.error('Failed to load demo GEDCOM:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadGedcom();
    }, [demoFile]);
    // zoom & pan state
    const [scale, setScale] = useState<number>(1);
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panRef = React.useRef<HTMLDivElement | null>(null);
    const treeViewRef = React.useRef<{ getPersonPosition: (id: string) => { x: number; y: number } | null }>(null);
    const lastPan = React.useRef<{ x: number; y: number } | null>(null);
    const pinchRef = React.useRef<{ initialDist: number; initialScale: number } | null>(null);

    return (
        <div>
            <h1>Family Tree Demo</h1>
            <FileSelector
                demoFile={demoFile}
                uploadedFileName={uploadedFileName}
                onDemoFileChange={(file) => {
                    setDemoFile(file);
                    setUploadedFileName(null);
                }}
                onFileUpload={handleFileUpload}
            />
            {isLoading && <div style={{ padding: 20, textAlign: 'center' }}>Loading GEDCOM file...</div>}
            {familyTree ? (
                <>
                    <DebugPanel
                        individuals={familyTree.individuals}
                        families={familyTree.families}
                        showDebugPanel={showDebugPanel}
                        onToggle={() => setShowDebugPanel(!showDebugPanel)}
                    />
                    <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div>
                            <button onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>Zoom +</button>
                            <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))} style={{ marginLeft: 8 }}>Zoom -</button>
                            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} style={{ marginLeft: 8 }}>Reset</button>
                        </div>
                    </div>
                    <ControlPanel
                        maxGenerationsForward={maxGenerationsForward}
                        maxGenerationsBackward={maxGenerationsBackward}
                        maxNumberOfTrees={maxNumberOfTrees}
                        scale={scale}
                        onMaxGenerationsForwardChange={setMaxGenerationsForward}
                        onMaxGenerationsBackwardChange={setMaxGenerationsBackward}
                        onMaxNumberOfTreesChange={setMaxNumberOfTrees}
                        onScaleChange={setScale}
                    />

                    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: '100vw' }}>
                        <PersonList
                            individuals={familyTree.individuals}
                            personQuery={personQuery}
                            onPersonQueryChange={setPersonQuery}
                            onPersonClick={(ind) => {
                                setSelectedId(ind.id);
                                setFocusItem(ind.id);
                                // Center the tree view on the selected person
                                setTimeout(() => {
                                    if (panRef.current) {
                                        const container = panRef.current;
                                        const containerRect = container.getBoundingClientRect();
                                        const centerX = containerRect.width / 2;
                                        const centerY = containerRect.height / 2;
                                        
                                        // Find the person box element
                                        const personBox = container.querySelector(`[data-person-id="${ind.id}"]`) as HTMLElement;
                                        if (personBox) {
                                            const boxRect = personBox.getBoundingClientRect();
                                            const boxCenterX = boxRect.left + boxRect.width / 2 - containerRect.left;
                                            const boxCenterY = boxRect.top + boxRect.height / 2 - containerRect.top;
                                            
                                            // Scroll to center the person
                                            container.scrollLeft += boxCenterX - centerX;
                                            container.scrollTop += boxCenterY - centerY;
                                        }
                                    }
                                }, 100);
                            }}
                        />

                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                        style={{ border: '1px solid #ddd', background: '#fafafa', overflow: 'scroll', cursor: isPanning ? 'grabbing' : 'grab', height: 600, width: '100%', touchAction: 'none' as const }}
                    >
                        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', minWidth: 2000, minHeight: 2000, padding: '500px' }}>
                            <TreeView
                                individuals={
                                    focusItem && maxNumberOfTrees === 1
                                        ? filterTreeByFocus(focusItem, familyTree.individuals, familyTree.families).individuals
                                        : familyTree.individuals
                                }
                                families={
                                    focusItem && maxNumberOfTrees === 1
                                        ? filterTreeByFocus(focusItem, familyTree.individuals, familyTree.families).families
                                        : familyTree.families
                                }
                                selectedId={selectedId}
                                focusItem={focusItem}
                                maxGenerationsForward={maxGenerationsForward}
                                maxGenerationsBackward={maxGenerationsBackward}
                                maxNumberOfTrees={maxNumberOfTrees}
                                onSelectPerson={(id: string) => {
                                    setSelectedId(id);
                                    setFocusItem(id);
                                }}
                                onSelectFamily={(fid: string) => {
                                    setSelectedFamilyId(fid);
                                    setFocusItem(fid);
                                }}
                            />
                        </div>
                    </div>
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