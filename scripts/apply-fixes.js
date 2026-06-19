/**
 * Apply 3 frontend fixes:
 * 1. Remove blue village points (raw GeoJSON block in MapView.jsx)
 * 2. Make Joshua Project peoples display by default
 * 3. Filter adminAreaStatuses by real admin level in VillageStatusLayer.jsx
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_VIEW = path.join(ROOT, 'frontend/src/pages/MapView.jsx');
const VSL = path.join(ROOT, 'frontend/src/components/Map/VillageStatusLayer.jsx');

// ─── Fix 1 & 2: MapView.jsx ────────────────────────────────────────────────
let mv = fs.readFileSync(MAP_VIEW, 'utf8');
const mvOriginalLength = mv.length;

// Fix 1: Remove the raw <GeoJSON> block (lines 2732-2776 / village-status-layer)
// We match from the "polygones colorés par statut DMM" comment through the closing )}
const blueBlockStart = mv.indexOf("            {/* Village Status Layer — polygones colorés par statut DMM */}");
if (blueBlockStart === -1) {
  console.error('❌ Fix 1: Could not find blue village block start');
  process.exit(1);
}
// End: the closing `            )}\r\n` right before the next comment
const nextCommentIdx = mv.indexOf("            {/* Village Status Layer — même logique que /geojson-map */}", blueBlockStart);
if (nextCommentIdx === -1) {
  console.error('❌ Fix 1: Could not find next comment');
  process.exit(1);
}
const removed1 = mv.substring(blueBlockStart, nextCommentIdx);
mv = mv.substring(0, blueBlockStart) + mv.substring(nextCommentIdx);
console.log(`✅ Fix 1: Removed ${removed1.split('\n').length - 1} lines (blue village GeoJSON block)`);

// Fix 2a: Default showJoshuaProject to true
const jpStateBefore = "const [showJoshuaProject, setShowJoshuaProject] = useState(false)";
const jpStateAfter = "const [showJoshuaProject, setShowJoshuaProject] = useState(true)";
if (!mv.includes(jpStateBefore)) {
  console.error('❌ Fix 2a: Could not find showJoshuaProject state');
  process.exit(1);
}
mv = mv.replace(jpStateBefore, jpStateAfter);
console.log('✅ Fix 2a: showJoshuaProject default changed to true');

// Fix 2b: Remove the auto-disable of JP in terrain/coverage modes (keep strategic auto-enable)
const oldEffect = `  // Sync map mode → source toggles\r\n  // Terrain = JP masqué, Stratégique = JP visible, Couverture = tout masqué sauf Voronoï\r\n  useEffect(() => {\r\n    if (mapMode === 'terrain') {\r\n      setShowJoshuaProject(false)\r\n      setShowMBBRadar(false)\r\n    } else if (mapMode === 'strategic') {\r\n      setShowJoshuaProject(true)\r\n    } else if (mapMode === 'coverage') {\r\n      setShowJoshuaProject(false)\r\n      setShowMBBRadar(false)\r\n    }\r\n  }, [mapMode])`;
const newEffect = `  // Sync map mode → source toggles\r\n  // Stratégique = JP auto-activé. Terrain/Couverture = ne touche pas à JP\r\n  // (JP reste affiché par défaut, l'utilisateur peut toggler à la main)\r\n  useEffect(() => {\r\n    if (mapMode === 'strategic') {\r\n      setShowJoshuaProject(true)\r\n    } else {\r\n      setShowMBBRadar(false)\r\n    }\r\n  }, [mapMode])`;
if (!mv.includes(oldEffect)) {
  console.error('❌ Fix 2b: Could not find mapMode useEffect');
  process.exit(1);
}
mv = mv.replace(oldEffect, newEffect);
console.log('✅ Fix 2b: mapMode useEffect updated (JP no longer auto-hidden in terrain/coverage)');

fs.writeFileSync(MAP_VIEW, mv);
console.log(`📝 MapView.jsx: ${mvOriginalLength} → ${mv.length} chars (${mv.length - mvOriginalLength})`);

// ─── Fix 3: VillageStatusLayer.jsx ──────────────────────────────────────────
let vsl = fs.readFileSync(VSL, 'utf8');
const vslOriginalLength = vsl.length;

// Replace the inner of the adminAreaStatuses useMemo body — specifically replace
// the iteration/filter/dedup logic so it uses the same level-aware deduplication
// as the admin useEffect (lines 626-652 of original file).
const oldMemoStart = `  const adminAreaStatuses = useMemo(() => {\r\n    if (adminLevel === 3 || !adminBoundaryData?.features) return null\r\n    \r\n    debugLog('🔢 [ADMIN] Computing adminAreaStatuses', {\r\n      adminLevel,\r\n      featureCount: adminBoundaryData.features.length,\r\n      peopleGroupsCount: peopleGroups.length,\r\n      samplePeopleGroups: peopleGroups.slice(0, 3).map(pg => ({ name: pg.name, engagementStatus: pg.engagementStatus, region: pg.region, admin1: pg.admin1, admin2: pg.admin2, departement: pg.departement }))\r\n    })\r\n    \r\n    const areaStatuses = {}\r\n    const processedAreas = new Set()\r\n    \r\n    adminBoundaryData.features.forEach(feature => {\r\n      const props = feature.properties || {}\r\n      let areaName, areaKey\r\n      \r\n      if (adminLevel === 1) {\r\n        if (!props.NAME_1) return\r\n        areaName = props.NAME_1\r\n        areaKey = \`admin1_\${areaName}\`\r\n      } else if (adminLevel === 2) {\r\n        if (!props.NAME_2) return\r\n        areaName = props.NAME_2\r\n        areaKey = \`admin2_\${areaName}\`\r\n      }\r\n      \r\n      if (!areaName || processedAreas.has(areaKey)) return\r\n      processedAreas.add(areaKey)`;

const newMemoStart = `  const adminAreaStatuses = useMemo(() => {\r\n    if (adminLevel === 3 || !adminBoundaryData?.features) return null\r\n    \r\n    debugLog('🔢 [ADMIN] Computing adminAreaStatuses', {\r\n      adminLevel,\r\n      featureCount: adminBoundaryData.features.length,\r\n      peopleGroupsCount: peopleGroups.length,\r\n      samplePeopleGroups: peopleGroups.slice(0, 3).map(pg => ({ name: pg.name, engagementStatus: pg.engagementStatus, region: pg.region, admin1: pg.admin1, admin2: pg.admin2, departement: pg.departement }))\r\n    })\r\n    \r\n    const areaStatuses = {}\r\n    const processedAreas = new Set()\r\n    \r\n    // Filter features by their REAL admin level (matches the dedup logic in the admin useEffect).\r\n    // GADM merged GeoJSON files contain features for all admin levels (1, 2, 3) in the same\r\n    // FeatureCollection. Each feature only has NAME_* fields populated up to its own admin level:\r\n    //   - Level 1 feature: NAME_1 only (NAME_2/NAME_3 null)\r\n    //   - Level 2 feature: NAME_1 + NAME_2 (NAME_3 null)\r\n    //   - Level 3 feature: NAME_1 + NAME_2 + NAME_3\r\n    // Without this filter, e.g. when adminLevel === 1 we would pick up tiny level-2/3 polygons\r\n    // (because they also have NAME_1 populated) and use them for point-in-polygon tests, which\r\n    // would either miss people groups (wrong polygon) or duplicate-collapse the real admin-1 polygon.\r\n    const isPopulated = (v) => v != null && v !== '' && v !== 'NA' && v !== 'null'\r\n    const levelFilteredFeatures = adminBoundaryData.features.filter(feature => {\r\n      const props = feature.properties || {}\r\n      let featureAdminLevel = typeof props.admin_level === 'number' ? props.admin_level : null\r\n      if (featureAdminLevel == null) {\r\n        if (isPopulated(props.NAME_3)) featureAdminLevel = 3\r\n        else if (isPopulated(props.NAME_2)) featureAdminLevel = 2\r\n        else if (isPopulated(props.NAME_1)) featureAdminLevel = 1\r\n        else return false\r\n      }\r\n      return featureAdminLevel === adminLevel\r\n    })\r\n    \r\n    debugLog(\`📍 [ADMIN] adminAreaStatuses: \${levelFilteredFeatures.length}/\${adminBoundaryData.features.length} features at level \${adminLevel}\`)\r\n    \r\n    levelFilteredFeatures.forEach(feature => {\r\n      const props = feature.properties || {}\r\n      let areaName, areaKey\r\n      \r\n      if (adminLevel === 1) {\r\n        if (!isPopulated(props.NAME_1)) return\r\n        areaName = props.NAME_1\r\n        areaKey = \`admin1_\${areaName}\`\r\n      } else if (adminLevel === 2) {\r\n        if (!isPopulated(props.NAME_1) || !isPopulated(props.NAME_2)) return\r\n        areaName = props.NAME_2\r\n        // Include NAME_1 in the key to disambiguate identically-named admin-2 areas across regions\r\n        areaKey = \`admin2_\${props.NAME_1}__\${areaName}\`\r\n      }\r\n      \r\n      if (!areaName || processedAreas.has(areaKey)) return\r\n      processedAreas.add(areaKey)`;

if (!vsl.includes(oldMemoStart)) {
  console.error('❌ Fix 3: Could not find adminAreaStatuses useMemo opening');
  // Print a diff hint
  const idx = vsl.indexOf("const adminAreaStatuses = useMemo");
  if (idx >= 0) {
    console.error('Found at index', idx, '. Surrounding:');
    console.error(JSON.stringify(vsl.substring(idx, idx + 200)));
  }
  process.exit(1);
}
vsl = vsl.replace(oldMemoStart, newMemoStart);
console.log('✅ Fix 3: adminAreaStatuses now filters features by real admin level');

fs.writeFileSync(VSL, vsl);
console.log(`📝 VillageStatusLayer.jsx: ${vslOriginalLength} → ${vsl.length} chars (+${vsl.length - vslOriginalLength})`);

console.log('\n✨ All 3 fixes applied successfully');
