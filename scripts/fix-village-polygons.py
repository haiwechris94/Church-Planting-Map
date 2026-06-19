import io, sys

p = 'frontend/src/pages/MapView.jsx'
with io.open(p, 'r', encoding='utf-8', newline='') as f:
    s = f.read()

old = (
    "  // Charger les données GeoJSON villages au premier activation de la couche\r\n"
    "  useEffect(() => {\r\n"
    "    if (!showVillageLayer || villagesBoundaryData) return\r\n"
    "    setVillageLayerLoading(true)\r\n"
    "    // Charger les GeoJSON villages disponibles (même logique que geojson-map)\r\n"
    "    const sources = [\r\n"
    "      '/data/villages.geojson',\r\n"
    "      '/data/VChad_polygons.geojson',\r\n"
    "      '/data/VCongoBrazza_Polygons.geojson',\r\n"
    "      '/data/Villages découpés.geojson',\r\n"
    "    ]\r\n"
    "    Promise.allSettled(sources.map(url =>\r\n"
    "      fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)\r\n"
    "    )).then(results => {\r\n"
    "      // Fusionner tous les GeoJSON en un seul FeatureCollection\r\n"
    "      const allFeatures = []\r\n"
    "      results.forEach(r => {\r\n"
    "        if (r.status === 'fulfilled' && r.value?.features) {\r\n"
    "          allFeatures.push(...r.value.features)\r\n"
    "        }\r\n"
    "      })\r\n"
    "      if (allFeatures.length > 0) {\r\n"
    "        setVillagesBoundaryData({ type: 'FeatureCollection', features: allFeatures })\r\n"
    "      }\r\n"
    "      setVillageLayerLoading(false)\r\n"
    "    })\r\n"
    "  }, [showVillageLayer, villagesBoundaryData])\r\n"
)

new = (
    "  // Mapping pays → fichiers GeoJSON de polygones (villages prioritaires, sinon admin)\r\n"
    "  // Permet de charger les bons polygones selon le pays sélectionné dans le sélecteur\r\n"
    "  // de la couche \"Villages / statut DMM\".\r\n"
    "  const COUNTRY_POLYGON_SOURCES = {\r\n"
    "    CM: ['/data/villages.geojson', '/data/Villages découpés.geojson'],\r\n"
    "    GA: ['/data/VGabon_Polygons.geojson'],\r\n"
    "    TD: ['/data/VChad_polygons.geojson'],\r\n"
    "    CG: ['/data/VCongoBrazza_Polygons.geojson'],\r\n"
    "    CF: ['/data/VCAF_Polygons.geojson'],\r\n"
    "    GQ: ['/data/Admin123GNQ fusionnées.geojson'],\r\n"
    "    CD: ['/data/Admin123COD fusionnées.geojson'],\r\n"
    "    RW: [],\r\n"
    "  }\r\n"
    "\r\n"
    "  // Charger les polygones GeoJSON quand la couche est activée OU quand le pays\r\n"
    "  // sélectionné change. On invalide les anciennes données pour éviter d'afficher\r\n"
    "  // les polygones d'un autre pays pendant le chargement.\r\n"
    "  useEffect(() => {\r\n"
    "    if (!showVillageLayer) return\r\n"
    "    setVillageLayerLoading(true)\r\n"
    "    setVillagesBoundaryData(null)\r\n"
    "    const sources = COUNTRY_POLYGON_SOURCES[villageLayerCountry] || []\r\n"
    "    if (sources.length === 0) {\r\n"
    "      console.warn(`[MapView] Aucun fichier de polygones disponible pour le pays \"${villageLayerCountry}\"`)\r\n"
    "      setVillageLayerLoading(false)\r\n"
    "      return\r\n"
    "    }\r\n"
    "    Promise.allSettled(sources.map(url =>\r\n"
    "      fetch(url).then(r => r.ok ? r.json() : null).catch(() => null)\r\n"
    "    )).then(results => {\r\n"
    "      const allFeatures = []\r\n"
    "      results.forEach(r => {\r\n"
    "        if (r.status === 'fulfilled' && r.value?.features) {\r\n"
    "          allFeatures.push(...r.value.features)\r\n"
    "        }\r\n"
    "      })\r\n"
    "      if (allFeatures.length > 0) {\r\n"
    "        console.log(`[MapView] ${allFeatures.length} polygones chargés pour ${villageLayerCountry}`)\r\n"
    "        setVillagesBoundaryData({ type: 'FeatureCollection', features: allFeatures })\r\n"
    "      } else {\r\n"
    "        console.warn(`[MapView] Aucun polygone trouvé pour ${villageLayerCountry}`)\r\n"
    "        setVillagesBoundaryData(null)\r\n"
    "      }\r\n"
    "      setVillageLayerLoading(false)\r\n"
    "    })\r\n"
    "    // eslint-disable-next-line react-hooks/exhaustive-deps\r\n"
    "  }, [showVillageLayer, villageLayerCountry])\r\n"
)

if old not in s:
    print('OLD NOT FOUND - aborting')
    sys.exit(1)

count = s.count(old)
print(f'Occurrences: {count}')
s2 = s.replace(old, new, 1)

with io.open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(s2)

print('OK - patched')
print('Old length:', len(s))
print('New length:', len(s2))
