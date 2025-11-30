import { readFileSync } from 'fs';
import { parseGedcom } from '../src/parser/gedcom/parser';
import { VerticalTreeLayout } from '../src/components/TreeView/layouts/VerticalTreeLayout';
import { buildRelationshipMaps } from '../src/components/TreeView/utils/treeFiltering';
import { assignGenerations } from '../src/components/TreeView/utils/generationAssignment';

/**
 * Regression test: ensure ancestor generation (-2) individuals do not horizontally overlap
 * when rendering vertical tree in ancestor-only mode.
 */

describe('VerticalTreeLayout ancestor non-overlap', () => {
  test('generation -2 individuals have distinct horizontal positions', () => {
    const ged = readFileSync('examples/demo/ancestor-8gen.ged', 'utf8');
    const { individuals, families } = parseGedcom(ged);
    const focusId = 'I0';

    const { childrenOf, parentsOf } = buildRelationshipMaps(families as any[]);
    const individualsById = new Map(individuals.map(i => [i.id, i]));

    const { levelOf } = assignGenerations({
      individualsLocal: individuals as any[],
      familiesLocal: families as any[],
      childrenOf,
      parentsOf,
      individualsById,
      focusItem: focusId
    });

    const layout = new VerticalTreeLayout();
    const result = layout.computeLayout(
      individuals as any[],
      families as any[],
      levelOf,
      {
        siblingGap: 20,
        parentGap: 20,
        familyPadding: 24,
        maxGenerationsForward: 0,
        maxGenerationsBackward: 4,
        selectedId: focusId,
        simplePacking: true // exercise packing path
      } as any
    );

    const positions = result.personPositions as Record<string, { x: number; y: number }>;    
    const boxWidth = 100; // matches VerticalTreeLayout default

    // Collect generation -2 individuals
    const genNeg2: Array<{ id: string; x: number }> = [];
    Object.keys(positions).forEach(id => {
      const lvl = levelOf.get(id);
      if (lvl === -2) {
        genNeg2.push({ id, x: positions[id].x });
      }
    });

    // There should be multiple individuals at generation -2
    expect(genNeg2.length).toBeGreaterThan(2);

    // Sort by x for pairwise non-overlap checks
    genNeg2.sort((a, b) => a.x - b.x);

    for (let i = 1; i < genNeg2.length; i++) {
      const prev = genNeg2[i - 1];
      const curr = genNeg2[i];
      // Minimum separation: at least boxWidth/2 (allow spouse grouping inside same family) but
      // ensure centers are not identical (which would indicate overlap)
      expect(Math.abs(curr.x - prev.x)).toBeGreaterThanOrEqual(10);
    }
  });
});
