import { parseGedcom } from '../src/parser';
import { VerticalTreeLayout } from '../src/components/TreeView/layouts/VerticalTreeLayout';
import { buildRelationshipMaps } from '../src/components/TreeView/utils/treeFiltering';
import { assignGenerations } from '../src/components/TreeView/utils/generationAssignment';

/**
 * GEDCOM focused on descendants to verify horizontal non-overlap.
 * Structure:
 * Root (I0)
 *  ├─ ChildA (I1) marries SpouseA (I3) -> children I5, I6
 *  └─ ChildB (I2) marries SpouseB (I4) -> children I7, I8
 */
function generateDescendantGedcom() {
  const lines: string[] = [];

  // Root
  lines.push('0 @I0@ INDI');
  lines.push('1 NAME Root /Person/');

  // Children + spouses
  lines.push('0 @I1@ INDI');
  lines.push('1 NAME ChildA /Person/');
  lines.push('0 @I2@ INDI');
  lines.push('1 NAME ChildB /Person/');
  lines.push('0 @I3@ INDI');
  lines.push('1 NAME SpouseA /Person/');
  lines.push('0 @I4@ INDI');
  lines.push('1 NAME SpouseB /Person/');

  // Grandchildren (two families)
  lines.push('0 @I5@ INDI');
  lines.push('1 NAME GrandchildA1 /Person/');
  lines.push('0 @I6@ INDI');
  lines.push('1 NAME GrandchildA2 /Person/');
  lines.push('0 @I7@ INDI');
  lines.push('1 NAME GrandchildB1 /Person/');
  lines.push('0 @I8@ INDI');
  lines.push('1 NAME GrandchildB2 /Person/');

  // Families
  // F0: Root's family with two children (no spouse recorded for simplicity)
  lines.push('0 @F0@ FAM');
  lines.push('1 HUSB @I0@');
  lines.push('1 CHIL @I1@');
  lines.push('1 CHIL @I2@');

  // F1: ChildA + SpouseA with two children
  lines.push('0 @F1@ FAM');
  lines.push('1 HUSB @I1@');
  lines.push('1 WIFE @I3@');
  lines.push('1 CHIL @I5@');
  lines.push('1 CHIL @I6@');

  // F2: ChildB + SpouseB with two children
  lines.push('0 @F2@ FAM');
  lines.push('1 HUSB @I2@');
  lines.push('1 WIFE @I4@');
  lines.push('1 CHIL @I7@');
  lines.push('1 CHIL @I8@');

  return lines.join('\n');
}

describe('Vertical tree layout - descendant horizontal spacing', () => {
  test('descendant spouse clusters do not horizontally overlap', () => {
    const ged = generateDescendantGedcom();
    const { individuals, families } = parseGedcom(ged);

    const { childrenOf, parentsOf } = buildRelationshipMaps(families as any[]);
    const individualsById = new Map(individuals.map(i => [i.id, i]));

    const { levelOf } = assignGenerations({
      individualsLocal: individuals as any[],
      familiesLocal: families as any[],
      childrenOf,
      parentsOf,
      individualsById,
      focusItem: 'I0'
    });

    const layout = new VerticalTreeLayout();
    const result = layout.computeLayout(
      individuals as any[],
      families as any[],
      levelOf,
      {
        siblingGap: 20,
        parentGap: 20,
        familyPadding: 40,
        maxGenerationsForward: 4,
        maxGenerationsBackward: 1
      }
    );

    const positions = result.personPositions as Record<string, { x: number; y: number }>;    

    // Identify spouse clusters at generation 1 (parents of grandchild families)
    const spouseFamilies = ['F1', 'F2'];
    const clusters: Array<{ fam: string; minX: number; maxX: number }> = [];

    spouseFamilies.forEach(fid => {
      const fam = (families as any[]).find(f => f.id === fid);
      if (!fam) return;
      const parentIds = fam.parents || [];
      const parentPositions = parentIds.map((pid: string) => positions[pid]).filter(Boolean);
      if (!parentPositions.length) return;
      const centers = parentPositions.map((p: { x: number; y: number }) => p.x);
      const minCenter = Math.min(...centers);
      const maxCenter = Math.max(...centers);
      // Person width assumed 100; expand bounds
      clusters.push({ fam: fid, minX: minCenter - 50, maxX: maxCenter + 50 });
    });

    expect(clusters.length).toBe(2);

    // Sort by minX for deterministic comparison
    clusters.sort((a, b) => a.minX - b.minX);

    // Assert non-overlap: next.minX should be >= prev.maxX
    for (let i = 1; i < clusters.length; i++) {
      expect(clusters[i].minX).toBeGreaterThanOrEqual(clusters[i - 1].maxX);
    }
  });

  test('grandchildren clusters remain separate with no horizontal overlap', () => {
    const ged = generateDescendantGedcom();
    const { individuals, families } = parseGedcom(ged);

    const { childrenOf, parentsOf } = buildRelationshipMaps(families as any[]);
    const individualsById = new Map(individuals.map(i => [i.id, i]));

    const { levelOf } = assignGenerations({
      individualsLocal: individuals as any[],
      familiesLocal: families as any[],
      childrenOf,
      parentsOf,
      individualsById,
      focusItem: 'I0'
    });

    const layout = new VerticalTreeLayout();
    const result = layout.computeLayout(
      individuals as any[],
      families as any[],
      levelOf,
      {
        siblingGap: 20,
        parentGap: 20,
        familyPadding: 40,
        maxGenerationsForward: 4,
        maxGenerationsBackward: 1
      }
    );

    const positions = result.personPositions as Record<string, { x: number; y: number }>;    

    // Gather grandchildren by family
    const grandFamilies = ['F1', 'F2'];
    const childClusters: Array<{ fam: string; minX: number; maxX: number }> = [];
    grandFamilies.forEach(fid => {
      const fam = (families as any[]).find(f => f.id === fid);
      if (!fam) return;
      const childIds = fam.children || [];
      const childPositions = childIds.map((cid: string) => positions[cid]).filter(Boolean);
      if (!childPositions.length) return;
      const centers = childPositions.map((p: { x: number; y: number }) => p.x);
      const minCenter = Math.min(...centers);
      const maxCenter = Math.max(...centers);
      childClusters.push({ fam: fid, minX: minCenter - 50, maxX: maxCenter + 50 });
    });

    expect(childClusters.length).toBe(2);
    childClusters.sort((a, b) => a.minX - b.minX);

    for (let i = 1; i < childClusters.length; i++) {
      expect(childClusters[i].minX).toBeGreaterThanOrEqual(childClusters[i - 1].maxX);
    }
  });
});
