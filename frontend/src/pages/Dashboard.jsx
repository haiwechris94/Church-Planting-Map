import { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { statsApi, villagesApi, activitiesApi, peopleGroupsApi, dashboardApi } from '../services/api'
import { useLanguage } from '../i18n'
import { initSocket, getSocket, subscribeToPeopleGroupUpdates, subscribeToVillageStatusUpdates } from '../services/socket'
import {
  Home,
  Church,
  Activity,
  MapPin,
  Calendar,
  Globe,
  Target,
  BarChart3,
} from 'lucide-react'
import PeopleGroupsList from '../components/Dashboard/PeopleGroupsList'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

// Simplified engagement status labels (default English fallback - used when t() unavailable)
const engagementStatusLabels = {
  unreached: 'Not Started',
  pioneer: 'Starting',
  midway: 'Growing',
  'tipping-point': 'Expanding',
  dmm: 'Movement',
}

// DMM Engagement status colors - NEW COLOR SYSTEM
const engagementStatusColors = {
  unreached: '#ef4444',     // Red
  pioneer: '#f97316',       // Orange
  midway: '#eab308',        // Yellow
  'tipping-point': '#22c55e', // Light Green
  dmm: '#15803d',           // Dark Green
}

// Status badge component for consistent styling
const StatusBadge = ({ status, count }) => {
  const colorClasses = {
    unreached: 'bg-red-100 text-red-700',
    pioneer: 'bg-orange-100 text-orange-700',
    midway: 'bg-yellow-100 text-yellow-700',
    'tipping-point': 'bg-emerald-100 text-emerald-700',
    dmm: 'bg-green-100 text-green-700',
  }
  
  if (!count || count === 0) return null
  
  return (
    <span className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-semibold ${colorClasses[status] || 'bg-gray-100 text-gray-700'}`}>
      {count}
    </span>
  )
}

// People Group Status Badge (single item)
const PeopleGroupStatusBadge = ({ status }) => {
  const { t } = useLanguage()
  const colorClasses = {
    unreached: 'bg-red-100 text-red-700 border-red-200',
    pioneer: 'bg-orange-100 text-orange-700 border-orange-200',
    midway: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'tipping-point': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dmm: 'bg-green-100 text-green-700 border-green-200',
  }
  
  const labels = {
    unreached: t('dashboard.unreached'),
    pioneer: t('dashboard.pioneer'),
    midway: t('dashboard.midway'),
    'tipping-point': t('dashboard.tippingPoint'),
    dmm: 'DMM',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClasses[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {labels[status] || status || 'Unknown'}
    </span>
  )
}


const Dashboard = () => {
  const { t, isFrench } = useLanguage()
  const dateLocale = isFrench ? fr : enUS
  const queryClient = useQueryClient()
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET.IO REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[Dashboard] Setting up Socket.IO listeners for real-time updates')
    
    // Initialize socket if not already connected
    const token = localStorage.getItem('token')
    initSocket(token)
    
    // Subscribe to people group updates
    const unsubscribePeopleGroups = subscribeToPeopleGroupUpdates((event) => {
      console.log('[Dashboard] 📊 People group update received:', event.type)
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['peopleGroups'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardKPI'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStatusDistribution'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardCoverage'] })
      queryClient.invalidateQueries({ queryKey: ['villages'] })
    })
    
    // Subscribe to village status updates
    const unsubscribeVillageStatus = subscribeToVillageStatusUpdates((data) => {
      console.log('[Dashboard] 🏘️ Village status update received:', data?.villageName)
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['villages'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    })
    
    // Also listen for direct socket events for village and people group changes
    const socket = getSocket()
    if (socket) {
      // Listen for village created/updated/deleted events
      const handleVillageChange = (data) => {
        console.log('[Dashboard] 🏘️ Village change event:', data)
        queryClient.invalidateQueries({ queryKey: ['villages'] })
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      }
      
      socket.on('village-created', handleVillageChange)
      socket.on('village-updated', handleVillageChange)
      socket.on('village-deleted', handleVillageChange)
      
      // Listen for activity events
      const handleActivityChange = (data) => {
        console.log('[Dashboard] 📝 Activity change event:', data)
        queryClient.invalidateQueries({ queryKey: ['recentActivities'] })
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      }
      
      socket.on('activity-created', handleActivityChange)
      socket.on('activity-updated', handleActivityChange)
    }
    
    // Cleanup on unmount
    return () => {
      console.log('[Dashboard] Cleaning up Socket.IO listeners')
      unsubscribePeopleGroups()
      unsubscribeVillageStatus()
      
      if (socket) {
        socket.off('village-created')
        socket.off('village-updated')
        socket.off('village-deleted')
        socket.off('activity-created')
        socket.off('activity-updated')
      }
    }
  }, [queryClient])

  // Fetch dashboard stats with auto-refresh
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      try {
        const response = await statsApi.getDashboard()
        return response.data
      } catch (error) {
        // Return mock data if API not available
        return {
          totalVillages: 0,
          totalChurches: 0,
          totalActivities: 0,
          totalUsers: 0,
          villagesByStatus: [],
          recentActivities: [],
          monthlyProgress: [],
        }
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch KPI summary with auto-refresh
  const { data: kpiSummary, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboardKPI'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getKPISummary({ includeJoshuaProject: true })
        return response.data
      } catch (error) {
        console.error('[Dashboard] Error fetching KPI summary:', error)
        return null
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch status distribution with auto-refresh
  const { data: statusDistribution, isLoading: statusDistLoading } = useQuery({
    queryKey: ['dashboardStatusDistribution'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getStatusDistribution({ includeJoshuaProject: true })
        return response.data
      } catch (error) {
        console.error('[Dashboard] Error fetching status distribution:', error)
        return null
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch coverage gauge with auto-refresh
  const { data: coverageGauge, isLoading: coverageLoading } = useQuery({
    queryKey: ['dashboardCoverage'],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getCoverageGauge({ includeJoshuaProject: true })
        return response.data
      } catch (error) {
        console.error('[Dashboard] Error fetching coverage gauge:', error)
        return null
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })
  
  const [paginationProgress, setPaginationProgress] = useState(null)

  // Fetch ALL people groups data (no source filter) with auto-refresh
  // PERFORMANCE OPTIMIZATION: Using getAllPaginated() which excludes geometry data by default.
  const { data: peopleGroupsData, isLoading: peopleLoading } = useQuery({
    queryKey: ['peopleGroups', 'dashboard', 'all'],
    queryFn: async () => {
      try {
        console.log('[Dashboard] Fetching ALL people groups from ALL sources...')
        // getAllPaginated() fetches all pages automatically - no source filter
        const allData = await peopleGroupsApi.getAllPaginated({}, {
          onProgress: (progress) => {
            setPaginationProgress(progress)
            console.log(`[Dashboard] Pagination progress: Page ${progress.page}/${progress.totalPages}, ${progress.recordsFetched}/${progress.totalCount} records`)
          }
        })
        setPaginationProgress(null)
        return allData || []
      } catch (error) {
        console.error('[Dashboard] Error fetching people groups:', error)
        setPaginationProgress(null)
        return []
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch villages data with auto-refresh
  const { data: villagesData, isLoading: villagesLoading } = useQuery({
    queryKey: ['villages'],
    queryFn: async () => {
      try {
        const response = await villagesApi.getAll()
        return response.data.villages || response.data || []
      } catch (error) {
        return []
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch recent activities with auto-refresh
  const { data: recentActivities } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      try {
        const response = await activitiesApi.getAll({ limit: 5, sort: '-date' })
        return response.data.activities || []
      } catch (error) {
        return []
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Calculate people groups statistics
  const peopleGroups = peopleGroupsData || []
  const peopleStats = useMemo(() => ({
    total: peopleGroups.length,
    unreached: peopleGroups.filter(p => p.engagementStatus === 'unreached').length,
    pioneer: peopleGroups.filter(p => p.engagementStatus === 'pioneer').length,
    midway: peopleGroups.filter(p => p.engagementStatus === 'midway').length,
    tippingPoint: peopleGroups.filter(p => p.engagementStatus === 'tipping-point').length,
    dmm: peopleGroups.filter(p => p.engagementStatus === 'dmm').length,
    totalChurches: peopleGroups.reduce((sum, p) => sum + (p.numberOfChurches || 0), 0),
    withCoordinates: peopleGroups.filter(p => p?.location?.coordinates?.length >= 2).length,
  }), [peopleGroups])

  // Calculate people groups by country with full data
  const { peopleGroupsByCountry, countryDataList, peopleGroupsByCountryList } = useMemo(() => {
    const byCountry = {}
    const byCountryList = {}
    
    peopleGroups.forEach(pg => {
      const country = pg.country || 'Unknown'
      
      if (!byCountry[country]) {
        byCountry[country] = {
          total: 0,
          unreached: 0,
          pioneer: 0,
          midway: 0,
          tippingPoint: 0,
          dmm: 0,
          churches: 0,
        }
        byCountryList[country] = []
      }
      
      byCountry[country].total++
      byCountry[country].churches += pg.numberOfChurches || 0
      byCountryList[country].push(pg)
      
      if (pg.engagementStatus === 'unreached') byCountry[country].unreached++
      else if (pg.engagementStatus === 'pioneer') byCountry[country].pioneer++
      else if (pg.engagementStatus === 'midway') byCountry[country].midway++
      else if (pg.engagementStatus === 'tipping-point') byCountry[country].tippingPoint++
      else if (pg.engagementStatus === 'dmm') byCountry[country].dmm++
    })
    
    // Convert to sorted array (by total count descending)
    const dataList = Object.entries(byCountry)
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.total - a.total)
    
    return {
      peopleGroupsByCountry: byCountry,
      countryDataList: dataList,
      peopleGroupsByCountryList: byCountryList,
    }
  }, [peopleGroups])

  // Calculate villages statistics
  const villages = villagesData || []
  const villageStats = useMemo(() => ({
    total: villages.length,
    byStatus: {
      pioneer: villages.filter(v => v.status === 'pioneer').length,
      midway: villages.filter(v => v.status === 'midway').length,
      tippingPoint: villages.filter(v => v.status === 'tipping-point').length,
      dmm: villages.filter(v => v.status === 'dmm').length,
      unreached: villages.filter(v => v.status === 'unreached').length,
      inProgress: villages.filter(v => v.status === 'in-progress').length,
      churchPlanted: villages.filter(v => v.status === 'church-planted').length,
      multiplying: villages.filter(v => v.status === 'multiplying').length,
    },
    totalPopulation: villages.reduce((sum, v) => sum + (v.population || 0), 0),
  }), [villages])

  // Prepare engagement status data for pie chart
  const engagementStatusData = useMemo(() => [
    { status: 'unreached', count: peopleStats.unreached, label: t('dashboard.notStarted') || engagementStatusLabels.unreached },
    { status: 'pioneer', count: peopleStats.pioneer, label: t('dashboard.starting') || engagementStatusLabels.pioneer },
    { status: 'midway', count: peopleStats.midway, label: t('dashboard.growing') || engagementStatusLabels.midway },
    { status: 'tipping-point', count: peopleStats.tippingPoint, label: t('dashboard.expanding') || engagementStatusLabels['tipping-point'] },
    { status: 'dmm', count: peopleStats.dmm, label: t('dashboard.movement') || engagementStatusLabels.dmm },
  ].filter(item => item.count > 0), [peopleStats, t])

  // Prepare comparison data for bar chart
  const comparisonData = useMemo(() => [
    { name: t('dashboard.unreached'), peopleGroups: peopleStats.unreached, villages: villageStats.byStatus.unreached || 0 },
    { name: t('dashboard.pioneer'), peopleGroups: peopleStats.pioneer, villages: villageStats.byStatus.pioneer },
    { name: t('dashboard.midway'), peopleGroups: peopleStats.midway, villages: villageStats.byStatus.midway },
    { name: t('dashboard.tippingPoint'), peopleGroups: peopleStats.tippingPoint, villages: villageStats.byStatus.tippingPoint },
    { name: t('dashboard.dmmReached'), peopleGroups: peopleStats.dmm, villages: villageStats.byStatus.dmm },
  ], [peopleStats, villageStats, t])

  // Status colors
  const statusColors = {
    'pas-d-information': '#9ca3af',
    unreached: '#ef4444',
    'in-progress': '#f59e0b',
    'church-planted': '#22c55e',
    multiplying: '#0ea5e9',
    pioneer: '#f97316',
    midway: '#eab308',
    'tipping-point': '#22c55e',
    dmm: '#15803d',
  }

  const statusLabels = {
    unreached: t('status.unreached'),
    'in-progress': t('status.inProgress'),
    'church-planted': t('status.churchPlanted'),
    multiplying: t('status.multiplying'),
    pioneer: t('dashboard.pioneer'),
    midway: t('dashboard.midway'),
    'tipping-point': t('dashboard.tippingPoint'),
    dmm: t('dashboard.dmmReached'),
  }

  const statCards = [
    {
      title: t('dashboard.peopleGroups'),
      value: peopleStats.total,
      icon: Globe,
      color: 'bg-indigo-500',
      subtitle: `${peopleStats.withCoordinates} ${t('dashboard.mapped')}`,
    },
    {
      title: t('dashboard.villages'),
      value: villageStats.total,
      icon: Home,
      color: 'bg-blue-500',
      subtitle: `${t('dashboard.population')}: ${villageStats.totalPopulation.toLocaleString()}`,
    },
    {
      title: t('dashboard.activities'),
      value: stats?.totalActivities || 0,
      icon: Activity,
      color: 'bg-purple-500',
      subtitle: t('dashboard.recorded'),
    },
  ]

  const isLoading = statsLoading || peopleLoading || villagesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background Logo Watermark */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'url(/data/Everywhere Logo_Mark & Title_Black.png)',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '50%',
          filter: 'blur(2px)',
        }}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          {paginationProgress && (
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded">
              {t('dashboard.loading')}: {paginationProgress.recordsFetched}/{paginationProgress.totalCount}
            </span>
          )}
          <p className="text-gray-500 text-sm">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: dateLocale })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {stat.value}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {stat.subtitle}
                </p>
              </div>
              <div className={`${stat.color} p-4 rounded-xl shadow-sm`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DMM Engagement Status Cards */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 relative z-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 drop-shadow">
          <Target size={20} className="text-primary-600" />
          {t('dashboard.engagementStatus')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-red-50 rounded-xl p-5 text-center border border-red-100 hover:border-red-200 transition-colors">
            <p className="text-4xl font-bold text-red-600 mb-1">{peopleStats.unreached}</p>
            <p className="text-sm text-red-700 font-semibold">{t('dashboard.unreached')}</p>
            <p className="text-xs text-red-500 mt-2">0 {t('dashboard.churchesUnit')}, 0 {t('dashboard.generationAbbr')}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-5 text-center border border-orange-100 hover:border-orange-200 transition-colors">
            <p className="text-4xl font-bold text-orange-600 mb-1">{peopleStats.pioneer}</p>
            <p className="text-sm text-orange-700 font-semibold">{t('dashboard.pioneer')}</p>
            <p className="text-xs text-orange-500 mt-2">1-33 {t('dashboard.churchesUnit')}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-5 text-center border border-yellow-100 hover:border-yellow-200 transition-colors">
            <p className="text-4xl font-bold text-yellow-600 mb-1">{peopleStats.midway}</p>
            <p className="text-sm text-yellow-700 font-semibold">{t('dashboard.midway')}</p>
            <p className="text-xs text-yellow-500 mt-2">34-66 {t('dashboard.churchesUnit')}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-5 text-center border border-emerald-100 hover:border-emerald-200 transition-colors">
            <p className="text-4xl font-bold text-emerald-600 mb-1">{peopleStats.tippingPoint}</p>
            <p className="text-sm text-emerald-700 font-semibold">{t('dashboard.tippingPoint')}</p>
            <p className="text-xs text-emerald-500 mt-2">67-99 {t('dashboard.churchesUnit')}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-5 text-center border border-green-100 hover:border-green-200 transition-colors">
            <p className="text-4xl font-bold text-green-700 mb-1">{peopleStats.dmm}</p>
            <p className="text-sm text-green-800 font-semibold">{t('dashboard.dmmReached')}</p>
            <p className="text-xs text-green-600 mt-2">100+ {t('dashboard.churchesUnit')} & 4+ {t('dashboard.generationAbbr')}</p>
          </div>
        </div>
      </div>

      {/* Village Coverage — 3 widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">

        {/* WIDGET 1 — Statut des villages */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Home size={18} className="text-primary-600" />
            {t('dashboard.villagesStatus')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4 text-center border border-red-100 bg-red-50">
              <p className="text-xs font-semibold text-red-600 mb-1">{t('dashboard.notReached')}</p>
              <p className="text-3xl font-bold text-red-600">
                {kpiSummary?.villageStatusCounts?.unreached
                  ?? coverageGauge?.villageStatusCounts?.unreached
                  ?? villageStats?.byStatus?.unreached
                  ?? statusDistribution?.villages?.find(v => v.status === 'unreached')?.count
                  ?? '—'}
              </p>
            </div>
            <div className="rounded-xl p-4 text-center border border-green-100 bg-green-50">
              <p className="text-xs font-semibold text-green-700 mb-1">{t('dashboard.movement')}</p>
              <p className="text-3xl font-bold text-green-700">
                {kpiSummary?.villageStatusCounts?.dmm
                  ?? coverageGauge?.villageStatusCounts?.dmm
                  ?? villageStats?.byStatus?.dmm
                  ?? statusDistribution?.villages?.find(v => v.status === 'dmm')?.count
                  ?? '—'}
              </p>
            </div>
            <div className="rounded-xl p-4 text-center border border-yellow-100 bg-yellow-50">
              <p className="text-xs font-semibold text-yellow-600 mb-1">{t('dashboard.inProgress')}</p>
              <p className="text-3xl font-bold text-yellow-600">
                {kpiSummary?.villageStatusCounts
                  ? (kpiSummary.villageStatusCounts.pioneer || 0)
                    + (kpiSummary.villageStatusCounts.midway || 0)
                    + (kpiSummary.villageStatusCounts['tipping-point'] || 0)
                  : coverageGauge?.villageStatusCounts
                    ? (coverageGauge.villageStatusCounts.pioneer || 0)
                      + (coverageGauge.villageStatusCounts.midway || 0)
                      + (coverageGauge.villageStatusCounts['tipping-point'] || 0)
                    : villageStats?.byStatus
                      ? (villageStats.byStatus.pioneer || 0)
                        + (villageStats.byStatus.midway || 0)
                        + (villageStats.byStatus.tippingPoint || 0)
                      : coverageGauge?.villageCoverage?.withData ?? '—'}
              </p>
              <p className="text-xs text-yellow-500 mt-1">{t('dashboard.withData')}</p>
            </div>
            <div className="rounded-xl p-4 text-center border border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-1">{t('dashboard.withoutData')}</p>
              <p className="text-3xl font-bold text-gray-500">
                {coverageGauge?.villageCoverage?.withoutData
                  ?? kpiSummary?.villageStatusCounts?.noData
                  ?? (coverageGauge?.totalVillages != null && coverageGauge?.villagesWithData != null
                    ? Math.max(coverageGauge.totalVillages - coverageGauge.villagesWithData, 0)
                    : null)
                  ?? (kpiSummary?.totalVillages != null && kpiSummary?.villagesWithData != null
                    ? Math.max(kpiSummary.totalVillages - kpiSummary.villagesWithData, 0)
                    : null)
                  ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* WIDGET 2 — Donut villages avec données DMM */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            {t('dashboard.villagesWithDmmData')}
          </h3>
          {(() => {
            const raw = statusDistribution?.villages
              || (kpiSummary?.villageStatusCounts
                ? Object.entries(kpiSummary.villageStatusCounts)
                    .filter(([k]) => k !== 'noData')
                    .map(([status, count]) => ({ status, count }))
                : null)
              || (coverageGauge?.villageStatusCounts
                ? Object.entries(coverageGauge.villageStatusCounts)
                    .filter(([k]) => k !== 'noData')
                    .map(([status, count]) => ({ status, count }))
                : null)
              || (villageStats?.total > 0
                ? [
                    { status: 'unreached',     count: villageStats.byStatus.unreached     || 0 },
                    { status: 'pioneer',       count: villageStats.byStatus.pioneer       || 0 },
                    { status: 'midway',        count: villageStats.byStatus.midway        || 0 },
                    { status: 'tipping-point', count: villageStats.byStatus.tippingPoint  || 0 },
                    { status: 'dmm',           count: villageStats.byStatus.dmm           || 0 },
                  ]
                : null)
            const donutColors = {
              unreached: '#ef4444',
              pioneer: '#f97316',
              midway: '#eab308',
              'tipping-point': '#22c55e',
              dmm: '#15803d',
            }
            const donutLabels = {
              unreached: t('dashboard.notReached'),
              pioneer: t('dashboard.pioneer'),
              midway: t('dashboard.midway'),
              'tipping-point': t('dashboard.tippingPoint'),
              dmm: t('dashboard.movement'),
            }
            const total = raw?.reduce((s, d) => s + (d.count || 0), 0) || 0
            if (!raw || raw.length === 0) {
              return (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  {t('dashboard.noDataAvailable')}
                </div>
              )
            }
            return (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={raw}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {raw.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={donutColors[entry.status] || '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, props) => [value, donutLabels[props.payload?.status] || props.payload?.status]}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-800">{total}</p>
                      <p className="text-xs text-gray-400">{t('dashboard.villagesUnit')}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 mt-2">
                  {raw.filter(d => d.count > 0).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: donutColors[item.status] || '#9ca3af' }} />
                        <span className="text-gray-600">{donutLabels[item.status] || item.status}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>

        {/* WIDGET 3 — Gauge couverture villages */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            {t('dashboard.villageCoverageTitle')}
          </h3>
          {(() => {
            const withData = coverageGauge?.villageCoverage?.withData
              ?? coverageGauge?.villagesWithData
              ?? kpiSummary?.villageCoverage?.withData
              ?? kpiSummary?.villagesWithData
              ?? 0
            const total    = coverageGauge?.villageCoverage?.total
              ?? coverageGauge?.totalVillages
              ?? kpiSummary?.villageCoverage?.total
              ?? kpiSummary?.totalVillages
              ?? villageStats.total
              ?? 0
            const pct      = total > 0 ? ((withData / total) * 100).toFixed(1) : '0.0'
            const gaugeVal = parseFloat(pct)
            const filled   = (gaugeVal / 100) * 180
            const gaugeData = [
              { value: filled,         fill: '#0ea5e9' },
              { value: 180 - filled,   fill: '#e5e7eb' },
              { value: 180,            fill: 'transparent' },
            ]
            return (
              <>
                <div className="relative" style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%"
                        cy="85%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        isAnimationActive={true}
                      >
                        {gaugeData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} strokeWidth={0} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-sky-600">{pct}%</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.villagesEngaged')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{total.toLocaleString('fr-FR')}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                      {withData.toLocaleString('fr-FR')} {t('dashboard.withData')}
                    </span>
                    <span className="text-gray-400">{t('dashboard.of')} {total.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(gaugeVal, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">{t('dashboard.target100')}</span>
                  <span className="font-semibold text-gray-600">{(total - withData).toLocaleString('fr-FR')} {t('dashboard.remaining')}</span>
                </div>
              </>
            )
          })()}
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 drop-shadow">
            <BarChart3 size={20} className="text-primary-600" />
            {t('dashboard.statusComparison')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
              <Legend />
              <Bar dataKey="peopleGroups" name={t('dashboard.peopleGroups')} fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="villages" name={t('dashboard.villages')} fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* People Groups Status Pie Chart */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 drop-shadow">
            {t('dashboard.peopleGroupStatus')}
          </h3>
          {engagementStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={engagementStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {engagementStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={engagementStatusColors[entry.status]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                {engagementStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: engagementStatusColors[item.status] }}
                      ></div>
                      <span className="text-gray-700 font-medium">{item.label}</span>
                    </div>
                    <span className="font-bold text-gray-800">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <p>{t('dashboard.noPeopleGroupsData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Village Status Summary */}
      {villageStats.total > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2 drop-shadow">
            <Home size={20} className="text-primary-600" />
            {t('dashboard.villageStatusSummary')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(villageStats.byStatus).map(([status, count]) => (
              count > 0 && (
                <div key={status} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                  <div
                    className="w-5 h-5 rounded-full mx-auto mb-3 shadow-sm"
                    style={{ backgroundColor: statusColors[status] || '#9ca3af' }}
                  ></div>
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                  <p className="text-xs text-gray-500 capitalize mt-1">{statusLabels[status] || status}</p>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* People Groups List */}
      <div className="relative z-10">
        <PeopleGroupsList peopleGroups={peopleGroups} />
      </div>

      {/* Recent Activities */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 relative z-10">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 drop-shadow">
          {t('dashboard.recentActivities')}
        </h3>
        {recentActivities && recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="p-3 bg-primary-100 rounded-xl">
                  <Activity size={20} className="text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{activity.type}</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(activity.date), 'dd/MM/yyyy')}
                    </span>
                    {activity.village && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {activity.village.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Activity size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-gray-400">{t('dashboard.noRecentActivities')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard