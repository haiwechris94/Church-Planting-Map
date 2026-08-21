/**
 * SourceDonutChart — Répartition des people groups par source de données.
 * Réutilise les people groups déjà chargés (prop `peopleGroups`) et la même
 * logique de source que PeopleGroupsList : pg.source || pg.dataSource.
 * Met en avant les nouvelles sources IMB (PeopleGroups.org) et Finishing the Task.
 */
import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Database } from 'lucide-react'
import { useLanguage } from '../../i18n'

// Source buckets — couleurs alignées sur les badges de PeopleGroupsList et
// les marqueurs de la carte (IMB emerald, FTT violet).
const SOURCE_CONFIG = [
  { key: 'DMM',                label: 'DMM',                   color: '#3b82f6', match: (s) => s === 'dmm' },
  { key: 'Survey',             label: 'Survey',                color: '#a855f7', match: (s) => s === 'survey' },
  { key: 'Joshua Project',     label: 'Joshua Project',        color: '#f59e0b', match: (s) => s === 'joshua project' || s === 'joshuaproject' },
  { key: 'PeopleGroups.org',   label: 'IMB / PeopleGroups.org', color: '#10b981', match: (s) => s === 'peoplegroups.org' || s === 'imb' },
  { key: 'Finishing the Task', label: 'Finishing the Task',    color: '#8b5cf6', match: (s) => s === 'finishing the task' || s === 'ftt' },
  { key: 'Manual',             label: 'Manuel / Autre',        color: '#9ca3af', match: () => false },
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white shadow-xl rounded-xl p-3 border border-slate-100 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
        <span className="font-semibold text-slate-800">{d.label}</span>
      </div>
      <p className="text-slate-500">Nombre : <span className="font-medium text-slate-700">{d.value}</span></p>
      <p className="text-slate-500">Part : <span className="font-medium text-slate-700">{d.pct}%</span></p>
    </div>
  )
}

const SourceDonutChart = ({ peopleGroups = [] }) => {
  const { t } = useLanguage()

  const { chartData, total } = useMemo(() => {
    const counts = {}
    SOURCE_CONFIG.forEach((c) => { counts[c.key] = 0 })

    peopleGroups.forEach((pg) => {
      const raw = pg.source || pg.dataSource
      if (!raw) { counts.Manual++; return }
      const s = String(raw).toLowerCase()
      const cfg = SOURCE_CONFIG.find((c) => c.match(s))
      counts[cfg ? cfg.key : 'Manual']++
    })

    const totalCount = peopleGroups.length
    const data = SOURCE_CONFIG
      .map((c) => ({
        key: c.key,
        label: c.label,
        value: counts[c.key] || 0,
        fill: c.color,
        pct: totalCount > 0 ? Math.round(((counts[c.key] || 0) / totalCount) * 100) : 0,
      }))
      .filter((d) => d.value > 0)

    return { chartData: data, total: totalCount }
  }, [peopleGroups])

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 relative z-10">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Database size={18} className="text-primary-600" />
          {t('dashboard.bySource') || 'Répartition par source'}
        </h3>
        <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
          {total} {t('dashboard.peopleGroups') || 'people groups'}
        </span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">
          {t('dashboard.noData') || 'Aucune donnée'}
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-100">
            {chartData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                <span className="text-xs text-slate-600 truncate">{item.label}</span>
                <span className="text-xs font-semibold text-slate-800 ml-auto">
                  {item.value} <span className="text-slate-400 font-normal">· {item.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SourceDonutChart
