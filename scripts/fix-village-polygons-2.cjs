// Script pour corriger l'affichage des polygones dans MapView.jsx
// 1. Ajouter state adminBoundaryData
// 2. Ajouter mapping COUNTRY_ADMIN_SOURCES et charger les deux types
// 3. Brancher les vraies données aux props de VillageStatusLayer
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'MapView.jsx');
let src = fs.readFileSync(file, 'utf8');
const original = src;

// --- 1. Ajouter state adminBoundaryData après villagesBoundaryData ---
const stateOld = `const [villagesBoundaryData, setVillagesBoundaryData] = useState(null)\r\n  const [villageLayerLoading, setVillageLayerLoading] = useState(false)`;
const stateNew = `const [villagesBoundaryData, setVillagesBoundaryData] = useState(null)\r\n  const [adminBoundaryData, setAdminBoundaryData] = useState(null)\r\n  const [villageLayerLoading, setVillageLayerLoading] = useState(false)`;
if (!src.includes(stateOld)) throw new Error('FAIL: state pattern not found');
if (!src.includes('adminBoundaryData, setAdminBoundaryData')) {
  src = src.replace(stateOld, stateNew);
  console.log('✓ Étape 1: state adminBoundaryData ajouté');
} else {
  console.log('= Étape 1: state adminBoundaryData déjà présent');
}

// --- 2. Remplacer le mapping + l'effet ---
const blockOld = `  // Mapping pays → fichiers GeoJSON de polygones (villages prioritaires, sinon admin)
  // Permet de charger les bons polygones selon le pays sélectionné dans le sélecteur
  // de la couche "Villages / statut DMM".
  const COUNTRY_POLYGON_SOURCES = {
    CM: ['/data/villages.geojson', '/data/Villages découpés.geojson'],
    GA: ['/data/VGabon_Polygons.geojson'],
    TD: ['/data/VChad_polygons.geojson'],
    CG: ['/data/VCongoBrazza_Polygons.geojson'],
    CF: ['/data/VCAF_Polygons.geojson'],
    GQ: ['/data/Admin123GNQ fusionnées.geojson'],
    CD: ['/data/Admin123COD fusionnées.geojson'],
    RW: [],
  }`;

const blockNew = `  // Mapping pays → fichiers GeoJSON de polygones villages (niveau fin)
  const COUNTRY_VILLAGE_SOURCES = {
    CM: ['/data/villages.geojson', '/data/Villages découpés.geojson'],
    GA: ['/data/VGabon_Polygons.geojson'],
    TD: ['/data/VChad_polygons.geojson'],
    CG: ['/data/VCongoBrazza_Polygons.geojson'],
    CF: ['/data/VCAF_Polygons.geojson'],
    GQ: ['/data/Admin123GNQ fusionnées.geojson'],
    CD: ['/data/Admin123COD fusionnées.geojson'],
    RW: [],
  }

  // Mapping pays → fichiers GeoJSON de polygones admin (fallback / overlay)
  const COUNTRY_ADMIN_SOURCES = {
    CM: ['/data/Admin123CMR fusionnées.geojson'],
    GA: ['/data/GAB_admin123.geojson'],
    TD: ['/data/TCD_admin123.geojson'],
    CG: ['/data/Admin123COG fusionnées.geojson'],
    CF: ['/data/CAF_admin123.geojson'],
    GQ: ['/data/Admin123GNQ fusionnées.geojson'],
    CD: ['/data/Admin123COD fusionnées.geojson'],
    RW: [],
  }`;

// Convertir vers CRLF
const blockOldCRLF = blockOld.replace(/\n/g, '\r\n');
const blockNewCRLF = blockNew.replace(/\n/g, '\r\n');

if (!src.includes(blockOldCRLF) && !src.includes('COUNTRY_VILLAGE_SOURCES')) {
  throw new Error('FAIL: mapping pattern not found');
}
if (src.includes(blockOldCRLF)) {
  src = src.replace(blockOldCRLF, blockNewCRLF);
  console.log('✓ Étape 2a: mapping COUNTRY_ADMIN_SOURCES ajouté');
} else {
  console.log('= Étape 2a: mapping déjà mis à jour');
}

// --- 3. Remplacer l'effet de chargement ---
const effectOld = `  useEffect(() => {
    if (!showVillageLayer) return
    setVillageLayerLoading(true)
    setVillagesBoundaryData(null)
    const sources = COUNTRY_POLYGON_SOURCES[villageLayerCountry] || []
    if (sources.length === 0) {
      console.warn(\`[MapView] Aucun fichier de polygones disponible pour le pays "\${villageLayerCountry}"\`)
      setVillageLayerLoading(false)
      return
    }
    Promise.allSettled(sources.map(url =>
      fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)
    )).then(results => {
      const allFeatures = []
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.features) {
          allFeatures.push(...r.value.features)
        }
      })
      if (allFeatures.length > 0) {
        console.log(\`[MapView] \${allFeatures.length} polygones chargés pour \${villageLayerCountry}\`)
        setVillagesBoundaryData({ type: 'FeatureCollection', features: allFeatures })
      } else {
        console.warn(\`[MapView] Aucun polygone trouvé pour \${villageLayerCountry}\`)
        setVillagesBoundaryData(null)
      }
      setVillageLayerLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVillageLayer, villageLayerCountry])`;

const effectNew = `  useEffect(() => {
    if (!showVillageLayer) return
    setVillageLayerLoading(true)
    setVillagesBoundaryData(null)
    setAdminBoundaryData(null)

    const villageSources = COUNTRY_VILLAGE_SOURCES[villageLayerCountry] || []
    const adminSources = COUNTRY_ADMIN_SOURCES[villageLayerCountry] || []

    if (villageSources.length === 0 && adminSources.length === 0) {
      console.warn(\`[MapView] Aucun fichier de polygones disponible pour le pays "\${villageLayerCountry}"\`)
      setVillageLayerLoading(false)
      return
    }

    const fetchAndMerge = (urls) => Promise.allSettled(
      urls.map(url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null))
    ).then(results => {
      const allFeatures = []
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.features) {
          allFeatures.push(...r.value.features)
        }
      })
      return allFeatures.length > 0
        ? { type: 'FeatureCollection', features: allFeatures }
        : null
    })

    Promise.all([fetchAndMerge(villageSources), fetchAndMerge(adminSources)])
      .then(([villagesFC, adminFC]) => {
        const vCount = villagesFC?.features?.length || 0
        const aCount = adminFC?.features?.length || 0
        console.log(\`[MapView] Polygones chargés pour \${villageLayerCountry}: \${vCount} villages, \${aCount} admin\`)
        setVillagesBoundaryData(villagesFC)
        setAdminBoundaryData(adminFC)
        setVillageLayerLoading(false)
      })
      .catch(err => {
        console.error('[MapView] Erreur chargement polygones:', err)
        setVillageLayerLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVillageLayer, villageLayerCountry])`;

const effectOldCRLF = effectOld.replace(/\n/g, '\r\n');
const effectNewCRLF = effectNew.replace(/\n/g, '\r\n');

if (src.includes(effectOldCRLF)) {
  src = src.replace(effectOldCRLF, effectNewCRLF);
  console.log('✓ Étape 2b: effet de chargement étendu pour villages + admin');
} else if (src.includes('Promise.all([fetchAndMerge(villageSources)')) {
  console.log('= Étape 2b: effet déjà mis à jour');
} else {
  throw new Error('FAIL: effect pattern not found');
}

// --- 4. Brancher les vraies props sur VillageStatusLayer ---
const propsOld = `              <VillageStatusLayer\r\n                villagesBoundaryData={null}\r\n                adminBoundaryData={null}\r\n                visible={showVillageLayer}`;
const propsNew = `              <VillageStatusLayer\r\n                villagesBoundaryData={villagesBoundaryData}\r\n                adminBoundaryData={adminBoundaryData}\r\n                visible={showVillageLayer}`;

if (src.includes(propsOld)) {
  src = src.replace(propsOld, propsNew);
  console.log('✓ Étape 3: props branchées (villagesBoundaryData + adminBoundaryData)');
} else if (src.includes('villagesBoundaryData={villagesBoundaryData}')) {
  console.log('= Étape 3: props déjà branchées');
} else {
  throw new Error('FAIL: props pattern not found');
}

if (src === original) {
  console.log('Aucune modification nécessaire.');
} else {
  fs.writeFileSync(file, src, 'utf8');
  console.log('\n✅ MapView.jsx mis à jour avec succès');
}
