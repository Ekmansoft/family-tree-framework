import { readFileSync } from 'fs';
import { parseGedcom } from '../src/parser/gedcom/parser';
import { VerticalTreeLayout } from '../src/components/TreeView/layouts/VerticalTreeLayout';
import { buildRelationshipMaps } from '../src/components/TreeView/utils/treeFiltering';
import { assignGenerations } from '../src/components/TreeView/utils/generationAssignment';

/**
 * This test loads the full 8-generation ancestor GEDCOM fixture and verifies
 * that in the vertical layout with a focus on the root person (I0), all
 * ancestor generations appear above (smaller y) the focus generation and are
 * strictly ordered: grandparents above parents, etc.
 */

describe('VerticalTreeLayout ordering with ancestor-8gen.ged', () => {
  test('ancestors appear above focus person with monotonic y ordering', () => {
    const ged = readFileSync('examples/demo/ancestor-8gen.ged', 'utf8');
    const { individuals, families } = parseGedcom(ged);

    // Focus on root individual I0 ("Person G0-0 /Ancestor/")
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

    // Limit to a few generations backward for the test (e.g., 3) to keep assertions manageable
    const layout = new VerticalTreeLayout();
    const result = layout.computeLayout(
      individuals as any[],
      families as any[],
      levelOf,
      {
        siblingGap: 20,
        parentGap: 20,
        familyPadding: 24,
        maxGenerationsForward: 0, // only ancestors
        maxGenerationsBackward: 4, // root + 4 ancestor generations
        selectedId: focusId
      }
    );

    const positions = result.personPositions as Record<string, { x: number; y: number }>;
    expect(positions[focusId]).toBeDefined();
    const rootY = positions[focusId].y;

    // Collect first 4 generations (root level 0, then -1, -2, -3, -4)
    const genToYs: Map<number, number[]> = new Map();
    individuals.forEach(ind => {
      const lvl = levelOf.get(ind.id);
      if (typeof lvl !== 'number') return;
      if (lvl < -4 || lvl > 0) return; // restrict range
      const pos = positions[ind.id];
      if (!pos) return;
      if (!genToYs.has(lvl)) genToYs.set(lvl, []);
      genToYs.get(lvl)!.push(pos.y);
    });

    // Ensure expected generations exist
    [0, -1, -2, -3, -4].forEach(g => expect(genToYs.has(g)).toBe(true));

    // Verify ordering: more negative generation => smaller y (above root)
    for (let g = -1; g >= -4; g--) {
      const ys = genToYs.get(g)!;
      ys.forEach(y => {
        expect(y).toBeLessThan(rootY);
      });
    }

    // Monotonic separation: maxY of generation g must be < minY of generation g+1 (moving downward toward root)
    // Since ancestors are above, generation -4 should have smallest y values.
    const bounds: { gen: number; minY: number; maxY: number }[] = [];
    genToYs.forEach((ys, gen) => {
      bounds.push({ gen, minY: Math.min(...ys), maxY: Math.max(...ys) });
    });
    bounds.sort((a, b) => a.gen - b.gen); // -4, -3, -2, -1, 0

    for (let i = 0; i < bounds.length - 1; i++) {
      const curr = bounds[i];
      const next = bounds[i + 1];
      // curr.gen < next.gen numerically (e.g., -4 < -3) but curr should be visually higher => smaller y
      expect(curr.maxY).toBeLessThan(next.minY + 5); // small tolerance
    }
  });
});
