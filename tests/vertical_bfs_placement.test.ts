import { describe, it, expect } from '@jest/globals';
import { computeAncestorFamilyCenters } from '../src/components/TreeView/utils/familyLayout';

describe('computeAncestorFamilyCenters', () => {
  it('places ancestor families left-to-right anchored on children positions', () => {
    const families = [
      { id: 'F0', parents: ['P1','P2'], children: ['C1','C2'] },
      { id: 'F1', parents: ['G1','G2'], children: ['P1'] },
      { id: 'F2', parents: ['G3','G4'], children: ['P2'] }
    ];

    // children positions: C1 at x=100, C2 at x=200 -> F0 center prefers 150
    const personX: Record<string, number> = { 'C1': 100, 'C2': 200 };

    const centers = computeAncestorFamilyCenters(families as any, personX, 'F0', 2, 80, 20, 40);

    // generation 1 should contain F1 and F2 (parents of P1 and P2) in left-to-right order
    expect(centers[0].length).toBeGreaterThanOrEqual(2);
    // ensure center X for F1 < F2
    const f1 = centers[0].find(c => c.familyId === 'F1')!;
    const f2 = centers[0].find(c => c.familyId === 'F2')!;
    expect(f1.centerX).toBeLessThan(f2.centerX);
  });
});
