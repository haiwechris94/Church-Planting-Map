import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Download, BarChart3, FileDown } from 'lucide-react'
import { reportingApi } from '../services/api'
import { useLanguage } from '../i18n'

/**
 * DmmReporting — Pilier ④ : tableau de bord & reporting.
 *
 * Restitue le format numérique de reporting Cityteam (disciples/baptisés,
 * groupes DBS, églises par génération, leaders en formation, coachs actifs)
 * pour un trimestre donné, avec export CSV.
 */

const now = new Date()
const CURRENT_YEAR = now.getUTCFullYear()
const CURRENT_QUARTER = Math.floor(now.getUTCMonth() / 3) + 1

function Stat({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value ?? 0}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  )
}

function toCsv(r) {
  if (!r) return ''
  const rows = [
    ['Rubrique', 'Valeur'],
    ['Période', `${r.period?.from || ''} → ${r.period?.to || ''}`],
    ['Nouveaux disciples', r.disciples?.newDisciples],
    ['Nouveaux baptisés', r.disciples?.baptized],
    ['Groupes DBS (total)', r.discoveryGroups?.total],
    ['Groupes DBS actifs', r.discoveryGroups?.active],
    ['Groupes devenus églises', r.discoveryGroups?.becameChurch],
    ['Églises (total actives)', r.churches?.total],
    ['Églises commissionnées', r.churches?.commissioned],
    ['Églises catalytiques', r.churches?.catalytic],
    ['Églises 1G', r.churches?.byGeneration?.['1']],
    ['Églises 2G', r.churches?.byGeneration?.['2']],
    ['Églises 3G', r.churches?.byGeneration?.['3']],
    ['Églises 4G+', r.churches?.byGeneration?.['4plus']],
    ['Églises fusionnées', r.churches?.mergedOrDied?.merged],
    ['Églises disparues', r.churches?.mergedOrDied?.died],
    ['Leaders en formation', r.leaders?.inTraining],
    ['Coachs actifs', r.leaders?.activeCoaches],
    ['Nouveaux leaders déployés', r.leaders?.newLeadersDeployed],
    ['Personnes de paix (total)', r.personsOfPeace?.total],
  ]
  return rows.map((row) => row.map((c) => `"${c ?? 0}"`).join(',')).join('\n')
}

/**
 * Modèle CSV vierge pour la saisie d'un rapport trimestriel.
 * Les mêmes rubriques que l'export, avec une valeur vide à compléter.
 */
function templateCsv(year, quarter) {
  const rows = [
    ['Rubrique', 'Valeur'],
    ['Année', year],
    ['Trimestre', `T${quarter}`],
    ['Nouveaux disciples', ''],
    ['Nouveaux baptisés', ''],
    ['Groupes DBS (total)', ''],
    ['Groupes DBS actifs', ''],
    ['Groupes devenus églises', ''],
    ['Églises (total actives)', ''],
    ['Églises commissionnées', ''],
    ['Églises catalytiques', ''],
    ['Églises 1G', ''],
    ['Églises 2G', ''],
    ['Églises 3G', ''],
    ['Églises 4G+', ''],
    ['Églises fusionnées', ''],
    ['Églises disparues', ''],
    ['Leaders en formation', ''],
    ['Coachs actifs', ''],
    ['Nouveaux leaders déployés', ''],
    ['Personnes de paix (total)', ''],
  ]
  return rows.map((row) => row.map((c) => `"${c ?? ''}"`).join(',')).join('\n')
}

export default function DmmReporting() {
  const { t } = useLanguage()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['reporting', year, quarter],
    queryFn: () => reportingApi.quarterly({ year, quarter }).then((r) => r.data?.data),
  })

  const gen = report?.churches?.byGeneration || {}
  const maxGen = useMemo(() => Math.max(1, ...Object.values(gen).map((v) => v || 0)), [gen])

  const downloadCsv = () => {
    const blob = new Blob([toCsv(report)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-dmm-${year}-T${quarter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv(year, quarter)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `modele-rapport-dmm-${year}-T${quarter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="text-indigo-600" /> {t('dmmReporting.title')}</h1>
          <p className="text-sm text-gray-500">{t('dmmReporting.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded border px-2 py-1.5 text-sm">
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="rounded border px-2 py-1.5 text-sm">
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>T{q}</option>)}
          </select>
          <button onClick={downloadTemplate} title={t('dmmReporting.downloadTemplateTooltip')}
            className="flex items-center gap-2 rounded-lg border border-indigo-600 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
            <FileDown size={16} /> {t('dmmReporting.downloadTemplate')}
          </button>
          <button onClick={downloadCsv} disabled={!report}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            <Download size={16} /> {t('dmmReporting.exportCsv')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Erreur de chargement du rapport.</p>
      ) : report ? (
        <>
          <Section title="Disciples">
            <Stat label="Nouveaux disciples" value={report.disciples?.newDisciples} accent="text-emerald-600" />
            <Stat label="Nouveaux baptisés" value={report.disciples?.baptized} accent="text-emerald-600" />
          </Section>

          <Section title="Groupes de découverte (DBS)">
            <Stat label="Total" value={report.discoveryGroups?.total} />
            <Stat label="Actifs" value={report.discoveryGroups?.active} accent="text-blue-600" />
            <Stat label="Devenus églises" value={report.discoveryGroups?.becameChurch} accent="text-emerald-600" />
          </Section>

          <Section title="Églises">
            <Stat label="Total actives" value={report.churches?.total} />
            <Stat label="Commissionnées" value={report.churches?.commissioned} />
            <Stat label="Catalytiques" value={report.churches?.catalytic} />
            <Stat label="Fusionnées / disparues" value={(report.churches?.mergedOrDied?.merged || 0) + (report.churches?.mergedOrDied?.died || 0)} accent="text-orange-600" />
          </Section>

          {/* Générations */}
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-600">Églises par génération</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              {[['1', '1ʳᵉ génération'], ['2', '2ᵉ génération'], ['3', '3ᵉ génération'], ['4plus', '4ᵉ génération +']].map(([k, lbl]) => (
                <div key={k} className="mb-2 flex items-center gap-3">
                  <span className="w-32 text-xs text-gray-600">{lbl}</span>
                  <div className="h-4 flex-1 rounded bg-gray-100">
                    <div className="h-4 rounded bg-indigo-500" style={{ width: `${((gen[k] || 0) / maxGen) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold">{gen[k] || 0}</span>
                </div>
              ))}
              <p className="mt-1 text-xs text-gray-400">Un mouvement (DMM) = 100+ églises sur 4 générations.</p>
            </div>
          </div>

          <Section title="Leaders">
            <Stat label="En formation" value={report.leaders?.inTraining} accent="text-blue-600" />
            <Stat label="Coachs actifs" value={report.leaders?.activeCoaches} accent="text-indigo-600" />
            <Stat label="Nouveaux déployés" value={report.leaders?.newLeadersDeployed} accent="text-emerald-600" />
            <Stat label="Personnes de paix" value={report.personsOfPeace?.total} />
          </Section>
        </>
      ) : null}
    </div>
  )
}
