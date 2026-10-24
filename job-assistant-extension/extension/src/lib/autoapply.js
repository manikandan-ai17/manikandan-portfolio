// Which jobs AUTO-apply may attempt, and the settings that control it. Everything here is pure (no browser
// calls) so it can be tested; the dashboard page runs the queue.

import { findDuplicate, ACTIVE } from './store.js'
import { countriesOf } from './match.js'

export const DEFAULT_AUTO = {
  enabled: false, // master switch
  dryRun: true, // fill everything, stop before Submit, leave the tab open for you
  minVerdict: 'good', // 'strong' | 'good'
  dailyCap: 10, // real submissions per day
  pauseSeconds: 30, // gap between applications (a little random on top)
  acceptConsent: true, // tick privacy / data-processing / "information is true" boxes
  neverAppliedBefore: false, // answer "have you applied here before?" with No when the tracker has no record
  autoCoverLetter: true, // attach the template cover letter when a form has a cover-letter box
  allowAi: true, // use checked AI drafts (Gemini or Claude key) for written questions and profile-backed choices
  // One-click Run
  targetPerRun: 5, // applications (to different companies) per Run
  maxAttemptsPerRun: 12, // stop trying after this many forms in one Run, even if fewer than the target were applied
  onePerCompany: true, // never apply to a company you already applied to
  where: 'india_remote', // 'india_remote' | 'relocate' (also on-site abroad) | 'anywhere'
  aiFit: true, // ask the AI whether each job really fits before applying (needs a key)
  watchHours: 6, // check for new matching jobs every N hours and notify you (0 = off)
}

const normCompany = (c) => String(c ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(inc|ltd|llc|pvt|private|limited|technologies|labs?|ai)\b/g, '').replace(/[^a-z0-9]+/g, '')

/** Companies you have already applied to (tracker) or that a run applied to (history). */
export function appliedCompanies(tracker, processed) {
  const out = new Set()
  for (const r of Object.values(tracker ?? {})) if (ACTIVE.has(r.status) || r.status === 'rejected') out.add(normCompany(r.company))
  for (const p of Object.values(processed ?? {})) if (p.status === 'applied') out.add(normCompany(p.company))
  out.delete('')
  return out
}
export const companyKey = normCompany

/** Does the job's location fit where you want to work? Remote roles restricted to another country do not. */
export function locationFits(job, profile, where = 'india_remote') {
  if (where === 'anywhere') return true
  const allowed = new Set((profile.eligibility?.authorizedCountries ?? []).map((c) => c.toLowerCase()))
  const locs = job.locations?.length ? job.locations : []
  if (!locs.length) return Boolean(job.remote) // unknown location: only when the posting says it is remote
  return locs.some((loc) => {
    const countries = countriesOf(loc).map((c) => c.toLowerCase())
    const remote = /remote|anywhere|distributed|work from home/i.test(loc) || job.remote === true
    const inAllowed = countries.some((c) => allowed.has(c))
    if (inAllowed) return true
    if (remote && (!countries.length || countries.some((c) => /apac|asia|global|worldwide/.test(c)))) return true
    return where === 'relocate' && profile.eligibility?.openToRelocate === true
  })
}

/** Final outcomes are never retried. "needs you" is retried only once you have answered its questions. */
export const FINAL_STATUSES = new Set(['applied', 'skipped_fit', 'unconfirmed'])

export function retryable(rec, answerBank) {
  if (!rec) return true
  if (FINAL_STATUSES.has(rec.status)) return false
  if (rec.status === 'failed') return (rec.attempts ?? 1) < 2
  if (rec.status === 'needs_you') return (rec.questions ?? []).length > 0 && rec.questions.every((q) => answerBank?.[q.key])
  return true
}

/**
 * The jobs a Run should try, best first, one per company, never a company or job you already applied to.
 * Returns { candidates, skipped: { reason: count } }.
 */
export function pickCandidates(jobs, { profile, auto, tracker, resumes, log, processed = {}, answerBank = {} }) {
  const done = auto.onePerCompany ? appliedCompanies(tracker, processed) : new Set()
  // A company whose form is waiting for you (your answers, or a check of the tab) is not tried with another job.
  const waiting = new Map()
  if (auto.onePerCompany) for (const p of Object.values(processed)) if (['needs_you', 'unconfirmed'].includes(p.status)) waiting.set(normCompany(p.company), p.key)
  const skipped = {}
  const skip = (why) => (skipped[why] = (skipped[why] ?? 0) + 1)
  const best = new Map()
  for (const job of Object.values(jobs)) {
    if (!job.match || !['strong', 'good'].includes(job.match.verdict)) continue
    const elig = eligibility(job, { profile, auto, tracker, resumes, log })
    if (!elig.ok) { skip(elig.reasons[0].replace(/\(.*$/, '').trim()); continue }
    if (!locationFits(job, profile, auto.where)) { skip('Location does not fit your preference'); continue }
    if (!retryable(processed[job.key], answerBank)) { skip(`Already processed (${processed[job.key].status.replace('_', ' ')})`); continue }
    const ck = normCompany(job.company)
    if (done.has(ck)) { skip('You already applied to this company'); continue }
    if (waiting.has(ck) && waiting.get(ck) !== job.key) { skip('Another job at this company is waiting for you'); continue }
    const prev = best.get(ck)
    if (!prev || job.match.score > prev.match.score) best.set(ck, job)
  }
  const candidates = [...best.values()].sort((a, b) => (RANK[a.match.verdict] - RANK[b.match.verdict]) || b.match.score - a.match.score)
  return { candidates, skipped }
}

export const loadAuto = (settings) => ({ ...DEFAULT_AUTO, ...(settings?.autoApply ?? {}) })

/** Only the company career sites whose form the engine knows. LinkedIn, Indeed and Wellfound are never automated. */
export const SUPPORTED_ATS = new Set(['greenhouse', 'lever', 'ashby'])

const RANK = { strong: 0, good: 1, stretch: 2 }

export const appliedToday = (log, now = new Date()) => (log ?? []).filter((e) => e.status === 'applied' && !e.dryRun && new Date(e.at).toDateString() === now.toDateString()).length

/** { ok, reasons[] } — why this job can or cannot be auto-applied. */
export function eligibility(job, { profile, auto, tracker, resumes, log, now = new Date() }) {
  const reasons = []
  const m = job.match
  if (job.ats === 'manual' || !SUPPORTED_ATS.has(job.ats)) reasons.push(`${job.portal ?? job.ats} applications are not automated (only Greenhouse, Lever and Ashby company pages)`)
  if (!job.applyUrl) reasons.push('No application link')
  if (!m) reasons.push('Not scored yet')
  else if (m.verdict === 'blocked') reasons.push(`Blocked: ${m.blockers?.[0]?.text ?? 'see Why?'}`)
  else if (!(m.verdict in RANK) || RANK[m.verdict] > RANK[auto.minVerdict]) reasons.push(`Below your minimum match (${auto.minVerdict})`)
  const dup = findDuplicate(tracker, job)
  if (dup) reasons.push(`Already applied (${dup.kind})`)
  if (tracker?.[job.key] && ['not_applying', 'withdrawn'].includes(tracker[job.key].status)) reasons.push('You marked it “not for me”')

  const e = profile.eligibility ?? {}
  if (!profile.phone) reasons.push('Add your phone number (Profile)')
  if (!profile.city) reasons.push('Add your city (Profile)')
  if (!e.authorizedCountries?.length) reasons.push('Add the countries you may work in (Profile)')
  if (e.needsSponsorshipElsewhere === null || e.needsSponsorshipElsewhere === undefined) reasons.push('Answer the visa-sponsorship question (Profile)')
  if (e.openToRelocate === null || e.openToRelocate === undefined) reasons.push('Answer the relocation question (Profile)')
  if (!resumes?.length) reasons.push('Add a resume (Profile → Resumes)')
  if (!auto.dryRun && appliedToday(log, now) >= auto.dailyCap) reasons.push(`Daily limit of ${auto.dailyCap} applications reached`)
  return { ok: reasons.length === 0, reasons }
}

/** Seconds to wait between applications: the setting plus up to 50% random, so it does not look like a burst. */
export const pauseFor = (auto, rnd = Math.random) => Math.round(auto.pauseSeconds * (1 + rnd() * 0.5))
