// Generates a GEDCOM file with a root individual and 8 generations of ancestors.
// Output written to examples/demo/ancestor-8gen.ged
// Usage: node scripts/build-ancestor-8gen.js

const fs = require('fs');
const path = require('path');

const generations = 8; // number of ancestor generations (excluding root)
let individualCounter = 0;
let familyCounter = 1;

// Data structures
const individuals = []; // { idNum, gen, indexInGen, name, sex, birthYear, famc, fams }
const families = []; // { idNum, husbandIdNum, wifeIdNum, childIdNum }

// Helper to create individual
function createIndividual(gen, indexInGen, sex, birthYear) {
  const idNum = individualCounter++;
  const name = `Person G${gen}-${indexInGen} /Ancestor/`;
  individuals.push({ idNum, gen, indexInGen, name, sex, birthYear, famc: null, fams: null });
  return idNum;
}

// Root person (generation 0)
const rootBirthYear = 2000;
const rootId = createIndividual(0, 0, 'M', rootBirthYear); // root sex arbitrary (M)
let previousGen = [rootId];

for (let g = 1; g <= generations; g++) {
  const birthYear = rootBirthYear - g * 30; // simplistic spacing of birth years
  const currentGen = [];
  previousGen.forEach((childIdNum, childIndex) => {
    const fatherId = createIndividual(g, childIndex * 2, 'M', birthYear);
    const motherId = createIndividual(g, childIndex * 2 + 1, 'F', birthYear);
    // Create family linking these parents to their child
    const famIdNum = familyCounter++;
    families.push({ idNum: famIdNum, husbandIdNum: fatherId, wifeIdNum: motherId, childIdNum: childIdNum });
    // Attach refs
    const child = individuals.find(i => i.idNum === childIdNum);
    child.famc = famIdNum;
    const father = individuals.find(i => i.idNum === fatherId);
    const mother = individuals.find(i => i.idNum === motherId);
    father.fams = famIdNum;
    mother.fams = famIdNum;
    currentGen.push(fatherId, motherId);
  });
  previousGen = currentGen;
}

// Build GEDCOM text
let lines = [];
lines.push('0 HEAD');
lines.push('1 SOUR Generated');
lines.push('1 GEDC');
lines.push('2 VERS 5.5');
lines.push('1 CHAR UTF-8');

// Individuals
for (const ind of individuals) {
  lines.push(`0 @I${ind.idNum}@ INDI`);
  lines.push(`1 NAME ${ind.name}`);
  lines.push(`1 SEX ${ind.sex}`);
  lines.push('1 BIRT');
  lines.push(`2 DATE 1 JAN ${ind.birthYear}`);
  if (ind.famc != null) {
    lines.push(`1 FAMC @F${ind.famc}@`);
  }
  if (ind.fams != null) {
    lines.push(`1 FAMS @F${ind.fams}@`);
  }
}

// Families
for (const fam of families) {
  lines.push(`0 @F${fam.idNum}@ FAM`);
  lines.push(`1 HUSB @I${fam.husbandIdNum}@`);
  lines.push(`1 WIFE @I${fam.wifeIdNum}@`);
  lines.push(`1 CHIL @I${fam.childIdNum}@`);
}

lines.push('0 TRLR');

const outPath = path.join(__dirname, '../examples/demo/ancestor-8gen.ged');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Generated ancestor GEDCOM with ${individuals.length} individuals and ${families.length} families at: ${outPath}`);