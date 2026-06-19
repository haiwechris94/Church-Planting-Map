import { useEffect, useState } from 'react';
import { CircleMarker, Tooltip, LayerGroup } from 'react-leaflet';

/**
 * JoshuaProjectLayer - Affiche les peuples non atteints de Joshua Project sur la carte
 * 
 * @param {string} countryCode - Code pays ISO à 2 lettres (ex: 'CM' pour Cameroun)
 * @param {boolean} showLayer - Afficher ou masquer la couche
 * @param {string} filterStatus - Filtre optionnel par statut (ex: 'unreached')
 */
const JoshuaProjectLayer = ({ 
  countryCode = 'CM', 
  showLayer = true,
  filterStatus = 'unreached' 
}) => {
  const [unreachedGroups, setUnreachedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!showLayer || !countryCode) {
      return;
    }

    const fetchUnreachedGroups = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:5000/api/joshua-project/unreached/${countryCode}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setUnreachedGroups(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        console.error('Error fetching Joshua Project data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreachedGroups();
  }, [countryCode, showLayer]);

  // Ne rien afficher si la couche est désactivée
  if (!showLayer) {
    return null;
  }

  // Afficher un message de chargement (optionnel)
  if (loading) {
    return null; // Ou un spinner si vous voulez
  }

  // Afficher une erreur (optionnel)
  if (error) {
    console.error('Joshua Project Layer Error:', error);
    return null;
  }

  // Filtrer par statut si nécessaire
  const filteredGroups = filterStatus
    ? unreachedGroups.filter(group => group.status === filterStatus)
    : unreachedGroups;

  return (
    <LayerGroup>
      {filteredGroups.map((group, index) => {
        // Vérifier que les coordonnées sont valides
        if (!group.latitude || !group.longitude) {
          return null;
        }

        const position = [group.latitude, group.longitude];

        return (
          <CircleMarker
            key={`jp-${index}-${group.name}`}
            center={position}
            radius={2}
            pathOptions={{
              color: '#dc2626',      // Rouge foncé pour le contour
              fillColor: '#ef4444',  // Rouge vif pour le remplissage
              fillOpacity: 0.8,
              weight: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                <strong>{group.name}</strong>
                <br />
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  Unreached
                </span>
                {group.population && (
                  <>
                    <br />
                    Population: {group.population.toLocaleString()}
                  </>
                )}
                {group.language && (
                  <>
                    <br />
                    Langue: {group.language}
                  </>
                )}
                <br />
                <em style={{ fontSize: '10px', color: '#666' }}>
                  Source: {group.source}
                </em>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
};

export default JoshuaProjectLayer;
