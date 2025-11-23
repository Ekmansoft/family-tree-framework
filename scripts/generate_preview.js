// Generate an SVG preview of the sample-from-image.json tree using the same layout rules.
const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../examples/demo/sample-from-image.json');
const outPath = path.resolve(__dirname, '../examples/demo/preview-sample-from-image.svg');

const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);
const individuals = data.individuals || [];
const families = data.families || [];

const individualsById = new Map(individuals.map(i => [i.id, i]));

// Build parentsOf and childrenOf maps
const childrenOf = new Map();
const parentsOf = new Map();
families.forEach(f => {
  const parents = (f.parents || []).slice();
  const kids = (f.children || []).slice();
  parents.forEach(p => {
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p).push(...kids);
  });
  kids.forEach(c => {
    if (!parentsOf.has(c)) parentsOf.set(c, []);
    parentsOf.get(c).push(...parents);
  });
});

// roots
const roots = individuals.filter(i => !parentsOf.has(i.id)).map(i => i.id);

// BFS levels
const levelOf = new Map();
const queue = [];
roots.forEach(r => { levelOf.set(r, 0); queue.push(r); });
while (queue.length) {
  const id = queue.shift();
  const lvl = levelOf.get(id) || 0;
  const kids = childrenOf.get(id) || [];
  kids.forEach(k => {
    const existing = levelOf.get(k);
    const wanted = lvl + 1;
    if (existing === undefined || wanted < existing) {
      levelOf.set(k, wanted);
      queue.push(k);
    }
  });
}
individuals.forEach(i => { if (!levelOf.has(i.id)) levelOf.set(i.id, 0); });

// propagate parents/children and spouse adoption similar to TreeView
for (let iter=0; iter<8; iter++) {
  let changed = false;
  families.forEach(f => {
    const parents = (f.parents||[]).slice();
    const kids = (f.children||[]).slice();
    const parentLevels = parents.map(p => levelOf.get(p)).filter(v => typeof v === 'number');
    if (parentLevels.length>0) {
      const target = parentLevels[0];
      parents.forEach(p => { const cur = levelOf.get(p); if (cur===undefined||cur!==target){ levelOf.set(p,target); changed=true; }});
      kids.forEach(c => { const cur = levelOf.get(c); const want = target+1; if (cur===undefined||cur<want){ levelOf.set(c,want); changed=true; }});
    }
    const childLevels = kids.map(c=>levelOf.get(c)).filter(v=>typeof v==='number');
    if (childLevels.length>0) {
      const wantParent = Math.min(...childLevels)-1;
      parents.forEach(p=>{ const cur = levelOf.get(p); if (cur===undefined||cur!==wantParent){ levelOf.set(p,wantParent); changed=true; }});
    }
  });
  if (!changed) break;
}

// Force spouse adoption: if any parent is a child in another family, set all parents to that parent's level
const childParentFamily = new Map();
families.forEach(f=>{ (f.children||[]).forEach(c=>childParentFamily.set(c,f.id)); });
families.forEach(f=>{
  const parents = (f.parents||[]).slice();
  const childParent = parents.find(p=>childParentFamily.has(p));
  if (childParent) {
    const target = levelOf.get(childParent);
    if (typeof target === 'number') parents.forEach(p => { levelOf.set(p,target); });
  }
});

// Group by level
const levels = new Map();
let maxLevel = 0;
levelOf.forEach((lvl,id)=>{ if(!levels.has(lvl)) levels.set(lvl,[]); levels.get(lvl).push(id); if (lvl>maxLevel) maxLevel=lvl; });

// layout params
const rowHeight = 90;
const totalHeight = (maxLevel*2+1)*rowHeight;
const pos = {};

// build spouse lookup
const spouseOf = new Map();
families.forEach(f=>{ const ps=(f.parents||[]).slice(); ps.forEach(p=>{ if(!spouseOf.has(p)) spouseOf.set(p,[]); spouseOf.get(p).push(...ps.filter(x=>x!==p)); }); });

Array.from(levels.keys()).sort((a,b)=>a-b).forEach(lvl=>{
  const ids = levels.get(lvl) || [];
  const placed = new Set();
  const groups = [];
  ids.forEach(id=>{
    if (placed.has(id)) return;
    const possible = spouseOf.get(id) || [];
    const spouse = possible.find(s=>ids.includes(s) && !placed.has(s));
    if (spouse) { groups.push({type:'pair', ids:[id,spouse]}); placed.add(id); placed.add(spouse); }
    else { groups.push({type:'single', ids:[id]}); placed.add(id); }
  });
  const groupCount = groups.length;
  groups.forEach((g,gi)=>{
    const leftPad=10, rightPad=90;
    const centerX = groupCount===1?50:leftPad + (gi*(rightPad-leftPad))/(groupCount-1);
    const personRow = lvl*2;
    const y = personRow*rowHeight + rowHeight/2;
    if (g.type==='single') pos[g.ids[0]] = { x:centerX, y };
    else {
      const pairOffset = 2;
      pos[g.ids[0]] = { x:centerX - pairOffset, y };
      pos[g.ids[1]] = { x:centerX + pairOffset, y };
    }
  });
});

// family positions
const familyPositions = [];
families.forEach(f=>{
  const parents = (f.parents||[]).slice();
  const kids = (f.children||[]).slice();
  const parentPos = parents.map(p=>pos[p]).filter(Boolean);
  const childPos = kids.map(c=>pos[c]).filter(Boolean);
  const avg = arr => ({ x: arr.reduce((s,a)=>s+a.x,0)/arr.length, y: arr.reduce((s,a)=>s+a.y,0)/arr.length });
  let familyX=50, familyY=rowHeight;
  if (parentPos.length>0 && childPos.length>0) {
    const pavg = avg(parentPos); const cavg = avg(childPos);
    familyX = (pavg.x + cavg.x)/2;
    const parentLevels = parents.map(pid=>levelOf.get(pid)).filter(v=>typeof v==='number');
    const maxParent = parentLevels.length?Math.max(...parentLevels):0;
    const familyRow = maxParent*2 + 1;
    familyY = familyRow*rowHeight + rowHeight/2;
  } else if (parentPos.length>0) {
    const pavg = avg(parentPos); familyX = pavg.x; familyY = pavg.y + rowHeight*0.4;
  } else if (childPos.length>0) {
    const cavg = avg(childPos); familyX = cavg.x; familyY = cavg.y - rowHeight*0.4;
  }
  familyPositions.push({ id: f.id, x: familyX, y: familyY, parents, children: kids });
});

// build svg
const width = 1200; // px
const padding = 40;
const svgHeight = Math.max(400, totalHeight) + padding*2;
let svg = '';
svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}" viewBox="0 0 100 ${totalHeight}" preserveAspectRatio="xMidYMid meet">\n`;
svg += '<defs>\n';
svg += '<style> .person { font: 3px sans-serif; text-anchor: middle; } .family { font: 2.5px sans-serif; text-anchor: middle; } .node-circle{ fill:#fff; stroke:#2b9ac8; stroke-width:0.6; } .fam-box{ fill:#fff; stroke:#666; stroke-width:0.4; } </style>\n';
svg += '</defs>\n';

// connectors
familyPositions.forEach(fam => {
  fam.parents.forEach(pid => {
    const p = pos[pid]; if (!p) return;
    svg += `<line x1="${p.x}" y1="${p.y}" x2="${fam.x}" y2="${fam.y}" stroke="#666" stroke-width="0.4" />\n`;
  });
  fam.children.forEach(cid => {
    const c = pos[cid]; if (!c) return;
    svg += `<line x1="${fam.x}" y1="${fam.y}" x2="${c.x}" y2="${c.y}" stroke="#666" stroke-width="0.4" />\n`;
  });
});

// person nodes
individuals.forEach(ind => {
  const p = pos[ind.id];
  if (!p) return;
  svg += `<g transform="translate(${p.x}, ${p.y})">`;
  svg += `<circle class="node-circle" cx="0" cy="0" r="2.2" />`;
  svg += `<text class="person" x="0" y="4">${ind.name}</text>`;
  svg += `</g>\n`;
});

// family boxes
familyPositions.forEach(fam => {
  svg += `<g transform="translate(${fam.x}, ${fam.y})">`;
  svg += `<rect class="fam-box" x="-2.0" y="-1.2" width="4" height="2.4" rx="0.3" />`;
  svg += `<text class="family" x="0" y="0.8">${fam.id}</text>`;
  svg += `</g>\n`;
});

svg += '</svg>';

fs.writeFileSync(outPath, svg, 'utf8');
console.log('Wrote SVG preview to', outPath);
