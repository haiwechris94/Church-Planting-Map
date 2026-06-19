// Inserts the missing closing tags between line 2370 and 2372 in MapView.jsx
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'MapView.jsx');
const raw = fs.readFileSync(file, 'utf8');

// Detect EOL
const eol = raw.includes('\r\n') ? '\r\n' : '\n';

const lines = raw.split(eol);
// Lines are 0-indexed in array. Line 2372 in editor = index 2371.
// We want to replace the line at index 2371 ("{/* Sidebar Toggle Button */}")
// with properly indented closing tags + the comment line.

const targetIdx = 2371; // 0-based index for editor line 2372
const target = lines[targetIdx];
if (!target.includes('Sidebar Toggle Button')) {
  console.error(`ERROR: Expected line 2372 to contain "Sidebar Toggle Button", got: ${JSON.stringify(target)}`);
  process.exit(1);
}

const replacement = [
  '            </>',
  '          )}',
  '        </div>',
  '',
  '        {/* Sidebar Toggle Button */}',
];

lines.splice(targetIdx, 1, ...replacement);

fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(`Patched ${file}. Replaced 1 line with ${replacement.length} lines.`);
