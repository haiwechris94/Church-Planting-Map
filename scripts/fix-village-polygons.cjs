const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'MapView.jsx');
const s = fs.readFileSync(p, 'utf8');

const EOL = '\r\n';

const old = [
  "  // Charger les données GeoJSON villages au premier activation de la couche",
  "  useEffect(() => {",
  "    if (!showVillageLayer || villagesBoundaryData) return",
  "    setVillageLayerLoading(true)",
  "    // Charger les GeoJSON villages disponibles (même logique que geojson-map)",
  "    const sources = [",
  "      '/data/villages.geojson',",
  "      '/data/VChad_polygons.geojson',",
  "      '/data/VCongoBrazza_Polygons.geojson',",
  "      '/data/Villages découpés.geojson',",
  "    ]",
  "    Promise.allSettled(sources.map(url =>",
  "      fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)",
  "    )).then(results => {",
  "      // Fusionner tous les GeoJSON en un seul FeatureCollection",
  "      const allFeatures = []",
  "      results.forEach(r => {",
  "        if (r.status === 'fulfilled' && r.value?.features) {",
  "          allFeatures.push(...r.value.features)",
  "        }",
  "      })",
  "      if (allFeatures.length > 0) {",
  "        setVillagesBoundaryData({ type: 'FeatureCollection', features: allFeatures })",
  "      }",
  "      setVillageLayerLoading(false)",
  "    })",
  "  }, [showVillageLayer, villagesBoundaryData])",
].join(EOL);

const next = [
  "  // Mapping pays → fichiers GeoJSON de polygones (villages prioritaires, sinon admin)",
  "  // Permet de charger les bons polygones selon le pays sélectionné dans le sélecteur",
  "  // de la couche \"Villages / statut DMM\".",
  "  const COUNTRY_POLYGON_SOURCES = {",
  "    CM: ['/data/villages.geojson', '/data/Villages découpés.geojson'],",
  "    GA: ['/data/VGabon_Polygons.geojson'],",
  "    TD: ['/data/VChad_polygons.geojson'],",
  "    CG: ['/data/VCongoBrazza_Polygons.geojson'],",
  "    CF: ['/data/VCAF_Polygons.geojson'],",
  "    GQ: ['/data/Admin123GNQ fusionnées.geojson'],",
  "    CD: ['/data/Admin123COD fusionnées.geojson'],",
  "    RW: [],",
  "  }",
  "",
  "  // Charger les polygones GeoJSON quand la couche est activée OU quand le pays",
  "  // sélectionné change. On invalide les anciennes données pour éviter d'afficher",
  "  // les polygones d'un autre pays pendant le chargement.",
  "  useEffect(() => {",
  "    if (!showVillageLayer) return",
  "    setVillageLayerLoading(true)",
  "    setVillagesBoundaryData(null)",
  "    const sources = COUNTRY_POLYGON_SOURCES[villageLayerCountry] || []",
  "    if (sources.length === 0) {",
  "      console.warn(`[MapView] Aucun fichier de polygones disponible pour le pays \"${villageLayerCountry}\"`)",
  "      setVillageLayerLoading(false)",
  "      return",
  "    }",
  "    Promise.allSettled(sources.map(url =>",
  "      fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)",
  "    )).then(results => {",
  "      const allFeatures = []",
  "      results.forEach(r => {",
  "        if (r.status === 'fulfilled' && r.value?.features) {",
  "          allFeatures.push(...r.value.features)",
  "        }",
  "      })",
  "      if (allFeatures.length > 0) {",
  "        console.log(`[MapView] ${allFeatures.length} polygones chargés pour ${villageLayerCountry}`)",
  "        setVillagesBoundaryData({ type: 'FeatureCollection', features: allFeatures })",
  "      } else {",
  "        console.warn(`[MapView] Aucun polygone trouvé pour ${villageLayerCountry}`)",
  "        setVillagesBoundaryData(null)",
  "      }",
  "      setVillageLayerLoading(false)",
  "    })",
  "    // eslint-disable-next-line react-hooks/exhaustive-deps",
  "  }, [showVillageLayer, villageLayerCountry])",
].join(EOL);

if (!s.includes(old)) {
  console.error('OLD NOT FOUND - aborting');
  process.exit(1);
}

const occ = s.split(old).length - 1;
console.log('Occurrences:', occ);

const s2 = s.replace(old, next);
fs.writeFileSync(p, s2, 'utf8');
console.log('OK - patched');
console.log('Old length:', s.length);
console.log('New length:', s2.length);
