/**
 * Generate a full 8-generation descendant tree GEDCOM
 * Root couple (gen 0) has 2 children, each child marries and has 2 children, etc.
 * Total: 2^0 + 2^1 + 2^2 + ... + 2^8 = 511 couples, 1022 individuals
 */

function generateDescendants8Gen() {
  const lines = ['0 HEAD', '1 SOUR Family Tree Framework', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8'];
  
  const baseYear = 1700;
  const generationSpan = 25;
  
  // Generate all individuals first
  // Gen 0: 1 couple (I0, I0_S)
  // Gen 1: 2 couples (2 children from gen 0)
  // Gen 2: 4 couples (2 children from each of 2 gen 1 couples)
  // etc.
  
  const individuals = [];
  const families = [];
  
  // Generate root couple
  individuals.push({
    id: 'I0',
    name: 'Root',
    surname: 'Ancestor',
    sex: 'M',
    birthYear: baseYear,
    gen: 0,
    childIndex: 0
  });
  
  individuals.push({
    id: 'I0_S',
    name: 'RootSpouse',
    surname: 'Ancestor',
    sex: 'F',
    birthYear: baseYear + 2,
    gen: 0,
    childIndex: 0,
    isSpouse: true
  });
  
  // Root family
  families.push({
    id: 'F0',
    husbandId: 'I0',
    wifeId: 'I0_S',
    childrenIds: ['I1_0', 'I1_1'],
    marriageYear: baseYear + 24
  });
  
  // Generate children for each generation
  for (let gen = 1; gen <= 8; gen++) {
    const numCouples = Math.pow(2, gen - 1);
    const birthYear = baseYear + gen * generationSpan;
    
    for (let coupleIdx = 0; coupleIdx < numCouples; coupleIdx++) {
      // Generate 2 children for this couple
      for (let childIdx = 0; childIdx < 2; childIdx++) {
        const personIndex = coupleIdx * 2 + childIdx;
        const personId = `I${gen}_${personIndex}`;
        const spouseId = `I${gen}_${personIndex}_S`;
        
        const sex = childIdx === 0 ? 'M' : 'F';
        const spouseSex = sex === 'M' ? 'F' : 'M';
        
        individuals.push({
          id: personId,
          name: `Child${personIndex + 1}`,
          surname: 'Person',
          sex: sex,
          birthYear: birthYear + childIdx,
          gen: gen,
          childIndex: personIndex
        });
        
        individuals.push({
          id: spouseId,
          name: `Child${personIndex + 1}Spouse`,
          surname: 'Person',
          sex: spouseSex,
          birthYear: birthYear + childIdx + (sex === 'M' ? 2 : -2),
          gen: gen,
          childIndex: personIndex,
          isSpouse: true
        });
        
        // Create family for this couple (if not gen 8, they have children)
        if (gen < 8) {
          const nextGenChildBase = personIndex * 2;
          families.push({
            id: `F${gen}_${personIndex}`,
            husbandId: sex === 'M' ? personId : spouseId,
            wifeId: sex === 'M' ? spouseId : personId,
            childrenIds: [
              `I${gen + 1}_${nextGenChildBase}`,
              `I${gen + 1}_${nextGenChildBase + 1}`
            ],
            marriageYear: birthYear + 24
          });
        }
      }
    }
  }
  
  // Write individuals to GEDCOM
  individuals.forEach(ind => {
    lines.push(`0 @${ind.id}@ INDI`);
    lines.push(`1 NAME ${ind.name} /${ind.surname}/`);
    lines.push(`1 SEX ${ind.sex}`);
    lines.push(`1 BIRT`);
    lines.push(`2 DATE 1 JAN ${ind.birthYear}`);
  });
  
  // Write families to GEDCOM
  families.forEach(fam => {
    lines.push(`0 @${fam.id}@ FAM`);
    lines.push(`1 HUSB @${fam.husbandId}@`);
    lines.push(`1 WIFE @${fam.wifeId}@`);
    fam.childrenIds.forEach(childId => {
      lines.push(`1 CHIL @${childId}@`);
    });
    lines.push(`1 MARR`);
    lines.push(`2 DATE 1 JAN ${fam.marriageYear}`);
  });
  
  lines.push('0 TRLR');
  return lines.join('\n');
}

const fs = require('fs');
const content = generateDescendants8Gen();
fs.writeFileSync('./examples/demo/descendants-8gen.ged', content, 'utf8');
console.log('Generated descendants-8gen.ged with 8 generations');
