// Background service worker: drafts answers for the application-page panel. It runs inside the extension, so
// it can use your stored profile, the saved job and (if you added one) your Anthropic key — none of which the
// page itself can see. It never fills or submits anything; the panel shows each draft for you to approve.

import { loadProfile, loadSettings, get, saveProfile } from './lib/store.js'
import { scoreJob } from './lib/match.js'
import { draftAnswer, checkAnswer, classifyQuestion } from './lib/answers.js'
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
