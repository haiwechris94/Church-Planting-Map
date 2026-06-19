// Use @babel/parser with errorRecovery to find JSX imbalance.
const fs = require('fs');
const path = require('path');
const parser = require(path.resolve(__dirname, '../frontend/node_modules/@babel/parser'));

const file = path.resolve(__dirname, '../frontend/src/pages/MapView.jsx');
const src = fs.readFileSync(file, 'utf8');

let ast;
try {
  ast = parser.parse(src, {
    sourceType: 'module',
    plugins: ['jsx'],
    errorRecovery: true,
  });
} catch (e) {
  console.error('Hard parse error:', e.message);
  process.exit(1);
}

if (ast.errors && ast.errors.length) {
  console.log('Recovered errors:');
  for (const err of ast.errors) {
    console.log(`  ${err.loc ? err.loc.line + ':' + err.loc.column : '?'} - ${err.message || err.code || err}`);
  }
} else {
  console.log('No errors!');
}

// Walk AST and report JSXElements / JSXFragments whose closing tag is missing or mismatched
function walk(node, parent) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walk(n, parent)); return; }

  if (node.type === 'JSXElement') {
    const open = node.openingElement;
    const close = node.closingElement;
    if (open && !open.selfClosing) {
      const openName = open.name && (open.name.name || (open.name.object && open.name.object.name + '.' + open.name.property.name));
      const closeName = close && close.name && (close.name.name || (close.name.object && close.name.object.name + '.' + close.name.property.name));
      if (!close) {
        console.log(`Unclosed <${openName}> opened at line ${open.loc.start.line}`);
      } else if (openName !== closeName) {
        console.log(`Mismatched: <${openName}> opened line ${open.loc.start.line}, closed as </${closeName}> at line ${close.loc.start.line}`);
      }
    }
  }
  if (node.type === 'JSXFragment') {
    if (!node.closingFragment) {
      console.log(`Unclosed <> opened at line ${node.openingFragment.loc.start.line}`);
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'start' || key === 'end' || key === 'tokens' || key === 'comments') continue;
    walk(node[key], node);
  }
}

walk(ast, null);
console.log('Done walking AST.');
