/**
 * usePeoples Hook
 * Custom hook for managing peoples state and API interactions
 */
import { useState, useCallback, useEffect } from 'react'
import { peoplesApi } from '../services/peoplesApi'

/**
 * usePeoples - Hook for fetching and managing peoples data
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Whether to fetch on mount (default: false)
 * @param {Object} options.initialFilters - Initial filter values
 * @returns {Object} Peoples state and methods
 */
export const usePeoples = (options = {}) => {
  const { autoFetch = false, initialFilters = {} } = options

  const [peoples, setPeoples] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  })
  const [filters, setFilters] = useState(initialFilters)

  // Fetch peoples with current filters
  const fetchPeoples = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)

    try {
      const response = await peoplesApi.getAll({
        ...filters,
        ...params,
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
      })

      setPeoples(response.data.peoples || [])
      setPagination(response.data.pagination || pagination)
    } catch (err) {
      console.error('Error fetching peoples:', err)
      setError(err.response?.data?.message || 'Failed to fetch peoples')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  // Fetch on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchPeoples()
    }
  }, [autoFetch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update filters and refetch
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }, [])

  // Change page
  const changePage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }))
    fetchPeoples({ page })
  }, [fetchPeoples])

  // Add a new people to the list
  const addPeople = useCallback((people) => {
    setPeoples(prev => [people, ...prev])
    setPagination(prev => ({ ...prev, total: prev.total + 1 }))
  }, [])

  // Update a people in the list
  const updatePeople = useCallback((id, updatedPeople) => {
    setPeoples(prev => prev.map(p => p._id === id ? { ...p, ...updatedPeople } : p))
  }, [])

  // Remove a people from the list
  const removePeople = useCallback((id) => {
    setPeoples(prev => prev.filter(p => p._id !== id))
    setPagination(prev => ({ ...prev, total: prev.total - 1 }))
  }, [])

  // Clear all data
  const clear = useCallback(() => {
    setPeoples([])
    setError(null)
    setPagination({ total: 0, page: 1, limit: 50, pages: 0 })
  }, [])

  return {
    peoples,
    loading,
    error,
    pagination,
    filters,
    fetchPeoples,
    updateFilters,
    changePage,
    addPeople,
    updatePeople,
    removePeople,
    clear,
    refetch: fetchPeoples,
  }
}

/**
 * usePeoplesByPolygon - Hook for fetching peoples by polygon ID
 * @param {string} polygonId - The polygon ID or village name
 * @returns {Object} Peoples data for the polygon
 */
export const usePeoplesByPolygon = (polygonId) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!polygonId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await peoplesApi.getByPolygon(polygonId)
      setData(response.data)
    } catch (err) {
      console.error('Error fetching peoples by polygon:', err)
      setError(err.response?.data?.message || 'Failed to fetch population data')
    } finally {
      setLoading(false)
    }
  }, [polygonId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    peoples: data?.peoples || [],
    totals: data?.totals || {},
    count: data?.count || 0,
    loading,
    error,
    refetch: fetchData,
  }
}

/**
 * usePeopleStats - Hook for fetching population statistics
 * @param {Object} filters - Filter parameters
 * @returns {Object} Population statistics
 */
export const usePeopleStats = (filters = {}) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await peoplesApi.getStats(filters)
      setStats(response.data)
    } catch (err) {
      console.error('Error fetching people stats:', err)
      setError(err.response?.data?.message || 'Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    byRegion: stats?.byRegion || [],
    byStatus: stats?.byStatus || [],
    totals: stats?.totals || {},
    loading,
    error,
    refetch: fetchStats,
  }
}

export default usePeoples
