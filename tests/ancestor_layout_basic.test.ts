import { computeAncestorLayout } from '../src/components/TreeView/layouts/AncestorTreeLayout';

/**
 * Validate basic ancestor layout symmetry and positions
 */

describe('AncestorTreeLayout basic symmetry', () => {
  const individuals = [
    { id: 'C', name: 'Child', gender: 'U', families: [] },
    { id: 'F', name: 'Father', gender: 'M', families: [] },
    { id: 'M', name: 'Mother', gender: 'F', families: [] },
  ];
  const families = [
    { id: 'Fam1', parents: ['F', 'M'], children: ['C'] }
  ];

  it('places parents symmetrically around child on Y axis', () => {
    const result = computeAncestorLayout(individuals as any, families as any, 'C', 3, 180, 40, 32);
    const pos = result.personPositions;
    expect(pos['C']).toBeTruthy();
    expect(pos['F']).toBeTruthy();
    expect(pos['M']).toBeTruthy();

    const child = pos['C'];
    const father = pos['F'];
    const mother = pos['M'];

    // Symmetry: child.y should be midpoint between father.y and mother.y
    const midpoint = (father.y + mother.y) / 2;
    expect(Math.abs(child.y - midpoint)).toBeLessThan(1e-6);

    // Parents should be to the right of child
    expect(father.x).toBeGreaterThan(child.x);
    expect(mother.x).toBeGreaterThan(child.x);

    // Father above mother on Y (smaller y after shift still indicates higher position visually)
    expect(father.y).toBeLessThan(mother.y);
  });
});
