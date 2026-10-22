// Which jobs AUTO-apply may attempt, and the settings that control it. Everything here is pure (no browser
// calls) so it can be tested; the dashboard page runs the queue.

import { findDuplicate } from './store.js'

export const DEFAULT_AUTO = {
  enabled: false, // master switch
  dryRun: true, // fill everything, stop before Submit, leave the tab open for you
  minVerdict: 'good', // 'strong' | 'good'
  dailyCap: 10, // real submissions per day
  pauseSeconds: 30, // gap between applications (a little random on top)
  acceptConsent: true, // tick privacy / data-processing / "information is true" boxes
  neverAppliedBefore: false, // answer "have you applied here before?" with No when the tracker has no record
  autoCoverLetter: true, // attach the template cover letter when a form has a cover-letter box
  allowAi: false, // use checked AI drafts (needs your Anthropic key) for written questions
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
