/**
 * EXEMPLE D'UTILISATION - JoshuaProjectLayer
 * 
 * Ce fichier montre comment intégrer la couche Joshua Project dans votre carte Leaflet.
 * Copiez le code ci-dessous dans votre composant ChurchMap.jsx ou tout autre composant de carte.
 */

import { MapContainer, TileLayer } from 'react-leaflet';
import JoshuaProjectLayer from './JoshuaProjectLayer';
import { useState } from 'react';

const ExampleMapWithJoshuaProject = () => {
  // État pour contrôler l'affichage de la couche
  const [showJPLayer, setShowJPLayer] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('CM'); // Cameroun par défaut

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Contrôles pour activer/désactiver la couche */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Joshua Project
        </h3>
        
        {/* Toggle pour afficher/masquer */}
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showJPLayer}
            onChange={(e) => setShowJPLayer(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '13px' }}>Afficher peuples non atteints</span>
        </label>

        {/* Sélecteur de pays */}
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
            Pays:
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{
              width: '100%',
              padding: '5px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            <option value="CM">Cameroun (CM)</option>
            <option value="BF">Burkina Faso (BF)</option>
            <option value="NE">Niger (NE)</option>
            <option value="TD">Tchad (TD)</option>
            <option value="ML">Mali (ML)</option>
            <option value="NG">Nigeria (NG)</option>
            <option value="CI">Côte d'Ivoire (CI)</option>
            <option value="SN">Sénégal (SN)</option>
          </select>
        </div>

        {/* Légende */}
        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              marginRight: '8px',
              border: '1px solid #dc2626'
            }}></div>
            <span>Peuple non atteint</span>
          </div>
        </div>
      </div>

      {/* Carte Leaflet */}
      <MapContainer
        center={[7.3697, 12.3547]} // Centre du Cameroun
        zoom={6}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Fond de carte OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Couche Joshua Project - Peuples non atteints */}
        <JoshuaProjectLayer
          countryCode={selectedCountry}
          showLayer={showJPLayer}
          filterStatus="unreached"
        />

        {/* Ajoutez ici vos autres couches (villages, églises, etc.) */}
      </MapContainer>
    </div>
  );
};

export default ExampleMapWithJoshuaProject;


/**
 * INTÉGRATION DANS UN COMPOSANT EXISTANT
 * ======================================
 * 
 * Si vous avez déjà un composant ChurchMap.jsx, ajoutez simplement :
 * 
 * 1. Import du composant :
 *    import JoshuaProjectLayer from './JoshuaProjectLayer';
 * 
 * 2. État pour contrôler l'affichage :
 *    const [showJPLayer, setShowJPLayer] = useState(true);
 * 
 * 3. Dans votre MapContainer, ajoutez :
 *    <JoshuaProjectLayer 
 *      countryCode="CM" 
 *      showLayer={showJPLayer}
 *      filterStatus="unreached"
 *    />
 * 
 * 4. Ajoutez un bouton de contrôle dans votre UI :
 *    <button onClick={() => setShowJPLayer(!showJPLayer)}>
 *      {showJPLayer ? 'Masquer' : 'Afficher'} Joshua Project
 *    </button>
 */


/**
 * PERSONNALISATION
 * ================
 * 
 * Vous pouvez personnaliser l'apparence des marqueurs dans JoshuaProjectLayer.jsx :
 * 
 * - Taille des points : Modifiez la propriété `radius` du CircleMarker
 * - Couleur : Changez `color` et `fillColor` dans pathOptions
 * - Opacité : Ajustez `fillOpacity`
 * - Contenu du tooltip : Modifiez le contenu dans la balise <Tooltip>
 * 
 * Exemple pour des points plus petits et discrets :
 * 
 *   <CircleMarker
 *     radius={3}  // Plus petit
 *     pathOptions={{
 *       color: '#dc2626',
 *       fillColor: '#ef4444',
 *       fillOpacity: 0.6,  // Plus transparent
 *       weight: 1,
 *     }}
 *   />
 */
