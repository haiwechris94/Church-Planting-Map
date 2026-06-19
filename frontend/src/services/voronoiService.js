import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch Voronoi diagram from API
 */
export const fetchVoronoiDiagram = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/voronoi`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Voronoi diagram:', error);
    throw error;
  }
};

/**
 * Generate Voronoi diagram from custom points
 * @param {Array} points - Array of [lng, lat] coordinates
 * @param {Array} bounds - Optional bounds [minLng, minLat, maxLng, maxLat]
 */
export const generateCustomVoronoi = async (points, bounds = null) => {
  try {
    const response = await axios.post(`${API_URL}/api/voronoi/custom`, {
      points,
      bounds
    });
    return response.data;
  } catch (error) {
    console.error('Error generating custom Voronoi:', error);
    throw error;
  }
};

export default {
  fetchVoronoiDiagram,
  generateCustomVoronoi
};
