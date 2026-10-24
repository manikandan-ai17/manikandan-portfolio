// Loads the extension's own code so the runner and the extension always answer the same way.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultProfile, withDefaults } from '../../extension/src/lib/profile.js'
import { DEFAULT_AUTO, loadAuto } from '../../extension/src/lib/autoapply.js'
import '../../extension/src/content/fieldmap.js'
import '../../extension/src/content/autoquestions.js'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '../..')
export const CONTENT_DIR = path.join(ROOT, 'extension/src/content')
export const OUT_DIR = process.env.RUNNER_OUT ?? path.join(ROOT, 'runner/out')

// runner/.env.local (git-ignored) may hold GEMINI_API_KEY / GEMINI_MODEL / ANTHROPIC_API_KEY. Real environment variables win.
try {
  for (const line of fs.readFileSync(path.join(ROOT, 'runner/.env.local'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* no local env file */ }

/** The AI settings the shared drafting code expects, from the environment. Gemini is preferred when both exist. */
export function aiSettingsFromEnv() {
  const geminiKey = process.env.GEMINI_API_KEY ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  return { aiProvider: geminiKey ? 'gemini' : 'anthropic', geminiKey, geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash', anthropicKey }
}

export const FM = globalThis.JobAssistFieldMap
export const AQ = globalThis.JobAssistAuto
export { DEFAULT_AUTO, loadAuto }

/**
 * Your data comes from the extension: Profile → "Export everything (JSON)". It holds your answers, resumes, jobs
 * and tracker. The API key is never in the export.
 */
export function loadExport(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  return {
    profile: withDefaults(raw.profileUser),
    resumes: raw.resumes ?? [],
    tracker: raw.tracker ?? {},
    settings: raw.settings ?? {},
    jobs: { ...(raw.jobs ?? {}), ...(raw.manualJobs ?? {}) },
    raw,
  }
}

/**
 * A clearly labelled stand-in so the SURVEY can run without your data. It is only used to measure which questions
 * the rules can answer; it is never used to fill or submit anything.
 */
export function demoData() {
  const p = defaultProfile()
  p.phone = '+91 90000 00000'
  p.city = 'Coimbatore'
  p.country = 'India'
  p.eligibility = { ...p.eligibility, authorizedCountries: ['India'], needsSponsorshipElsewhere: false, openToRelocate: true, noticePeriod: '30 days', earliestStart: 'Immediately', languages: [{ name: 'English', level: 'Professional' }] }
  return { profile: p, resumes: [], tracker: {}, settings: { autoApply: { ...DEFAULT_AUTO, acceptConsent: true, neverAppliedBefore: true } }, jobs: {}, demo: true }
}

export const portalOf = (url) => {
  let host = ''
  try { host = new URL(url).hostname } catch { /* not a URL */ }
  const known = [[/greenhouse\.io$/, 'greenhouse'], [/lever\.co$/, 'lever'], [/ashbyhq\.com$/, 'ashby'], [/workable\.com$/, 'workable'], [/smartrecruiters\.com$/, 'smartrecruiters'], [/myworkdayjobs\.com$/, 'workday']]
  return known.find(([re]) => re.test(host))?.[1] ?? 'other'
}

export const ensureOut = () => fs.mkdirSync(OUT_DIR, { recursive: true })
export const readContent = (name) => fs.readFileSync(path.join(CONTENT_DIR, name), 'utf8')
