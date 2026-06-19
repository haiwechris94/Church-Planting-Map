const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'MapView.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// Note: Line 2162 opens the wrapper div. Line 2979 has the orphaned </div>.
// Let's only look at <div> tags (very common). Track depth from line 2162 (the wrapper)
// until line 2979 (where the parser fails).
let depth = 0;
const startLine = 2162; // wrapper div open
const endLine = 2980;   // line of </> closing fragment

const minDepthByLine = [];
for (let i = startLine - 1; i < endLine; i++) {
  const ln = lines[i] || '';
  const opens = (ln.match(/<div(\s|>)/g) || []).length;
  const closes = (ln.match(/<\/div>/g) || []).length;
  const selfClose = (ln.match(/<div[^>]*\/>/g) || []).length;
  const realOpens = opens - selfClose;
  const before = depth;
  depth += realOpens - closes;
  if (realOpens || closes) {
    minDepthByLine.push({ lineNum: i + 1, before, after: depth, opens: realOpens, closes, content: ln.trim().substring(0, 120) });
  }
}

// Print transitions where depth went BELOW expected, focusing on the end.
console.log('Final depth at end (should be 0 if balanced):', depth);
console.log('\n--- LAST 30 div transitions (with depths) ---');
for (const e of minDepthByLine.slice(-30)) {
  console.log(`L${e.lineNum} +${e.opens} -${e.closes} depth ${e.before} -> ${e.after} | ${e.content}`);
}

console.log('\n--- Lines where depth went to 0 (matching outer wrapper close) ---');
for (const e of minDepthByLine) {
  if (e.after === 0) {
    console.log(`L${e.lineNum} +${e.opens} -${e.closes} depth ${e.before} -> ${e.after} | ${e.content}`);
  }
}
