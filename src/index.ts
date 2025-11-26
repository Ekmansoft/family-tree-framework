import Engine from './core/engine';
import { Renderer } from './core/renderer';
import EventManager from './core/events';
import { parseGedcom } from './parser';
import './styles/index.css';

const init = () => {
    const engine = new Engine();
    const renderer = new Renderer();
    const eventManager = new EventManager();

    // Load a GEDCOM file (this could be replaced with actual file loading logic)
    const gedcomData = ''; // Placeholder for GEDCOM data
    const familyTree = parseGedcom(gedcomData);

    engine.loadGedcom(gedcomData);
    (renderer as any).render();

    // Set up event listeners
    eventManager.on('update', () => {
        (renderer as any).render();
    });
};

document.addEventListener('DOMContentLoaded', init);

export { TreeView } from './components/TreeView/TreeView';
export { parseGedcom } from './parser';
export { discoverTreeComponents } from './components/TreeView/utils/treeFiltering';
export type { TreeComponent } from './components/TreeView/utils/treeFiltering';
export { PersonBox } from './components/TreeView/PersonBox';
export { FamilyBox } from './components/TreeView/FamilyBox';
export { ErrorBoundary } from './components/ErrorBoundary';
export { PersonEditor, RelationshipEditor } from './components/LazyEditors';
export { debounce, memoize } from './utils/helpers';
export { exportTreeAsPNG, exportTreeAsSVG, exportAndDownloadTree, downloadBlob } from './utils/treeExport';
export type { ExportOptions } from './utils/treeExport';
export { validateTreeViewProps } from './components/TreeView/utils/propValidation';
export { getVisibleItems, getViewportFromContainer } from './components/TreeView/utils/virtualRendering';
export type { ViewportInfo } from './components/TreeView/utils/virtualRendering';