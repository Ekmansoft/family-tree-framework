import { parseGedcom } from '../src/parser';
import { VerticalTreeLayout } from '../src/components/TreeView/layouts/VerticalTreeLayout';
import { buildRelationshipMaps } from '../src/components/TreeView/utils/treeFiltering';
import { assignGenerations } from '../src/components/TreeView/utils/generationAssignment';

/**
 * Generate multi-generation GEDCOM with clear parent-child relationships
 * for testing vertical tree layout generation ordering
 */
function generateMultiGenGedcom() {
  const lines: string[] = [];
  
  // Generation 0 (root/focus)
  lines.push('0 @I0@ INDI');
  lines.push('1 NAME Root /Person/');
  
  // Generation -1 (parents of root)
  lines.push('0 @I1@ INDI');
  lines.push('1 NAME Father /Person/');
  lines.push('0 @I2@ INDI');
  lines.push('1 NAME Mother /Person/');
  
  // Generation -2 (grandparents)
  lines.push('0 @I3@ INDI');
  lines.push('1 NAME PatGrandfather /Person/');
  lines.push('0 @I4@ INDI');
  lines.push('1 NAME PatGrandmother /Person/');
  lines.push('0 @I5@ INDI');
  lines.push('1 NAME MatGrandfather /Person/');
  lines.push('0 @I6@ INDI');
  lines.push('1 NAME MatGrandmother /Person/');
  
  // Generation +1 (children of root)
  lines.push('0 @I7@ INDI');
  lines.push('1 NAME Child1 /Person/');
  lines.push('0 @I8@ INDI');
  lines.push('1 NAME Child2 /Person/');
  
  // Generation +2 (grandchildren)
  lines.push('0 @I9@ INDI');
  lines.push('1 NAME Grandchild1 /Person/');
  lines.push('0 @I10@ INDI');
  lines.push('1 NAME Grandchild2 /Person/');
  
  // Families
  // F0: Root's family (children I7, I8)
  lines.push('0 @F0@ FAM');
  lines.push('1 HUSB @I0@');
  lines.push('1 CHIL @I7@');
  lines.push('1 CHIL @I8@');
  
  // F1: Root's parent family (parents I1, I2; child I0)
  lines.push('0 @F1@ FAM');
  lines.push('1 HUSB @I1@');
  lines.push('1 WIFE @I2@');
  lines.push('1 CHIL @I0@');
  
  // F2: Father's parent family (parents I3, I4; child I1)
  lines.push('0 @F2@ FAM');
  lines.push('1 HUSB @I3@');
  lines.push('1 WIFE @I4@');
  lines.push('1 CHIL @I1@');
  
  // F3: Mother's parent family (parents I5, I6; child I2)
  lines.push('0 @F3@ FAM');
  lines.push('1 HUSB @I5@');
  lines.push('1 WIFE @I6@');
  lines.push('1 CHIL @I2@');
  
  // F4: Child1's family (parent I7; children I9, I10)
  lines.push('0 @F4@ FAM');
  lines.push('1 HUSB @I7@');
  lines.push('1 CHIL @I9@');
  lines.push('1 CHIL @I10@');
  
  return lines.join('\n');
}

describe('Vertical tree layout - generation ordering', () => {
  test('generations maintain monotonic vertical ordering from ancestors to descendants', () => {
    const ged = generateMultiGenGedcom();
    const { individuals, families } = parseGedcom(ged);
    
    // Build relationship maps
    const { childrenOf, parentsOf } = buildRelationshipMaps(families as any[]);
    const individualsById = new Map(individuals.map(i => [i.id, i]));
    
    // Assign generations with root person as focus
    const { levelOf } = assignGenerations({
      individualsLocal: individuals as any[],
      familiesLocal: families as any[],
      childrenOf,
      parentsOf,
      individualsById,
      focusItem: 'I0'
    });
    
    // Compute layout using VerticalTreeLayout
    const layout = new VerticalTreeLayout();
    const result = layout.computeLayout(
      individuals as any[],
      families as any[],
      levelOf,
      {
        siblingGap: 20,
        parentGap: 20,
        familyPadding: 40,
        maxGenerationsForward: 3,
        maxGenerationsBackward: 3
      }
    );
    
    const positions = result.personPositions as Record<string, { x: number; y: number }>;
    
    // Group individuals by generation
    const generationGroups: Map<number, Array<{ id: string; y: number }>> = new Map();
    
    individuals.forEach((ind: any) => {
      const level = levelOf.get(ind.id);
      if (level === undefined) return;
      
      const pos = positions[ind.id];
      if (!pos) return;
      
      if (!generationGroups.has(level)) {
        generationGroups.set(level, []);
      }
      generationGroups.get(level)!.push({ id: ind.id, y: pos.y });
    });
    
    // Extract generation bounds (min and max y for each generation)
    const generationBounds: Array<{ gen: number; minY: number; maxY: number; avgY: number }> = [];
    
    generationGroups.forEach((people, gen) => {
      const yValues = people.map(p => p.y);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      const avgY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
      
      generationBounds.push({ gen, minY, maxY, avgY });
    });
    
    // Sort by generation number
    generationBounds.sort((a, b) => a.gen - b.gen);
    
    // Verify monotonic ordering: each generation should have higher average y than previous
    // (In vertical layout, higher generation number = further down = higher y coordinate)
    for (let i = 1; i < generationBounds.length; i++) {
      const prevGen = generationBounds[i - 1];
      const currGen = generationBounds[i];
      
      // Average y should increase with generation
      expect(currGen.avgY).toBeGreaterThan(prevGen.avgY);
      
      // Min y of current generation should be >= max y of previous generation
      // (allowing for some overlap tolerance in layout)
      expect(currGen.minY).toBeGreaterThanOrEqual(prevGen.maxY - 10);
    }
  });
  
  test('vertical tree positions all family members at correct generation levels', () => {
    const ged = generateMultiGenGedcom();
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
        maxGenerationsForward: 3,
        maxGenerationsBackward: 3
      }
    );
    
    const positions = result.personPositions as Record<string, { x: number; y: number }>;
    
    // Verify specific generation assignments
    expect(levelOf.get('I0')).toBe(0); // Root
    expect(levelOf.get('I1')).toBe(-1); // Father
    expect(levelOf.get('I2')).toBe(-1); // Mother
    expect(levelOf.get('I3')).toBe(-2); // Paternal grandfather
    expect(levelOf.get('I4')).toBe(-2); // Paternal grandmother
    expect(levelOf.get('I5')).toBe(-2); // Maternal grandfather
    expect(levelOf.get('I6')).toBe(-2); // Maternal grandmother
    expect(levelOf.get('I7')).toBe(1); // Child1
    expect(levelOf.get('I8')).toBe(1); // Child2
    expect(levelOf.get('I9')).toBe(2); // Grandchild1
    expect(levelOf.get('I10')).toBe(2); // Grandchild2
    
    // Verify y-positions respect generation ordering
    // Ancestors (negative generations) should be above root
    expect(positions['I1'].y).toBeLessThan(positions['I0'].y);
    expect(positions['I2'].y).toBeLessThan(positions['I0'].y);
    expect(positions['I3'].y).toBeLessThan(positions['I1'].y);
    expect(positions['I4'].y).toBeLessThan(positions['I1'].y);
    expect(positions['I5'].y).toBeLessThan(positions['I2'].y);
    expect(positions['I6'].y).toBeLessThan(positions['I2'].y);
    
    // Descendants (positive generations) should be below root
    expect(positions['I7'].y).toBeGreaterThan(positions['I0'].y);
    expect(positions['I8'].y).toBeGreaterThan(positions['I0'].y);
    expect(positions['I9'].y).toBeGreaterThan(positions['I7'].y);
    expect(positions['I10'].y).toBeGreaterThan(positions['I7'].y);
  });
  
  test('spouses at same generation have similar y-positions', () => {
    const ged = generateMultiGenGedcom();
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
        maxGenerationsForward: 3,
        maxGenerationsBackward: 3
      }
    );
    
    const positions = result.personPositions as Record<string, { x: number; y: number }>;
    
    // Father and Mother (I1, I2) are spouses - should be at same level
    expect(levelOf.get('I1')).toBe(levelOf.get('I2'));
    expect(Math.abs(positions['I1'].y - positions['I2'].y)).toBeLessThan(5);
    
    // Paternal grandparents (I3, I4) should be at same level
    expect(levelOf.get('I3')).toBe(levelOf.get('I4'));
    expect(Math.abs(positions['I3'].y - positions['I4'].y)).toBeLessThan(5);
    
    // Maternal grandparents (I5, I6) should be at same level
    expect(levelOf.get('I5')).toBe(levelOf.get('I6'));
    expect(Math.abs(positions['I5'].y - positions['I6'].y)).toBeLessThan(5);
  });
});
