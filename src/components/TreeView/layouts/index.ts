import { AncestorTreeView } from '../AncestorTreeView';
import TreeView from '../TreeView';

export interface LayoutMeta {
  id: string;
  name: string;
  description: string;
  // Which React component to render for this layout
  component: any; // kept generic to avoid typing friction
  // Config schema: key -> { label, type, min?, max? }
  config?: Record<string, { label: string; type: 'number'; min?: number; max?: number }>;
  defaultConfig?: Record<string, any>;
}

export const availableLayouts: LayoutMeta[] = [
  {
    id: 'vertical',
    name: 'Vertical Tree',
    description: 'Top-to-bottom generations with lateral sibling grouping.',
    component: TreeView,
    config: {
      maxGenerationsBackward: { label: 'Ancestors (back)', type: 'number', min: 0, max: 15 },
      maxGenerationsForward: { label: 'Descendants (forward)', type: 'number', min: 0, max: 15 }
    },
    defaultConfig: { maxGenerationsBackward: 2, maxGenerationsForward: 2, siblingGap: 40, parentGap: 20, familyPadding: 12, simplePacking: true }
  },
  {
    id: 'ancestor',
    name: 'Ancestor Tree',
    description: 'Left-to-right ancestors with symmetric parent placement.',
    component: AncestorTreeView,
    config: {
      maxAncestors: { label: 'Max Generations', type: 'number', min: 1, max: 15 },
      horizontalGap: { label: 'Horizontal Gap', type: 'number', min: 60, max: 400 },
      boxHeight: { label: 'Box Height', type: 'number', min: 30, max: 120 },
      boxWidth: { label: 'Box Width', type: 'number', min: 80, max: 260 }
    },
    defaultConfig: { maxAncestors: 5, horizontalGap: 180, boxHeight: 40, boxWidth: 140, parentOffset: 32, verticalGap: 16 }
  }
];

export function getLayoutById(id: string): LayoutMeta | undefined {
  return availableLayouts.find(l => l.id === id);
}