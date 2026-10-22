// Everything is kept in chrome.storage.local, on this computer only (never synced, never sent anywhere).
// The storage area can be swapped for tests.

import { DEFAULT_SOURCES } from './sources.js'
import { userPart, withDefaults } from './profile.js'
import { norm } from './text.js'

let area = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null
export const useStorage = (a) => {
  area = a
}

export async function get(key, fallback = null) {
  const r = await area.get(key)
  return r[key] ?? fallback
}
export async function set(key, value) {
  await area.set({ [key]: value })
}

// The application-page script reads the full profile, so the full (merged) profile is kept under 'profile'
// for it, and your own answers under 'profileUser' as the source of truth.
export async function saveProfile(p) {
  await set('profileUser', userPart(p))
  await set('profile', withDefaults(userPart(p)))
}
export const loadProfile = async () => withDefaults(await get('profileUser'))
export const loadSources = async () => get('sources', DEFAULT_SOURCES)
export const loadSettings = async () => ({ anthropicKey: '', model: 'claude-opus-5-5', ...(await get('settings', {})) })

// ── Tracker ──────────────────────────────────────────────────────────────────
//
// One record per job you acted on. Statuses:
//   shortlisted → preparing → applied → interviewing → offer | rejected | withdrawn,   or not_applying

export const STATUSES = ['shortlisted', 'preparing', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn', 'not_applying']
export const ACTIVE = new Set(['applied', 'interviewing', 'offer'])

/** Same company + same title (ignoring punctuation, case and "(Summer 2027)"-style suffixes). */
export const similarKey = (company, title) => `${norm(company)}|${norm(String(title).replace(/\(.*?\)/g, ''))}`

/** An earlier application to this job, or to the same role at the same company (a repost or another city). */
export function findDuplicate(tracker, job) {
  const recs = Object.values(tracker ?? {})
  const same = recs.find((r) => r.key === job.key && ACTIVE.has(r.status))
  if (same) return { record: same, kind: 'same job' }
  const sk = similarKey(job.company, job.title)
  const similar = recs.find((r) => r.key !== job.key && ACTIVE.has(r.status) && similarKey(r.company, r.title) === sk)
  return similar ? { record: similar, kind: 'same role at this company' } : null
}

export function trackerRecord(job, match, now = new Date()) {
  return {
    key: job.key,
    company: job.company,
    title: job.title,
    url: job.url,
    applyUrl: job.applyUrl,
    locations: job.locations,
    employmentType: job.employmentType,
    score: match?.score ?? null,
    verdict: match?.verdict ?? null,
    status: 'shortlisted',
    history: [{ status: 'shortlisted', at: now.toISOString() }],
    appliedAt: null,
    resumeVersion: null,
    coverLetter: null,
    notes: '',
  }
}

/** Changes a record's status and keeps the history. "applied" needs the resume version used. */
export function withStatus(rec, status, { resumeVersion, now = new Date() } = {}) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status "${status}"`)
  const next = { ...rec, status, history: [...(rec.history ?? []), { status, at: now.toISOString() }] }
  if (status === 'applied') {
    next.appliedAt = rec.appliedAt ?? now.toISOString()
    if (resumeVersion) next.resumeVersion = resumeVersion
  }
  return next
}

export async function updateTracker(fn) {
  const tracker = await get('tracker', {})
  const next = await fn(tracker)
  await set('tracker', next)
  return next
}

const csvCell = (v) => {
  const s = Array.isArray(v) ? v.join(' · ') : String(v ?? '')
  // A leading = + - @ would make Excel treat the cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function trackerCsv(tracker) {
  const cols = ['company', 'title', 'status', 'appliedAt', 'resumeVersion', 'score', 'verdict', 'locations', 'employmentType', 'applyUrl', 'notes']
  const rows = Object.values(tracker ?? {}).sort((a, b) => String(b.appliedAt ?? b.history?.[0]?.at).localeCompare(String(a.appliedAt ?? a.history?.[0]?.at)))
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n')
}
