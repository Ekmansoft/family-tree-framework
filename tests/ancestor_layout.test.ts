import { parseGedcom } from '../src/parser';
import { computeAncestorLayout } from '../src/components/TreeView/layouts/AncestorTreeLayout';

function generateFullAncestorsGedcom(generations: number) {
  // Root person I0, father/mother for each generation creating full binary tree
  // IDs: I<index>, families: F<level>_<index>
  let lines: string[] = [];
  // Create individuals per generation
  const idsPerGen: string[][] = [];
  idsPerGen[0] = ['@I0@'];
  for (let g = 1; g <= generations; g++) {
    const count = Math.pow(2, g);
    idsPerGen[g] = [];
    for (let i = 0; i < count; i++) {
      const id = `@I${g}_${i}@`;
      idsPerGen[g].push(id);
    }
  }
  // Write individuals with minimal NAME and (optional) gender alternating
  const nameFor = (g: number, i: number) => `Person_${g}_${i}`;
  for (let g = 0; g <= generations; g++) {
    for (let i = 0; i < idsPerGen[g].length; i++) {
      const id = idsPerGen[g][i];
      lines.push(`0 ${id} INDI`);
      lines.push(`1 NAME ${nameFor(g, i)} /Test/`);
      // Assign gender for parents at g>=1: even index = father (M), odd = mother (F)
      if (g >= 1) {
        const gender = i % 2 === 0 ? 'M' : 'F';
        lines.push(`1 SEX ${gender}`);
      }
    }
  }
  // Families linking child to parents
  for (let g = 1; g <= generations; g++) {
    const parentIds = idsPerGen[g];
    const childIds = idsPerGen[g - 1];
    // Each child has one family with two parents: indices map: child i in prevGen has parents at (2*i, 2*i+1)
    for (let i = 0; i < childIds.length; i++) {
      const famId = `@F${g}_${i}@`;
      lines.push(`0 ${famId} FAM`);
      lines.push(`1 HUSB ${parentIds[2 * i]}`);
      lines.push(`1 WIFE ${parentIds[2 * i + 1]}`);
      lines.push(`1 CHIL ${childIds[i]}`);
    }
  }
  return lines.join('\n');
}

describe('Ancestor layout - full binary 8 generations', () => {
  test('each generation doubles and parent proximity to child is maintained', () => {
    const ged = generateFullAncestorsGedcom(8);
    const { individuals, families } = parseGedcom(ged);
    const layout = computeAncestorLayout(individuals as any[], families as any[], 'I0', 8, 180, 40);
    const positions = layout.personPositions as Record<string, { x: number; y: number }>;

    // Count per generation by x coordinate (x = g * horizontalGap)
    const counts: Record<number, number> = {};
    Object.values(positions).forEach(p => {
      const g = Math.round(p.x / 180);
      counts[g] = (counts[g] || 0) + 1;
    });
    // Root present
    expect(counts[0]).toBe(1);
    for (let g = 1; g <= 8; g++) {
      expect(counts[g]).toBe(Math.pow(2, g));
    }

    // Parent proximity: father above, mother below and within reasonable offset
    const connections: Array<{ from: string; to: string; genderHint?: 'M' | 'F' | 'U' }> = (layout as any).connections || [];
    expect(connections.length).toBeGreaterThan(0);
    
    // With power-of-2 spacing algorithm, distances grow exponentially
    const verticalGap = 16; // default in AncestorTreeLayout
    const boxHeight = 40;
    const maxHeight = Math.pow(2, 8) * (boxHeight + verticalGap);
    
    for (const c of connections) {
      const fromPos = positions[c.from];
      const toPos = positions[c.to];
      expect(fromPos).toBeTruthy();
      expect(toPos).toBeTruthy();
      const dy = toPos.y - fromPos.y;
      const absDy = Math.abs(dy);
      
      // Determine generation from x-position (each generation is 180px apart horizontally)
      const childGen = Math.round(fromPos.x / 180);
      const parentGen = childGen + 1;
      
      // Calculate expected distance for this generation
      const expectedSpacing = maxHeight / Math.pow(2, parentGen);
      const expectedDistance = expectedSpacing / 2;
      
      if (c.genderHint === 'M') {
        expect(dy).toBeLessThan(0); // father above
        expect(absDy).toBeCloseTo(expectedDistance, 0);
      } else if (c.genderHint === 'F') {
        expect(dy).toBeGreaterThan(0); // mother below
        expect(absDy).toBeCloseTo(expectedDistance, 0);
      }
    }
  });
});
