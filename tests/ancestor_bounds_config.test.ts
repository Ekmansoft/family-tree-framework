import { computeAncestorLayout } from '../src/components/TreeView/layouts/AncestorTreeLayout';

describe('AncestorTreeLayout bounds respond to config', () => {
  const individuals = [
    { id: 'C', name: 'Child', gender: 'U', families: [] },
    { id: 'F', name: 'Father', gender: 'M', families: [] },
    { id: 'M', name: 'Mother', gender: 'F', families: [] },
    { id: 'GF', name: 'Grandfather', gender: 'M', families: [] },
    { id: 'GM', name: 'Grandmother', gender: 'F', families: [] },
  ];
  const families = [
    { id: 'Fam1', parents: ['F', 'M'], children: ['C'] },
    { id: 'Fam2', parents: ['GF', 'GM'], children: ['F'] },
  ];

  it('height increases with maxAncestors', () => {
    const r3 = computeAncestorLayout(individuals as any, families as any, 'C', 2, 180, 40, 32);
    const r5 = computeAncestorLayout(individuals as any, families as any, 'C', 4, 180, 40, 32);
    expect(r5.bounds.height).toBeGreaterThanOrEqual(r3.bounds.height);
  });

  it('width increases with horizontalGap', () => {
    const rSmall = computeAncestorLayout(individuals as any, families as any, 'C', 3, 120, 40, 32);
    const rLarge = computeAncestorLayout(individuals as any, families as any, 'C', 3, 260, 40, 32);
    expect(rLarge.bounds.width).toBeGreaterThanOrEqual(rSmall.bounds.width);
  });
});
