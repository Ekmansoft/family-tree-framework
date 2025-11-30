import { describe, it, expect } from '@jest/globals';
import { collectAncestorGenerations } from '../src/components/TreeView/utils/familyLayout';

describe('collectAncestorGenerations', () => {
  it('collects ancestor family ids generation-by-generation', () => {
    // Simple chain: F1 children I0; F2 parents are I1,I2 where I1 child of F3, I2 child of F4
    const families = [
      { id: 'F1', parents: ['I1', 'I2'], children: ['I0'] },
      { id: 'F2', parents: ['I3', 'I4'], children: ['I1'] },
      { id: 'F3', parents: ['I5', 'I6'], children: ['I2'] },
      { id: 'F4', parents: [], children: ['I3'] },
      { id: 'F5', parents: [], children: ['I4'] }
    ];

    // start from F1, max 3 generations back
    const groups = collectAncestorGenerations(families as any, 'F1', 3);

    // generation 1: families for I1 and I2 -> families that have I1 or I2 as child: F2 and F3
    expect(groups[0]).toBeDefined();
    expect(groups[0].length).toBeGreaterThanOrEqual(1);
    expect(groups[0]).toEqual(expect.arrayContaining(['F2','F3']));

    // generation 2: parents of F2 and F3 -> families for their parents
    // F2's children I1 -> its parents are I3,I4, families for I3 is F4, for I4 is F5
    expect(groups[1]).toBeDefined();
    expect(groups[1]).toEqual(expect.arrayContaining(['F4','F5']));
  });
});
