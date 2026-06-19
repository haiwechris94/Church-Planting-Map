import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { searchApi } from '../services/api'
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  Percent,
  Map as MapIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../i18n'

/**
 * AdvancedSearch Component
 * Provides proximity search with fuzzy name matching and suggestions
 * 
 * @param {Object} props
 * @param {Function} props.onResultSelect - Callback when a result is selected
 * @param {Function} props.onViewOnMap - Callback to view a village on the map
 * @param {Function} props.onAddToResults - Callback to add suggestions to results
 * @param {Object} props.initialCenter - Initial center point {lat, lng}
 * @param {number} props.initialRadius - Initial search radius in meters
 */
const AdvancedSearch = ({
  onResultSelect,
  onViewOnMap,
  onAddToResults,
  initialCenter = null,
  initialRadius = 10000
}) => {
  const { t } = useLanguage()
  // Search form state
  const [searchParams, setSearchParams] = useState({
    name: '',
    lat: initialCenter?.lat || '',
    lng: initialCenter?.lng || '',
    radius: initialRadius
  })
  
  // Results state
  const [results, setResults] = useState([])
  const [suggestions, setSuggestions] = useState(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(true)
  
  // Proximity search mutation
  const searchMutation = useMutation({
    mutationFn: (params) => searchApi.proximitySearch(params),
    onSuccess: (response) => {
      const data = response.data
      setResults(data.results || [])
      
      if (data.hasSuggestions && data.suggestions) {
        setSuggestions(data.suggestions)
        setShowSuggestions(true)
        setSelectedSuggestions([])
      } else {
        setSuggestions(null)
      }
      
      if (data.results?.length > 0) {
        toast.success(`${data.results.length} village(s) trouvé(s)`)
      } else if (data.hasSuggestions) {
        toast(`Aucun résultat exact. ${data.suggestions.items.length} suggestion(s) disponible(s)`, {
          icon: '💡'
        })
      } else {
        toast.error('Aucun village trouvé dans cette zone')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la recherche')
      setResults([])
      setSuggestions(null)
    }
  })
  
  // Handle search form submission
  const handleSearch = useCallback((e) => {
    e?.preventDefault()
    
    if (!searchParams.lat || !searchParams.lng) {
      toast.error('Veuillez entrer les coordonnées du point central')
      return
    }
    
    searchMutation.mutate({
      lat: parseFloat(searchParams.lat),
      lng: parseFloat(searchParams.lng),
      radius: parseInt(searchParams.radius),
      name: searchParams.name || undefined,
      fuzzy: 'true'
    })
  }, [searchParams, searchMutation])
  
  // Handle suggestion selection toggle
  const toggleSuggestionSelection = useCallback((suggestion) => {
    setSelectedSuggestions(prev => {
      const isSelected = prev.some(s => s._id === suggestion._id)
      if (isSelected) {
        return prev.filter(s => s._id !== suggestion._id)
      }
      return [...prev, suggestion]
    })
  }, [])
  
  // Handle "Use this" button - populate form with suggestion
  const handleUseSuggestion = useCallback((suggestion) => {
    setSearchParams(prev => ({
      ...prev,
      name: suggestion.name,
      lat: suggestion.coordinates.lat,
      lng: suggestion.coordinates.lng
    }))
    toast.success(`Formulaire rempli avec "${suggestion.name}"`)
  }, [])
  
  // Handle adding selected suggestions to results
  const handleAddSelectedToResults = useCallback(() => {
    if (selectedSuggestions.length === 0) {
      toast.error('Veuillez sélectionner au moins une suggestion')
      return
    }
    
    if (onAddToResults) {
      onAddToResults(selectedSuggestions)
      toast.success(`${selectedSuggestions.length} village(s) ajouté(s) aux résultats`)
      setSelectedSuggestions([])
    }
  }, [selectedSuggestions, onAddToResults])
  
  // Get current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearchParams(prev => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        }))
        toast.success('Position actuelle récupérée')
      },
      (error) => {
        toast.error('Impossible de récupérer votre position')
        console.error('Geolocation error:', error)
      }
    )
  }, [])
  
  // Render similarity badge
  const renderSimilarityBadge = (similarity) => {
    let colorClass = 'bg-red-100 text-red-700'
    if (similarity >= 70) {
      colorClass = 'bg-green-100 text-green-700'
    } else if (similarity >= 50) {
      colorClass = 'bg-yellow-100 text-yellow-700'
    } else if (similarity >= 30) {
      colorClass = 'bg-orange-100 text-orange-700'
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        <Percent size={12} />
        {similarity}%
      </span>
    )
  }
  
  // Render similarity progress bar
  const renderSimilarityBar = (similarity) => {
    let barColor = 'bg-red-500'
    if (similarity >= 70) {
      barColor = 'bg-green-500'
    } else if (similarity >= 50) {
      barColor = 'bg-yellow-500'
    } else if (similarity >= 30) {
      barColor = 'bg-orange-500'
    }
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all duration-300`}
          style={{ width: `${similarity}%` }}
        />
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Search size={20} className="text-primary-600" />
          Recherche avancée par proximité
        </h3>
        
        {/* Village Name */}
        <div>
          <label className="form-label">Nom du village (optionnel)</label>
          <input
            type="text"
            value={searchParams.name}
            onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
            placeholder="Ex: Bafoussam, Douala..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Si aucun résultat exact, des suggestions de noms similaires seront proposées
          </p>
        </div>
        
        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Latitude *</label>
            <input
              type="number"
              step="any"
              value={searchParams.lat}
              onChange={(e) => setSearchParams(prev => ({ ...prev, lat: e.target.value }))}
              className="form-input"
              placeholder="Ex: 5.9631"
              required
            />
          </div>
          <div>
            <label className="form-label">Longitude *</label>
            <input
              type="number"
              step="any"
              value={searchParams.lng}
              onChange={(e) => setSearchParams(prev => ({ ...prev, lng: e.target.value }))}
              className="form-input"
              placeholder="Ex: 10.1591"
              required
            />
          </div>
        </div>
        
        {/* Get Current Location Button */}
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <Navigation size={14} />
          Utiliser ma position actuelle
        </button>
        
        {/* Radius */}
        <div>
          <label className="form-label">Rayon de recherche</label>
          <select
            value={searchParams.radius}
            onChange={(e) => setSearchParams(prev => ({ ...prev, radius: e.target.value }))}
            className="form-input"
          >
            <option value="5000">5 km</option>
            <option value="10000">10 km</option>
            <option value="20000">20 km</option>
            <option value="50000">50 km</option>
            <option value="100000">100 km</option>
          </select>
        </div>
        
        {/* Search Button */}
        <button
          type="submit"
          disabled={searchMutation.isPending}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          {searchMutation.isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search size={18} />
              Rechercher
            </>
          )}
        </button>
      </form>
      
      {/* Exact Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-600" />
            Résultats exacts ({results.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((village) => (
              <div
                key={village._id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onResultSelect?.(village)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{village.name}</p>
                    <p className="text-sm text-gray-500">
                      {village.region && `${village.region}, `}
                      {village.distanceFormatted}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewOnMap?.(village)
                    }}
                    className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Voir sur la carte"
                  >
                    <MapIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Suggestions Section */}
      {suggestions && (
        <div className="suggestions-container rounded-xl shadow-sm p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                Suggestions de villages similaires
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                {suggestions.message}
              </p>
            </div>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg"
            >
              {showSuggestions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          
          {showSuggestions && (
            <>
              {/* Selection Actions */}
              {selectedSuggestions.length > 0 && (
                <div className="mb-3 p-2 bg-amber-100 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-amber-800">
                    {selectedSuggestions.length} village(s) sélectionné(s)
                  </span>
                  <button
                    onClick={handleAddSelectedToResults}
                    className="btn-primary text-sm py-1 px-3 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Ajouter aux résultats
                  </button>
                </div>
              )}
              
              {/* Suggestions List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestions.items.map((suggestion) => {
                  const isSelected = selectedSuggestions.some(s => s._id === suggestion._id)
                  
                  return (
                    <div
                      key={suggestion._id}
                      className={`suggestion-card p-3 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-amber-100 border-2 border-amber-400' 
                          : 'bg-white border border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection Checkbox */}
                        <button
                          onClick={() => toggleSuggestionSelection(suggestion)}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-gray-300 hover:border-amber-400'
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={14} />}
                        </button>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-800">{suggestion.name}</p>
                            {renderSimilarityBadge(suggestion.similarity)}
                          </div>
                          
                          {/* Similarity Bar */}
                          <div className="w-32">
                            {renderSimilarityBar(suggestion.similarity)}
                          </div>
                          
                          {/* Details */}
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p className="flex items-center gap-1">
                              <Target size={12} />
                              Distance: {suggestion.distanceFormatted}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin size={12} />
                              {suggestion.coordinates.lat.toFixed(4)}, {suggestion.coordinates.lng.toFixed(4)}
                            </p>
                            {suggestion.region && (
                              <p className="text-gray-500">{suggestion.region}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleUseSuggestion(suggestion)}
                            className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                            title="Utiliser ce village"
                          >
                            Utiliser
                          </button>
                          <button
                            onClick={() => onViewOnMap?.(suggestion)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                            title="Voir sur la carte"
                          >
                            <Eye size={12} />
                            Carte
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Info about expanded radius */}
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertCircle size={12} />
                Recherche étendue dans un rayon de {(suggestions.expandedRadius / 1000).toFixed(0)} km
              </p>
            </>
          )}
        </div>
      )}
      
      {/* No Results Message */}
      {searchMutation.isSuccess && results.length === 0 && !suggestions && (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">Aucun village trouvé dans cette zone</p>
          <p className="text-sm text-gray-500 mt-1">
            Essayez d'augmenter le rayon de recherche ou de modifier les coordonnées
          </p>
        </div>
      )}
    </div>
  )
}

export default AdvancedSearch
