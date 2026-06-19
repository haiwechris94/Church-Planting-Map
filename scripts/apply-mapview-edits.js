#!/usr/bin/env node
/* One-shot edit script for MapView.jsx that preserves CRLF line endings. */
const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'MapView.jsx');
const buf = fs.readFileSync(target);
const original = buf.toString('utf8');

// Sanity: file must currently contain CRLF
if (!buf.includes(Buffer.from([0x0d, 0x0a]))) {
  throw new Error('File does not contain CRLF line endings before edit; aborting.');
}

const CRLF = '\r\n';

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

function replaceExactlyOnce(src, find, replace, label) {
  const n = countOccurrences(src, find);
  if (n !== 1) {
    throw new Error(`[${label}] expected exactly 1 occurrence of FIND, found ${n}`);
  }
  return src.replace(find, replace);
}

// ---------- REPLACEMENT 1 ----------
const find1 =
  `    queryKey: ['peopleGroupsWithGeometry', 'map', selectedCountries, selectedRegion, selectedDepartment, selectedArrondissement],`;
const replace1 =
  `    queryKey: ['peopleGroupsForMap', mapMode === 'coverage' ? 'noGeometry' : 'withGeometry', selectedCountries, selectedRegion, selectedDepartment, selectedArrondissement],`;

// ---------- REPLACEMENT 2 ----------
const find2 =
  `      console.log('[MapView] Fetching people groups WITH GEOMETRY using pagination:', filters)`;
const replace2 = [
  `      // PERF: in coverage mode the markers are hidden and CoverageLayer only`,
  `      // needs lat/lng + engagementStatus to color polygons via point-in-polygon.`,
  `      // Skip the heavy \`polygon\` field on the server (~90% smaller payload).`,
  `      const useLightweight = mapMode === 'coverage'`,
  `      console.log(\`[MapView] Fetching people groups (\${useLightweight ? 'NO geometry — coverage mode' : 'WITH geometry'}):\`, filters)`,
].join(CRLF);

// ---------- REPLACEMENT 3 ----------
const find3 =
  `        // Use paginated fetch with progress tracking` + CRLF +
  `        const allData = await peopleGroupsApi.getAllWithGeometryPaginated(filters, {`;
const replace3 = [
  `        // Use paginated fetch with progress tracking. Lightweight variant`,
  `        // (without polygon field) is used in coverage mode for speed.`,
  `        const fetcher = useLightweight`,
  `          ? peopleGroupsApi.getAllPaginated`,
  `          : peopleGroupsApi.getAllWithGeometryPaginated`,
  `        const allData = await fetcher(filters, {`,
].join(CRLF);

let updated = original;
updated = replaceExactlyOnce(updated, find1, replace1, 'REPLACEMENT 1');
updated = replaceExactlyOnce(updated, find2, replace2, 'REPLACEMENT 2');
updated = replaceExactlyOnce(updated, find3, replace3, 'REPLACEMENT 3');

if (updated.length <= original.length) {
  throw new Error(`Sanity check failed: updated length (${updated.length}) <= original length (${original.length}).`);
}

// Write back as utf8 — replacement strings used CRLF so line endings remain CRLF.
fs.writeFileSync(target, updated, 'utf8');

// Post-write verification
const afterBuf = fs.readFileSync(target);
const after = afterBuf.toString('utf8');

const hasCRLF = afterBuf.includes(Buffer.from([0x0d, 0x0a]));
const badQueryKeyOccurrences = countOccurrences(after, `'peopleGroupsWithGeometry', 'map'`);
const newQueryKeyOccurrences = countOccurrences(after, `peopleGroupsForMap`);
const useLightweightOccurrences = countOccurrences(after, `useLightweight`);
const invalidateUsageStillPresent = after.includes(`['peopleGroupsWithGeometry']`);
const lineCount = after.split(CRLF).length;

console.log(JSON.stringify({
  originalLength: original.length,
  updatedLength: updated.length,
  hasCRLF,
  badQueryKeyOccurrences,
  newQueryKeyOccurrences,
  useLightweightOccurrences,
  invalidateUsageStillPresent,
  lineCount,
}, null, 2));
