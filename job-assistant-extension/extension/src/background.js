// Background service worker: drafts answers for the application-page panel. It runs inside the extension, so
// it can use your stored profile, the saved job and (if you added one) your Anthropic key — none of which the
// page itself can see. It never fills or submits anything; the panel shows each draft for you to approve.

import { loadProfile, loadSettings, loadSources, get, set, saveProfile } from './lib/store.js'
import { scoreJob } from './lib/match.js'
import { draftAnswer, checkAnswer, classifyQuestion } from './lib/answers.js'
import { aiChoice } from './lib/aiTasks.js'
import { runSearch } from './lib/pipeline.js'
import { loadAuto, locationFits, appliedCompanies, companyKey } from './lib/autoapply.js'
// Service workers cannot use import(): the SDK is imported here and handed to the AI drafting code.
import { Anthropic } from './vendor/anthropic-sdk.js'

/** The job this page belongs to: the one opened from the dashboard, or what the page itself shows. */
async function jobFor(jobKey, page) {
  const jobs = { ...(await get('jobs', {})), ...(await get('manualJobs', {})) }
  if (jobKey && jobs[jobKey]) return jobs[jobKey]
  return { key: null, company: page?.company ?? '', title: page?.title ?? '', locations: [], description: page?.description ?? '' }
}

const same = (a, b) => String(a).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === String(b).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

async function draftAll({ questions, jobKey, page, preferAi, approved = [] }) {
  const profile = await loadProfile()
  const settings = await loadSettings()
  const job = await jobFor(jobKey, page)
  const match = job.match ?? scoreJob(job, profile)
  const out = []
  for (const q of questions) {
    // An answer you already approved on the dashboard for this role: the same question, or the same kind.
    const kind = classifyQuestion(q.text)
    const prior = approved.find((a) => same(a.question, q.text)) ?? (['about_you', 'why_company', 'why_role', 'impactful_project'].includes(kind) ? approved.find((a) => a.kind === kind) : null)
    if (prior?.text) {
      out.push({ id: q.id, question: q.text, kind, source: 'dashboard', text: prior.text, issues: checkAnswer(prior.text, profile, { maxLength: q.maxLength }) })
      continue
    }
    try {
      out.push({ id: q.id, ...(await draftAnswer(q.text, { profile, job, match, settings, preferAi, Anthropic, maxLength: q.maxLength, maxWords: q.maxLength ? Math.max(40, Math.floor(q.maxLength / 7)) : 150 })) })
    } catch (err) {
      out.push({ id: q.id, question: q.text, text: '', source: 'none', note: err.message, needs: true, issues: [] })
    }
  }
  return out
}

const FACT_FIELDS = { noticePeriod: ['eligibility', 'noticePeriod'], earliestStart: ['eligibility', 'earliestStart'], salaryExpectation: ['myWords', 'salaryExpectation'] }

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  ;(async () => {
    if (msg?.type === 'draftAnswers') return reply({ ok: true, drafts: await draftAll(msg) })
    if (msg?.type === 'checkAnswer') return reply({ ok: true, issues: checkAnswer(msg.text, await loadProfile(), { maxLength: msg.maxLength }) })
    // A multiple-choice question the rules could not answer: Gemini may answer it only with a verified quote from your profile.
    if (msg?.type === 'aiChoice') {
      const result = await aiChoice({ question: String(msg.question ?? ''), options: msg.options ?? [], profile: await loadProfile(), job: msg.job ?? null, settings: await loadSettings() }).catch(() => null)
      return reply({ ok: true, result })
    }
    if (msg?.type === 'watchNow') return reply({ ok: true, ...(await watchForNewJobs({ force: true })) })
    if (msg?.type === 'saveFact' && FACT_FIELDS[msg.field]) {
      const p = await loadProfile()
      const [group, key] = FACT_FIELDS[msg.field]
      p[group] = { ...p[group], [key]: String(msg.value ?? '').slice(0, 300) }
      await saveProfile(p)
      return reply({ ok: true })
    }
    reply({ ok: false, error: 'Unknown request' })
  })().catch((err) => reply({ ok: false, error: String(err?.message ?? err) }))
  return true // the reply comes asynchronously
})

// ── New-job notifications ───────────────────────────────────────────────────
// Every few hours (Profile → Auto-apply), the official boards are read again; Strong/Good matches that fit where you
// want to work, at companies you have not applied to, and that you have not been told about before, are announced
// once. The first check after installing only remembers what exists, so you are not flooded with old jobs.

const WATCH = 'jobWatch'

async function schedule() {
  const auto = loadAuto(await loadSettings())
  await chrome.alarms.clear(WATCH)
  if (auto.watchHours > 0) await chrome.alarms.create(WATCH, { delayInMinutes: 2, periodInMinutes: auto.watchHours * 60 })
}

async function watchForNewJobs({ force = false } = {}) {
  const profile = await loadProfile()
  const auto = loadAuto(await loadSettings())
  if (!force && !(auto.watchHours > 0)) return { checked: false }
  const { jobs, meta } = await runSearch({ sources: await loadSources(), profile })
  const seenList = await get('seenJobs', [])
  const seen = new Set(seenList)
  const done = appliedCompanies(await get('tracker', {}), await get('processedJobs', {}))
  const fresh = Object.values(jobs).filter((j) => ['strong', 'good'].includes(j.match?.verdict) && !seen.has(j.key) && locationFits(j, profile, auto.where) && !done.has(companyKey(j.company)))
  await set('jobs', jobs)
  await set('runMeta', meta)
  await set('seenJobs', [...new Set([...seenList, ...Object.keys(jobs)])].slice(-30000))
  const first = seenList.length === 0
  if (fresh.length && !first) {
    await chrome.notifications.create(`new-jobs-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `${fresh.length} new matching job${fresh.length === 1 ? '' : 's'}`,
      message: fresh.sort((a, b) => b.match.score - a.match.score).slice(0, 3).map((j) => `${j.title} — ${j.company}`).join('\n'),
      priority: 1,
    })
  }
  await set('lastWatch', { at: new Date().toISOString(), fresh: fresh.length, first })
  return { checked: true, fresh: fresh.length, first }
}

// Optional chaining: the alarms and notifications APIs exist only with their manifest permissions.
chrome.runtime.onInstalled?.addListener(() => { schedule() })
chrome.runtime.onStartup?.addListener(() => { schedule() })
chrome.storage.onChanged?.addListener((changes) => { if (changes.settings) schedule() })
chrome.alarms?.onAlarm.addListener((a) => { if (a.name === WATCH) watchForNewJobs().catch((err) => console.warn('job watch failed', err)) })
chrome.notifications?.onClicked.addListener(() => { chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html#auto') }) })
