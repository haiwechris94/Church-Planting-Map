/**
 * Export Utilities
 * Generate GeoJSON, KML, and Excel exports
 */

/**
 * Convert villages and people groups to GeoJSON FeatureCollection
 */
const toGeoJSON = (data, options = {}) => {
  const { includeVillages = true, includePeopleGroups = true } = options;
  
  const features = [];

  // Add villages
  if (includeVillages && data.villages) {
    data.villages.forEach(village => {
      // Add point feature for village center
      if (village.location?.coordinates) {
        features.push({
          type: 'Feature',
          geometry: village.location,
          properties: {
            id: village._id,
            type: 'village',
            name: village.name,
            population: village.population,
            status: village.status,
            coverageStatus: village.coverageStatus,
            coveragePercentage: village.coveragePercentage,
            region: village.region,
            country: village.country,
            description: village.description,
            createdAt: village.createdAt,
            updatedAt: village.updatedAt,
          },
        });
      }

      // Add polygon feature for village boundary
      if (village.boundary?.coordinates?.length > 0) {
        features.push({
          type: 'Feature',
          geometry: village.boundary,
          properties: {
            id: village._id,
            type: 'village-boundary',
            name: `${village.name} (Boundary)`,
            population: village.population,
            status: village.status,
            style: village.style,
          },
        });
      }
    });
  }

  // Add people groups
  if (includePeopleGroups && data.peopleGroups) {
    data.peopleGroups.forEach(pg => {
      if (pg.location?.coordinates) {
        features.push({
          type: 'Feature',
          geometry: pg.location,
          properties: {
            id: pg._id,
            type: 'people-group',
            name: pg.name,
            status: pg.status,
            statusColor: pg.statusColor,
            progressPercentage: pg.progressPercentage,
            population: pg.population,
            language: pg.language,
            religion: pg.religion,
            believersCount: pg.believersCount,
            churchesCount: pg.churchesCount,
            region: pg.region,
            country: pg.country,
            description: pg.description,
            approved: pg.approved,
            createdAt: pg.createdAt,
            updatedAt: pg.updatedAt,
          },
        });
      }
    });
  }

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      exportedAt: new Date().toISOString(),
      totalFeatures: features.length,
      villageCount: data.villages?.length || 0,
      peopleGroupCount: data.peopleGroups?.length || 0,
    },
  };
};

/**
 * Convert data to KML format
 */
const toKML = (data, options = {}) => {
  const { includeVillages = true, includePeopleGroups = true, documentName = 'Everywhere Export' } = options;

  // Status color mapping for KML
  const statusColors = {
    'pioneer': 'ff0000ff',      // Blue (AABBGGRR format)
    'mid-journey': 'ff00a5ff',  // Orange
    'tipping-point': 'ff00ff00', // Green
    'movement': 'ff0000ff',     // Red
    'unreached': 'ff808080',    // Gray
    'in-progress': 'ff00ffff',  // Yellow
    'church-planted': 'ff00ff00', // Green
    'multiplying': 'ffff00ff',  // Magenta
  };

  let placemarks = '';

  // Add villages
  if (includeVillages && data.villages) {
    data.villages.forEach(village => {
      if (village.location?.coordinates) {
        const [lng, lat] = village.location.coordinates;
        const color = statusColors[village.status] || 'ff0000ff';
        
        placemarks += `
    <Placemark>
      <name>${escapeXml(village.name)}</name>
      <description><![CDATA[
        <p><strong>Type:</strong> Village</p>
        <p><strong>Status:</strong> ${village.status}</p>
        <p><strong>Population:</strong> ${village.population || 'N/A'}</p>
        <p><strong>Coverage:</strong> ${village.coveragePercentage || 0}%</p>
        <p><strong>Region:</strong> ${village.region || 'N/A'}</p>
        <p><strong>Country:</strong> ${village.country || 'N/A'}</p>
        ${village.description ? `<p><strong>Description:</strong> ${escapeXml(village.description)}</p>` : ''}
      ]]></description>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <scale>1.2</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`;

        // Add polygon if boundary exists
        if (village.boundary?.coordinates?.length > 0) {
          const ring = village.boundary.coordinates[0];
          const coords = ring.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
          
          placemarks += `
    <Placemark>
      <name>${escapeXml(village.name)} (Boundary)</name>
      <Style>
        <PolyStyle>
          <color>40${color.substring(2)}</color>
          <outline>1</outline>
        </PolyStyle>
        <LineStyle>
          <color>${color}</color>
          <width>2</width>
        </LineStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
        }
      }
    });
  }

  // Add people groups
  if (includePeopleGroups && data.peopleGroups) {
    data.peopleGroups.forEach(pg => {
      if (pg.location?.coordinates) {
        const [lng, lat] = pg.location.coordinates;
        const color = statusColors[pg.status] || 'ff0000ff';
        
        placemarks += `
    <Placemark>
      <name>${escapeXml(pg.name)}</name>
      <description><![CDATA[
        <p><strong>Type:</strong> People Group</p>
        <p><strong>Status:</strong> ${pg.status} (${pg.statusColor})</p>
        <p><strong>Progress:</strong> ${pg.progressPercentage || 0}%</p>
        <p><strong>Population:</strong> ${pg.population || 'N/A'}</p>
        <p><strong>Language:</strong> ${pg.language || 'N/A'}</p>
        <p><strong>Religion:</strong> ${pg.religion || 'N/A'}</p>
        <p><strong>Believers:</strong> ${pg.believersCount || 0}</p>
        <p><strong>Churches:</strong> ${pg.churchesCount || 0}</p>
        ${pg.description ? `<p><strong>Description:</strong> ${escapeXml(pg.description)}</p>` : ''}
      ]]></description>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <scale>1.0</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/shapes/target.png</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>`;
      }
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>
    <description>Exported from Everywhere on ${new Date().toISOString()}</description>
    ${placemarks}
  </Document>
</kml>`;
};

/**
 * Convert data to Excel-compatible CSV
 */
const toExcel = (data, options = {}) => {
  const { includeVillages = true, includePeopleGroups = true, format = 'csv' } = options;
  
  const rows = [];
  
  // Header row
  const headers = [
    'Type',
    'Name',
    'Status',
    'Latitude',
    'Longitude',
    'Population',
    'Progress %',
    'Language',
    'Religion',
    'Believers',
    'Churches',
    'Region',
    'Country',
    'Description',
    'Created At',
    'Updated At',
  ];
  
  rows.push(headers);

  // Add villages
  if (includeVillages && data.villages) {
    data.villages.forEach(village => {
      const [lng, lat] = village.location?.coordinates || [0, 0];
      rows.push([
        'Village',
        village.name,
        village.status,
        lat,
        lng,
        village.population || 0,
        village.coveragePercentage || 0,
        '',
        '',
        '',
        '',
        village.region || '',
        village.country || '',
        (village.description || '').replace(/[\n\r]/g, ' '),
        village.createdAt ? new Date(village.createdAt).toISOString() : '',
        village.updatedAt ? new Date(village.updatedAt).toISOString() : '',
      ]);
    });
  }

  // Add people groups
  if (includePeopleGroups && data.peopleGroups) {
    data.peopleGroups.forEach(pg => {
      const [lng, lat] = pg.location?.coordinates || [0, 0];
      rows.push([
        'People Group',
        pg.name,
        pg.status,
        lat,
        lng,
        pg.population || 0,
        pg.progressPercentage || 0,
        pg.language || '',
        pg.religion || '',
        pg.believersCount || 0,
        pg.churchesCount || 0,
        pg.region || '',
        pg.country || '',
        (pg.description || '').replace(/[\n\r]/g, ' '),
        pg.createdAt ? new Date(pg.createdAt).toISOString() : '',
        pg.updatedAt ? new Date(pg.updatedAt).toISOString() : '',
      ]);
    });
  }

  // Convert to CSV
  return rows.map(row => 
    row.map(cell => {
      const str = String(cell);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
};

/**
 * Escape XML special characters
 */
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

module.exports = {
  toGeoJSON,
  toKML,
  toExcel,
  escapeXml,
};
