// Main library exports
import './styles/index.css';

// ============================================================================
// Core Components
// ============================================================================
export { TreeView } from './components/TreeView/TreeView';
export { PersonBox } from './components/TreeView/PersonBox';
export { FamilyBox } from './components/TreeView/FamilyBox';
export { ErrorBoundary } from './components/ErrorBoundary';

// ============================================================================
// Editor Components
// ============================================================================
export { PersonEditor, RelationshipEditor } from './components/LazyEditors';

// ============================================================================
// Parser & Types
// ============================================================================
export { parseGedcom } from './parser';

// ============================================================================
// Tree Utilities
// ============================================================================
export { discoverTreeComponents } from './components/TreeView/utils/treeFiltering';
export type { TreeComponent } from './components/TreeView/utils/treeFiltering';
export { validateTreeViewProps } from './components/TreeView/utils/propValidation';
export { getVisibleItems, getViewportFromContainer } from './components/TreeView/utils/virtualRendering';
export type { ViewportInfo } from './components/TreeView/utils/virtualRendering';

// ============================================================================
// Export Utilities
// ============================================================================
export { exportTreeAsPNG, exportTreeAsSVG, exportAndDownloadTree, downloadBlob } from './utils/treeExport';
export type { ExportOptions } from './utils/treeExport';

// ============================================================================
// General Utilities
// ============================================================================
export { debounce, memoize } from './utils/helpers';