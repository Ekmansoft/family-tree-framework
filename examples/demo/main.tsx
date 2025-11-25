import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
// Ensure demo styles are loaded when running the demo directly
import '../../src/styles/index.css';
import { TreeView } from '../../src/components/TreeView/TreeView';
import { parseGedcom } from '../../src/parser';

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
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                    <label htmlFor="demo-select" style={{ marginRight: 8 }}>Demo file:</label>
                    <select 
                        id="demo-select" 
                        value={demoFile} 
                        onChange={(e) => {
                            setDemoFile(e.target.value);
                            setUploadedFileName(null);
                        }}
                    >
                        <option value="demo-family.ged">Simple demo (2 parents, 3 children)</option>
                        <option value="demo-family-3gen.ged">3-generation demo</option>
                        <option value="sample-from-image.ged">Sample from image (Cruz / Willow branch)</option>
                        <option value="Queen.ged">Queen (sample)</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#666' }}>or</span>
                    <label 
                        htmlFor="file-upload" 
                        style={{ 
                            padding: '6px 12px', 
                            background: '#007acc', 
                            color: 'white', 
                            borderRadius: 4, 
                            cursor: 'pointer',
                            fontSize: 14
                        }}
                    >
                        Upload GEDCOM
                    </label>
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept=".ged,.gedcom" 
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    {uploadedFileName && (
                        <span style={{ fontSize: 13, color: '#666' }}>
                            ({uploadedFileName})
                        </span>
                    )}
                </div>
            </div>
            {isLoading && <div style={{ padding: 20, textAlign: 'center' }}>Loading GEDCOM file...</div>}
            {familyTree ? (
                <>
                    <div style={{ marginBottom: 12, padding: 8, background: '#fff', border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showDebugPanel ? 8 : 0 }}>
                            <strong>Debug: parsed GEDCOM</strong>
                            <button onClick={() => setShowDebugPanel(!showDebugPanel)} style={{ padding: '4px 8px', fontSize: 12 }}>
                                {showDebugPanel ? 'Hide' : 'Show'}
                            </button>
                            <span style={{ fontSize: 12, color: '#666' }}>Individuals: {familyTree.individuals.length} | Families: {familyTree.families.length}</span>
                        </div>
                        {showDebugPanel && (
                        <div style={{ maxHeight: 260, overflow: 'auto' }}>
                        <div style={{ marginTop: 8 }}>
                            <strong>Individuals list:</strong>
                            <ul>
                                {familyTree.individuals.map((ind) => (
                                    <li key={ind.id}>
                                        {ind.id}: {ind.name || '(no name)'}
                                        {(ind.birthDate || ind.deathDate) && (
                                            <span style={{ color: '#666', marginLeft: 8, fontSize: 12 }}>
                                                {ind.birthDate ? `b. ${ind.birthDate.iso || ind.birthDate.approxIso || ind.birthDate.original}` : ''}
                                                {ind.birthDate && ind.deathDate ? ' ' : ''}
                                                {ind.deathDate ? `d. ${ind.deathDate.iso || ind.deathDate.approxIso || ind.deathDate.original}` : ''}
                                            </span>
                                        )}
                                    </li>
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
                        {familyTree.individuals.length < 200 && (
                            <pre style={{ maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(familyTree, null, 2)}</pre>
                        )}
                        </div>
                        )}
                    </div>
                    <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div>
                            <button onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>Zoom +</button>
                            <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))} style={{ marginLeft: 8 }}>Zoom -</button>
                            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} style={{ marginLeft: 8 }}>Reset</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="gen-forward-range">Max forward generations</label>
                            <input id="gen-forward-range" type="range" min={1} max={500} step={1} value={maxGenerationsForward} onChange={(e) => setMaxGenerationsForward(Number(e.target.value))} />
                            <div style={{ minWidth: 40, textAlign: 'center' }}>{maxGenerationsForward}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="gen-backward-range">Max backward generations</label>
                            <input id="gen-backward-range" type="range" min={1} max={100} step={1} value={maxGenerationsBackward} onChange={(e) => setMaxGenerationsBackward(Number(e.target.value))} />
                            <div style={{ minWidth: 40, textAlign: 'center' }}>{maxGenerationsBackward}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="trees-select">Max trees</label>
                            <select id="trees-select" value={maxNumberOfTrees} onChange={(e) => setMaxNumberOfTrees(Number(e.target.value))}>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="zoom-range">Zoom</label>
                            <input id="zoom-range" type="range" min="0.5" max="2" step="0.01" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                        </div>
                        <div style={{ color: '#666', fontSize: 13, marginLeft: 'auto' }}>Drag to pan</div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: '100vw' }}>
                        <div style={{ width: 250, minWidth: 250, borderRight: '1px solid #ddd', paddingRight: 12, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <input
                                    placeholder="Search people..."
                                    value={personQuery}
                                    onChange={(e) => setPersonQuery(e.target.value)}
                                    style={{ flex: 1, padding: '6px 8px' }}
                                />
                                <div style={{ fontSize: 12, color: '#666' }}>{familyTree.individuals.length}</div>
                            </div>
                            <div style={{ maxHeight: 600, overflow: 'auto' }}>
                                {(familyTree.individuals || []).filter((ind) => {
                                    if (!personQuery) return true;
                                    const q = personQuery.toLowerCase();
                                    return (ind.name || '').toLowerCase().includes(q) || (ind.id || '').toLowerCase().includes(q);
                                }).slice(0, 200).map((ind) => (
                                    <div
                                        key={ind.id}
                                        onClick={() => {
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
                                        style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                                        title={ind.name}
                                    >
                                        <div style={{ fontSize: 13 }}>{ind.name || ind.id}</div>
                                        <div style={{ fontSize: 11, color: '#666' }}>{ind.id}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

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
                                        ? (() => {
                                              // Build family lookup map once
                                              const famMap = new Map(familyTree.families.map(f => [f.id, f]));
                                              const allowedFams = new Set<string>();
                                              const stack: string[] = [];
                                              
                                              // Check if focusItem is a family ID
                                              const focusFamily = famMap.get(focusItem);
                                              
                                              if (focusFamily) {
                                                  // focusItem is a family - start from this family
                                                  allowedFams.add(focusItem);
                                                  stack.push(focusItem);
                                              } else {
                                                  // focusItem is an individual - find families containing this person
                                                  familyTree.families.forEach((f) => {
                                                      if ((f.parents || []).includes(focusItem) || (f.children || []).includes(focusItem)) {
                                                          allowedFams.add(f.id);
                                                          stack.push(f.id);
                                                      }
                                                  });
                                              }
                                              
                                              // Build person->families indexes for fast lookup
                                              // personAsParent: families where person is a parent
                                              // personAsChild: families where person is a child
                                              const personAsParent = new Map<string, string[]>();
                                              const personAsChild = new Map<string, string[]>();
                                              familyTree.families.forEach((f) => {
                                                  (f.parents || []).forEach((p: string) => {
                                                      if (!personAsParent.has(p)) personAsParent.set(p, []);
                                                      personAsParent.get(p)!.push(f.id);
                                                  });
                                                  (f.children || []).forEach((c: string) => {
                                                      if (!personAsChild.has(c)) personAsChild.set(c, []);
                                                      personAsChild.get(c)!.push(f.id);
                                                  });
                                              });
                                              
                                              // BFS forward to find all reachable families (descendants)
                                              while (stack.length) {
                                                  const fid = stack.pop()!;
                                                  const fam = famMap.get(fid);
                                                  if (!fam) continue;
                                                  (fam.children || []).forEach((childId: string) => {
                                                      // Find families where this child is a parent (their own families)
                                                      const childFams = personAsParent.get(childId) || [];
                                                      childFams.forEach((cfid) => {
                                                          if (!allowedFams.has(cfid)) {
                                                              allowedFams.add(cfid);
                                                              stack.push(cfid);
                                                          }
                                                      });
                                                  });
                                              }                                              // BFS backward to find parent families (ancestors)
                                              const backStack: string[] = [];
                                              
                                              if (focusFamily) {
                                                  // focusItem is a family - start backward from its parents
                                                  (focusFamily.parents || []).forEach((parentId: string) => {
                                                      familyTree.families.forEach((pf) => {
                                                          if ((pf.children || []).includes(parentId)) {
                                                              if (!allowedFams.has(pf.id)) {
                                                                  allowedFams.add(pf.id);
                                                                  backStack.push(pf.id);
                                                              }
                                                          }
                                                      });
                                                  });
                                              } else {
                                                  // focusItem is an individual - start with families where focusItem is a child
                                                  familyTree.families.forEach((f) => {
                                                      if ((f.children || []).includes(focusItem)) {
                                                          if (!allowedFams.has(f.id)) {
                                                              allowedFams.add(f.id);
                                                              backStack.push(f.id);
                                                          }
                                                      }
                                                  });
                                              }
                                              
                                              while (backStack.length) {
                                                  const fid = backStack.pop()!;
                                                  const fam = famMap.get(fid);
                                                  if (!fam) continue;
                                                  // For each parent in this family, find their parent families
                                                  (fam.parents || []).forEach((parentId: string) => {
                                                      familyTree.families.forEach((pf) => {
                                                          if ((pf.children || []).includes(parentId)) {
                                                              if (!allowedFams.has(pf.id)) {
                                                                  allowedFams.add(pf.id);
                                                                  backStack.push(pf.id);
                                                              }
                                                          }
                                                      });
                                                  });
                                              }
                                              
                                              const filteredIndividuals = new Set<string>();
                                              allowedFams.forEach((fid) => {
                                                  const f = famMap.get(fid);
                                                  if (!f) return;
                                                  (f.parents || []).forEach((p: string) => filteredIndividuals.add(p));
                                                  (f.children || []).forEach((c: string) => filteredIndividuals.add(c));
                                              });
                                              filteredIndividuals.add(focusItem);
                                              return familyTree.individuals.filter((ind) => filteredIndividuals.has(ind.id));
                                          })()
                                        : familyTree.individuals
                                }
                                families={
                                    focusItem && maxNumberOfTrees === 1
                                        ? (() => {
                                              const famMap = new Map(familyTree.families.map(f => [f.id, f]));
                                              const allowedFams = new Set<string>();
                                              const stack: string[] = [];
                                              
                                              // Check if focusItem is a family ID
                                              const focusFamily = famMap.get(focusItem);
                                              
                                              if (focusFamily) {
                                                  // focusItem is a family - start from this family
                                                  allowedFams.add(focusItem);
                                                  stack.push(focusItem);
                                              } else {
                                                  // focusItem is an individual - find families containing this person
                                                  familyTree.families.forEach((f) => {
                                                      if ((f.parents || []).includes(focusItem) || (f.children || []).includes(focusItem)) {
                                                          allowedFams.add(f.id);
                                                          stack.push(f.id);
                                                      }
                                                  });
                                              }
                                              
                                              const personToFamilies = new Map<string, string[]>();
                                              familyTree.families.forEach((f) => {
                                                  (f.parents || []).forEach((p: string) => {
                                                      if (!personToFamilies.has(p)) personToFamilies.set(p, []);
                                                      personToFamilies.get(p)!.push(f.id);
                                                  });
                                              });
                                              
                                              // BFS forward to find all reachable families (descendants)
                                              while (stack.length) {
                                                  const fid = stack.pop()!;
                                                  const fam = famMap.get(fid);
                                                  if (!fam) continue;
                                                  (fam.children || []).forEach((childId: string) => {
                                                      const childFams = personToFamilies.get(childId) || [];
                                                      childFams.forEach((cfid) => {
                                                          if (!allowedFams.has(cfid)) {
                                                              allowedFams.add(cfid);
                                                              stack.push(cfid);
                                                          }
                                                      });
                                                  });
                                              }
                                              
                                              // BFS backward to find parent families (ancestors)
                                              const backStack: string[] = [];
                                              
                                              if (focusFamily) {
                                                  // focusItem is a family - start backward from its parents
                                                  (focusFamily.parents || []).forEach((parentId: string) => {
                                                      familyTree.families.forEach((pf) => {
                                                          if ((pf.children || []).includes(parentId)) {
                                                              if (!allowedFams.has(pf.id)) {
                                                                  allowedFams.add(pf.id);
                                                                  backStack.push(pf.id);
                                                              }
                                                          }
                                                      });
                                                  });
                                              } else {
                                                  // focusItem is an individual - start with families where focusItem is a child
                                                  familyTree.families.forEach((f) => {
                                                      if ((f.children || []).includes(focusItem)) {
                                                          if (!allowedFams.has(f.id)) {
                                                              allowedFams.add(f.id);
                                                              backStack.push(f.id);
                                                          }
                                                      }
                                                  });
                                              }
                                              
                                              while (backStack.length) {
                                                  const fid = backStack.pop()!;
                                                  const fam = famMap.get(fid);
                                                  if (!fam) continue;
                                                  (fam.parents || []).forEach((parentId: string) => {
                                                      familyTree.families.forEach((pf) => {
                                                          if ((pf.children || []).includes(parentId)) {
                                                              if (!allowedFams.has(pf.id)) {
                                                                  allowedFams.add(pf.id);
                                                                  backStack.push(pf.id);
                                                              }
                                                          }
                                                      });
                                                  });
                                              }
                                              
                                              return familyTree.families.filter((f) => allowedFams.has(f.id));
                                          })()
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