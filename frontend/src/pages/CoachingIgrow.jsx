import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Plus, MessageCircle, Target, Gauge, Lightbulb,
  ListChecks, ChevronRight, ChevronLeft, X, Star,
} from 'lucide-react'
import { coachingSessionsApi } from '../services/api'

/**
 * CoachingIgrow — Pilier ② : coaching iGROW.
 *
 * Le modèle iGROW : Invite → Goal → Reality → Options → Will do.
 * Le coach pose des questions de découverte (pas de réponses toutes faites),
 * évalue les 10 dimensions DMM (Reality), puis fixe des engagements « Je vais… »
 * priorisés (les 3 R : Rank, Record, Rate).
 */

// Repli si l'API /dimensions est indisponible
const FALLBACK_DIMENSIONS = [
  { id: 'prayer', name: 'Prière & jeûne' },
  { id: 'compassion', name: 'Ministère de compassion' },
  { id: 'persons_of_peace', name: 'Personnes de paix' },
  { id: 'discovery_groups', name: 'Groupes de découverte' },
  { id: 'obedience', name: 'Obéissance' },
  { id: 'church_gatherings', name: "Rassemblements d’église" },
  { id: 'disciple_replication', name: 'Réplication des disciples' },
  { id: 'leader_development', name: 'Développement des leaders' },
  { id: 'churches_reproducing', name: 'Reproduction des églises' },
  { id: 'evaluation', name: 'Évaluation & coaching' },
]

// Banque de questions de découverte (formation iGROW)
const QUESTION_BANK = {
  invite: [
    'Pour quelles raisons peux-tu être reconnaissant ?',
    "Qu'est-ce qui est important dans ta vie en ce moment ?",
    "Qu'as-tu appris récemment ?",
  ],
  goal: [
    'Sur quoi aimerais-tu travailler aujourd’hui ?',
    'Qu’est-ce qui rendrait ce temps ensemble utile pour toi ?',
    'En une phrase, que veux-tu voir arriver ?',
  ],
  reality: [
    'Où Dieu est-il le plus à l’œuvre et devons-nous le rejoindre davantage ?',
    'Où un ADN spirituel sain est-il visible et transféré, à célébrer ?',
    'Où y a-t-il des déficiences d’ADN sain à corriger ?',
    'Où y a-t-il une dérive de la mission à recadrer ?',
  ],
  options: [
    'Qu’est-ce qui t’aiderait à avancer ?',
    'Comment combler l’écart entre la situation actuelle et l’avenir souhaité ?',
    'Quelles ressources / compétences sont nécessaires ?',
  ],
  willDo: [
    'Quelles étapes précises t’engages-tu à faire d’ici notre prochaine rencontre ?',
    'Si tu devais prier pour une seule chose, laquelle ?',
  ],
}

const STEPS = [
  { key: 'invite', label: 'Invite', icon: MessageCircle, hint: 'Bonjour, comment vas-tu ? — créer le lien, écoute engagée' },
  { key: 'goal', label: 'Goal', icon: Target, hint: 'Ce que tu veux voir arriver' },
  { key: 'reality', label: 'Reality', icon: Gauge, hint: 'Ce que tu fais / as fait — évaluation des 10 dimensions DMM' },
  { key: 'options', label: 'Options', icon: Lightbulb, hint: 'Ce que tu pourrais faire' },
  { key: 'willDo', label: 'Will do', icon: ListChecks, hint: 'Ce que tu t’engages à faire (Rank · Record · Rate)' },
]

function QuestionHints({ items }) {
  return (
    <div className="mt-2 rounded-lg bg-indigo-50 p-3 text-xs text-indigo-800">
      <p className="mb-1 font-semibold">Questions de découverte suggérées</p>
      <ul className="list-disc space-y-0.5 pl-4">
        {items.map((q) => <li key={q}>{q}</li>)}
      </ul>
    </div>
  )
}

const emptyForm = () => ({
  coacheeName: '',
  conversationWith: 'leader',
  date: new Date().toISOString().slice(0, 10),
  durationMinutes: 60,
  invite: { rapportNotes: '', coachPrep: '' },
  goal: { statement: '', importance: 7 },
  reality: { notes: '', evaluationScores: [] },
  options: [''],
  willDo: [{ rank: 1, text: '', dueDate: '' }],
  nextSessionDate: '',
})

export default function CoachingIgrow() {
  const qc = useQueryClient()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(emptyForm)

  const { data: dimData } = useQuery({
    queryKey: ['coaching', 'dimensions'],
    queryFn: () => coachingSessionsApi.getDimensions().then((r) => r.data?.data || FALLBACK_DIMENSIONS),
    staleTime: Infinity,
  })
  const dimensions = dimData || FALLBACK_DIMENSIONS

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['coaching', 'list'],
    queryFn: () => coachingSessionsApi.list({ limit: 50 }).then((r) => r.data?.data || []),
  })

  const createMut = useMutation({
    mutationFn: (payload) => coachingSessionsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching', 'list'] })
      setWizardOpen(false)
      setForm(emptyForm())
      setStep(0)
    },
  })

  const scoreFor = (id) => form.reality.evaluationScores.find((s) => s.dimensionId === id)?.score || 0
  const setScore = (dim, score) => {
    setForm((f) => {
      const others = f.reality.evaluationScores.filter((s) => s.dimensionId !== dim.id)
      return {
        ...f,
        reality: {
          ...f.reality,
          evaluationScores: [...others, { dimensionId: dim.id, dimensionName: dim.name, score }],
        },
      }
    })
  }

  const liveHealth = useMemo(() => {
    const arr = form.reality.evaluationScores.map((s) => s.score).filter(Boolean)
    if (!arr.length) return null
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length / 5) * 100)
  }, [form.reality.evaluationScores])

  const submit = () => {
    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes) || undefined,
      options: form.options.filter((o) => o.trim()),
      willDo: form.willDo.filter((w) => w.text.trim()).map((w, i) => ({ ...w, rank: w.rank || i + 1 })),
      nextSessionDate: form.nextSessionDate || undefined,
    }
    createMut.mutate(payload)
  }

  const cur = STEPS[step]

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coaching iGROW</h1>
          <p className="text-sm text-gray-500">
            Invite · Goal · Reality · Options · Will do — évaluer et faire croître le ministère DMM par des questions de découverte.
          </p>
        </div>
        <button
          onClick={() => { setWizardOpen(true); setStep(0); setForm(emptyForm()) }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nouvelle session
        </button>
      </div>

      {/* Liste des sessions */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(sessions || []).map((s) => (
            <div key={s._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{s.coacheeName || s.coacheeUser?.name || 'Coaché'}</p>
                  <p className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString('fr-FR')}</p>
                </div>
                {typeof s.overallHealthScore === 'number' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {s.overallHealthScore}%
                  </span>
                )}
              </div>
              {s.goal?.statement && <p className="mt-2 line-clamp-2 text-sm text-gray-700">🎯 {s.goal.statement}</p>}
              <p className="mt-2 text-xs text-gray-400">
                {(s.willDo?.length || 0)} engagement(s) · Coach : {s.coach?.name || '—'}
              </p>
            </div>
          ))}
          {(!sessions || sessions.length === 0) && (
            <p className="col-span-full py-12 text-center text-sm text-gray-400">
              Aucune session de coaching pour l’instant. Créez la première.
            </p>
          )}
        </div>
      )}

      {/* Assistant I-G-R-O-W */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-bold">Session iGROW</h2>
              <button onClick={() => setWizardOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Stepper */}
            <div className="flex border-b bg-gray-50">
              {STEPS.map((st, i) => {
                const Icon = st.icon
                return (
                  <button
                    key={st.key}
                    onClick={() => setStep(i)}
                    className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
                      i === step ? 'bg-white text-indigo-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon size={16} /> {st.label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="mb-3 text-xs italic text-gray-500">{cur.hint}</p>

              {cur.key === 'invite' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">Coaché
                      <input className="mt-1 w-full rounded border px-2 py-1" value={form.coacheeName}
                        onChange={(e) => setForm({ ...form, coacheeName: e.target.value })} placeholder="Nom du leader" />
                    </label>
                    <label className="text-sm">Type
                      <select className="mt-1 w-full rounded border px-2 py-1" value={form.conversationWith}
                        onChange={(e) => setForm({ ...form, conversationWith: e.target.value })}>
                        <option value="leader">Leader</option>
                        <option value="church-planter">Planteur d’église</option>
                        <option value="other">Autre</option>
                      </select>
                    </label>
                    <label className="text-sm">Date
                      <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </label>
                    <label className="text-sm">Durée (min)
                      <input type="number" className="mt-1 w-full rounded border px-2 py-1" value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
                    </label>
                  </div>
                  <label className="block text-sm">Notes de mise en relation
                    <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={form.invite.rapportNotes}
                      onChange={(e) => setForm({ ...form, invite: { ...form.invite, rapportNotes: e.target.value } })} />
                  </label>
                  <label className="block text-sm">Préparation du coach (mon monde intérieur)
                    <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={form.invite.coachPrep}
                      onChange={(e) => setForm({ ...form, invite: { ...form.invite, coachPrep: e.target.value } })} />
                  </label>
                  <QuestionHints items={QUESTION_BANK.invite} />
                </div>
              )}

              {cur.key === 'goal' && (
                <div className="space-y-3">
                  <label className="block text-sm">Objectif — ce que tu veux voir arriver
                    <textarea className="mt-1 w-full rounded border px-2 py-1" rows={3} value={form.goal.statement}
                      onChange={(e) => setForm({ ...form, goal: { ...form.goal, statement: e.target.value } })} />
                  </label>
                  <label className="block text-sm">Importance : <b>{form.goal.importance}/10</b>
                    <input type="range" min={1} max={10} className="mt-1 w-full" value={form.goal.importance}
                      onChange={(e) => setForm({ ...form, goal: { ...form.goal, importance: Number(e.target.value) } })} />
                  </label>
                  <QuestionHints items={QUESTION_BANK.goal} />
                </div>
              )}

              {cur.key === 'reality' && (
                <div className="space-y-3">
                  {liveHealth !== null && (
                    <div className="rounded-lg bg-emerald-50 p-2 text-center text-sm font-semibold text-emerald-700">
                      Santé DMM globale : {liveHealth}%
                    </div>
                  )}
                  <div className="space-y-2">
                    {dimensions.map((dim) => (
                      <div key={dim.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
                        <span className="text-sm">{dim.name}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setScore(dim, n)} title={`${n}/5`}>
                              <Star size={18} className={n <= scoreFor(dim.id) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="block text-sm">Notes (vue à 360°)
                    <textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={form.reality.notes}
                      onChange={(e) => setForm({ ...form, reality: { ...form.reality, notes: e.target.value } })} />
                  </label>
                  <QuestionHints items={QUESTION_BANK.reality} />
                </div>
              )}

              {cur.key === 'options' && (
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <input key={i} className="w-full rounded border px-2 py-1 text-sm" value={opt} placeholder={`Option ${i + 1}`}
                      onChange={(e) => {
                        const next = [...form.options]; next[i] = e.target.value; setForm({ ...form, options: next })
                      }} />
                  ))}
                  <button className="text-xs font-semibold text-indigo-600" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>
                    + Ajouter une option
                  </button>
                  <QuestionHints items={QUESTION_BANK.options} />
                </div>
              )}

              {cur.key === 'willDo' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Rank (priorité) · Record (engagement) · Rate (échéance).</p>
                  {form.willDo.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="number" className="w-14 rounded border px-2 py-1 text-sm" value={w.rank} title="Rank"
                        onChange={(e) => { const n = [...form.willDo]; n[i] = { ...w, rank: Number(e.target.value) }; setForm({ ...form, willDo: n }) }} />
                      <input className="flex-1 rounded border px-2 py-1 text-sm" value={w.text} placeholder="Je vais…"
                        onChange={(e) => { const n = [...form.willDo]; n[i] = { ...w, text: e.target.value }; setForm({ ...form, willDo: n }) }} />
                      <input type="date" className="rounded border px-2 py-1 text-sm" value={w.dueDate}
                        onChange={(e) => { const n = [...form.willDo]; n[i] = { ...w, dueDate: e.target.value }; setForm({ ...form, willDo: n }) }} />
                    </div>
                  ))}
                  <button className="text-xs font-semibold text-indigo-600"
                    onClick={() => setForm({ ...form, willDo: [...form.willDo, { rank: form.willDo.length + 1, text: '', dueDate: '' }] })}>
                    + Ajouter un engagement
                  </button>
                  <label className="mt-2 block text-sm">Prochaine session
                    <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={form.nextSessionDate}
                      onChange={(e) => setForm({ ...form, nextSessionDate: e.target.value })} />
                  </label>
                  <QuestionHints items={QUESTION_BANK.willDo} />
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between border-t p-4">
              <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-600 disabled:opacity-40">
                <ChevronLeft size={16} /> Précédent
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white">
                  Suivant <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={submit} disabled={createMut.isPending}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
                  {createMut.isPending && <Loader2 size={16} className="animate-spin" />} Enregistrer la session
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
