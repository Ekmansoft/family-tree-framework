import { readFileSync } from 'fs';
import { parseGedcom } from '../src/parser/gedcom/parser';
import { VerticalTreeLayout } from '../src/components/TreeView/layouts/VerticalTreeLayout';
import { buildRelationshipMaps } from '../src/components/TreeView/utils/treeFiltering';
import { assignGenerations } from '../src/components/TreeView/utils/generationAssignment';

/**
 * Verifies that in ancestor-only vertical layout each negative generation is horizontally centered
 * relative to the root focus person's X coordinate.
 */

describe('VerticalTreeLayout ancestor generation centering', () => {
  test('generations -1 and -2 are centered around root', () => {
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
        simplePacking: true
      } as any
    );

    const positions = result.personPositions as Record<string, { x: number; y: number }>;
    expect(positions[focusId]).toBeDefined();
    const rootX = positions[focusId].x;

    function checkCentered(level: number, tolerance: number = 5) {
      const ids = Object.keys(positions).filter(pid => levelOf.get(pid) === level);
      expect(ids.length).toBeGreaterThan(0);
      const xs = ids.map(pid => positions[pid].x);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const center = (minX + maxX) / 2;
      expect(Math.abs(center - rootX)).toBeLessThanOrEqual(tolerance);
    }

    checkCentered(-1);
    checkCentered(-2);
  });
});
