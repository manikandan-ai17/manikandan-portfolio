// @vitest-environment jsdom
// One-click Run: which jobs it picks, the Gemini checks, answers you saved, and the whole run end to end.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfile } from '../extension/src/lib/profile.js'
import { DEFAULT_AUTO, locationFits, appliedCompanies, retryable, pickCandidates } from '../extension/src/lib/autoapply.js'
import { aiFit, aiChoice, fitAllowsApply } from '../extension/src/lib/aiTasks.js'
import { bankKey, mergePending, answerQuestion } from '../extension/src/lib/answerBank.js'

const you = () => {
  const p = defaultProfile()
  return { ...p, phone: '+91 90000 00000', city: 'Coimbatore', country: 'India', eligibility: { ...p.eligibility, authorizedCountries: ['India'], needsSponsorshipElsewhere: false, openToRelocate: true, noticePeriod: '30 days', earliestStart: 'Immediately', yearsExperience: 1 } }
}
const auto = { ...DEFAULT_AUTO, enabled: true, dryRun: false, pauseSeconds: 0 }
let n = 0
const job = (company, over = {}) => {
  const id = ++n
  return { key: `greenhouse:${company.toLowerCase()}:${id}`, id, ats: 'greenhouse', company, title: 'AI Engineer', locations: ['Bengaluru, India'], applyUrl: `https://job-boards.greenhouse.io/${company.toLowerCase()}/jobs/${id}`, description: 'Build LLM features in Python.', match: { verdict: 'good', score: 70, blockers: [], matched: [], gaps: [] }, ...over }
}
const env = (over = {}) => ({ profile: you(), auto, tracker: {}, resumes: [{ id: 'r1' }], log: [], processed: {}, answerBank: {}, ...over })
const byKey = (...jobs) => Object.fromEntries(jobs.map((j) => [j.key, j]))

describe('where you want to work', () => {
  const p = you()
  it('India and remote roles fit; on-site or remote elsewhere do not (unless you choose to relocate)', () => {
    expect(locationFits({ locations: ['Bengaluru, India'] }, p)).toBe(true)
    expect(locationFits({ locations: ['Remote'] }, p)).toBe(true)
    expect(locationFits({ locations: ['Remote - APAC'] }, p)).toBe(true)
    expect(locationFits({ locations: ['San Francisco, CA'] }, p)).toBe(false)
    expect(locationFits({ locations: ['Remote - US'] }, p)).toBe(false)
    expect(locationFits({ locations: [], remote: null }, p)).toBe(false)
    expect(locationFits({ locations: ['London, UK'] }, p, 'relocate')).toBe(true)
    expect(locationFits({ locations: ['London, UK'] }, p, 'anywhere')).toBe(true)
  })
})

describe('never the same company twice', () => {
  it('counts companies from the tracker and from past runs', () => {
    const done = appliedCompanies({ a: { company: 'Stripe, Inc.', status: 'applied' }, b: { company: 'Okta', status: 'shortlisted' }, c: { company: 'Elastic', status: 'rejected' } }, { x: { company: 'Notion Labs', status: 'applied' }, y: { company: 'Twilio', status: 'failed' } })
    expect([...done].sort()).toEqual(['elastic', 'notion', 'stripe'])
  })

  it('retries failures once, "needs you" only after you answered, never applied or poor-fit jobs', () => {
    expect(retryable(undefined)).toBe(true)
    expect(retryable({ status: 'applied' })).toBe(false)
    expect(retryable({ status: 'skipped_fit' })).toBe(false)
    expect(retryable({ status: 'unconfirmed' })).toBe(false)
    expect(retryable({ status: 'failed', attempts: 1 })).toBe(true)
    expect(retryable({ status: 'failed', attempts: 2 })).toBe(false)
    expect(retryable({ status: 'needs_you', questions: [{ key: 'q1' }] }, {})).toBe(false)
    expect(retryable({ status: 'needs_you', questions: [{ key: 'q1' }] }, { q1: { answer: 'Yes' } })).toBe(true)
    expect(retryable({ status: 'needs_you', questions: [] }, {})).toBe(false) // e.g. a CAPTCHA: you decide in the tab
    expect(retryable({ status: 'dry_run' })).toBe(true)
  })

  it('picks the best job per company, skips applied companies, poor locations and processed jobs', () => {
    const a1 = job('Acme', { match: { verdict: 'good', score: 60 } })
    const a2 = job('Acme', { match: { verdict: 'strong', score: 80 } })
    const b = job('Beta', { match: { verdict: 'good', score: 75 } })
    const us = job('Gamma', { locations: ['New York, NY'] })
    const done = job('Delta')
    const seen = job('Epsilon')
    const weak = job('Zeta', { match: { verdict: 'stretch', score: 40 } })
    const { candidates, skipped } = pickCandidates(byKey(a1, a2, b, us, done, seen, weak), env({ tracker: { t: { key: 'other', company: 'Delta', title: 'Data Engineer', status: 'applied' } }, processed: { [seen.key]: { status: 'skipped_fit', company: 'Epsilon' } } }))
    expect(candidates.map((j) => j.key)).toEqual([a2.key, b.key]) // strong before good, one Acme
    expect(skipped).toMatchObject({ 'Location does not fit your preference': 1, 'You already applied to this company': 1, 'Already processed (skipped fit)': 1 })
  })

  it('does not try a second job at a company whose first form is waiting for your answers', () => {
    const first = job('Acme')
    const second = job('Acme', { title: 'ML Engineer' })
    const processed = { [first.key]: { key: first.key, company: 'Acme', status: 'needs_you', questions: [{ key: 'q' }] } }
    expect(pickCandidates(byKey(first, second), env({ processed })).candidates).toEqual([])
    expect(pickCandidates(byKey(first, second), env({ processed, answerBank: { q: { answer: 'No' } } })).candidates.map((j) => j.key)).toEqual([first.key])
  })
})

describe('written answers when the AI is unavailable', () => {
  it('falls back to the answer built from your profile', async () => {
    const { draftAnswer } = await import('../extension/src/lib/answers.js')
    const profile = { ...you(), myWords: { lookingFor: 'I want to build LLM products people use.' } }
    const failing = vi.fn(async () => ({ ok: false, status: 429, statusText: 'x', json: async () => ({ error: { message: 'quota' } }) }))
    const d = await draftAnswer('Why do you want to work here?', { profile, job: job('Acme'), match: { matched: [], gaps: [] }, settings: { geminiKey: 'k' }, preferAi: true, fetchFn: failing })
    expect(failing).toHaveBeenCalled()
    expect(d).toMatchObject({ kind: 'why_company', source: 'template' })
    expect(d.text).toMatch(/^I want to build LLM products people use\./)
    expect(d.text).not.toMatch(/\[/)
  })
})

describe('Gemini decisions, checked by code', () => {
  const settings = { geminiKey: 'k' }
  const reply = (obj) => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }, finishReason: 'STOP' }] }) }))

  it('fit: asks for structured JSON and honours apply / skip; no key means the rules decide', async () => {
    const fetchFn = reply({ decision: 'skip', fit: 'weak', reasons: [], blockers: ['5+ years required'] })
    const r = await aiFit({ job: job('Acme'), profile: you(), match: {}, settings, fetchFn })
    expect(r).toMatchObject({ decision: 'skip', blockers: ['5+ years required'] })
    expect(fitAllowsApply(r)).toBe(false)
    const body = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json' })
    expect(fitAllowsApply({ decision: 'apply', fit: 'good' })).toBe(true)
    expect(fitAllowsApply({ decision: 'apply', fit: 'weak' })).toBe(false)
    expect(await aiFit({ job: job('Acme'), profile: you(), settings: {} })).toBeNull()
    expect((await aiFit({ job: job('Acme'), profile: you(), settings, fetchFn: reply('{"decision": "app') })).decision).toBe('error')
  })

  it('choice: used only with an exact option and a quote that really is in your profile', async () => {
    const p = you()
    const ask = (out, question = 'Do you have experience with Python?') => aiChoice({ question, options: ['Yes', 'No'], profile: p, settings, fetchFn: reply(out) })
    expect(await ask({ answer: 'Yes', evidence: 'Python' })).toEqual({ answer: 'Yes', evidence: 'Python' })
    expect(await ask({ answer: 'Yes', evidence: 'ten years of Rust at Google' })).toBeNull() // invented quote
    expect(await ask({ answer: 'Maybe', evidence: 'Python' })).toBeNull() // not an option
    expect(await ask({ answer: null, evidence: null })).toBeNull()
    expect(await ask({ answer: 'Yes', evidence: 'Python' }, 'Do you have 3+ years of Python?')).toBeNull() // the number is not in the quote
    expect(await ask({ answer: 'No', evidence: 'Python' }, 'Are you a protected veteran?')).toBeNull() // never answered by AI
  })
})

describe('Questions for you', () => {
  it('collects questions once, and an answer moves them to your saved answers', () => {
    const k1 = bankKey('Do you have experience with Kubernetes? *', 'Acme', 'all')
    const k2 = bankKey('Why Acme?', 'Acme Inc', 'company')
    expect(k1).toBe('do you have experience with kubernetes')
    expect(k2).toBe('acmeinc|why acme')
    let pending = mergePending({}, [{ key: k1, label: 'Kubernetes?', scope: 'all' }], 'job1')
    pending = mergePending(pending, [{ key: k1, label: 'Kubernetes?', scope: 'all' }, { key: k2, label: 'Why Acme?', scope: 'company', company: 'Acme Inc' }], 'job2')
    expect(pending[k1].jobs).toEqual(['job1', 'job2'])
    const { bank, pending: left } = answerQuestion({ bank: {}, pending }, k2, '  Because of its open-source work.  ')
    expect(bank[k2]).toMatchObject({ answer: 'Because of its open-source work.', company: 'Acme Inc' })
    expect(Object.keys(left)).toEqual([k1])
  })
})

// ── The engine on a form with a question your profile cannot answer ──

const FORM = `
  <form id="f" action="/submit" method="post">
    <label for="first_name">First Name*</label><input id="first_name" required>
    <label for="last_name">Last Name*</label><input id="last_name" required>
    <label for="email">Email*</label><input id="email" required>
    <label for="phone">Phone*</label><input id="phone" type="tel" required>
    <label for="k8s">Do you have production experience with Kubernetes? *</label>
    <select id="k8s" required><option value="">Select...</option><option>Yes</option><option>No</option></select>
    <label for="why">Why do you want to work at Acme?*</label><textarea id="why" required></textarea>
    <button type="submit">Submit application</button>
  </form>`

let store
function setupEngine({ answerBank = {}, aiChoiceResult = null, allowAi = true, draft = '[your own reason]' } = {}) {
  store = {
    profile: you(),
    resumes: [{ id: 'r1', label: 'Main', fileName: 'r.pdf', dataB64: 'JVBERg==', isDefault: true }],
    pendingApply: { 'greenhouse:acme:1': { jobKey: 'greenhouse:acme:1', jobId: '1', company: 'Acme', title: 'AI Engineer', resumeId: 'r1', resumeLabel: 'Main', answers: [] } },
    tracker: {},
    settings: { autoApply: { ...auto, dryRun: true, allowAi } },
    autoApplyRun: { active: true, stage: 'queued', jobKey: 'greenhouse:acme:1', jobId: '1', applyUrl: 'https://job-boards.greenhouse.io/acme/jobs/1', company: 'Acme', title: 'AI Engineer', dryRun: true, job: { company: 'Acme', title: 'AI Engineer', locations: ['Bengaluru, India'] } },
    autoApplyLog: [],
    answerBank,
  }
  globalThis.chrome = {
    storage: { local: { get: async (keys) => (keys === null ? { ...store } : Object.fromEntries([keys].flat().map((k) => [k, store[k]]))), set: async (o) => Object.assign(store, o) } },
    runtime: {
      sendMessage: vi.fn(async (m) => {
        if (m?.type === 'draftAnswers') return { ok: true, drafts: m.questions.map((x) => ({ id: x.id, question: x.text, kind: 'why_company', source: 'template', text: draft, issues: /\[/.test(draft) ? [{ text: 'Replace the bracketed part', blocking: true }] : [] })) }
        if (m?.type === 'aiChoice') return { ok: true, result: aiChoiceResult }
        return { ok: true }
      }),
    },
  }
  Element.prototype.getBoundingClientRect = () => ({ width: 100, height: 20 })
  window.history.pushState({}, '', '/acme/jobs/1')
  document.body.innerHTML = FORM
  window.__jobAssistLoaded = false
  window.__jobAssistAutoLoaded = false
  delete globalThis.__jobAssistAuto
}

async function runEngine() {
  await import('../extension/src/content/fieldmap.js')
  await import('../extension/src/content/autofill.js?' + Math.random())
  await import('../extension/src/content/autoquestions.js?' + Math.random())
  await import('../extension/src/content/autorun.js?' + Math.random())
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 100))
    if (store.autoApplyRun && !store.autoApplyRun.active) break
  }
  return store.autoApplyLog[0]
}

describe('the engine with saved answers and AI choices', () => {
  const k8s = bankKey('Do you have production experience with Kubernetes? *', 'Acme', 'all')
  const why = bankKey('Why do you want to work at Acme?*', 'Acme', 'company')

  it('stops and reports each question it could not answer, with a key to save your answer under', async () => {
    setupEngine()
    const r = await runEngine()
    expect(r.status).toBe('needs_you')
    expect(r.questions.map((q) => q.key)).toEqual(expect.arrayContaining([k8s, why]))
    expect(r.questions.find((q) => q.key === why)).toMatchObject({ scope: 'company', kind: 'written' })
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'aiChoice' }))
  })

  it('uses your saved answers on the next form and completes it', async () => {
    setupEngine({ answerBank: { [k8s]: { answer: 'No' }, [why]: { answer: 'Acme builds developer tools I use every day.' } } })
    const r = await runEngine()
    expect(r.status).toBe('dry_run')
    expect(document.getElementById('k8s').selectedOptions[0].text).toBe('No')
    expect(document.getElementById('why').value).toBe('Acme builds developer tools I use every day.')
  })

  it('uses a checked AI answer for a choice only when allowed', async () => {
    setupEngine({ aiChoiceResult: { answer: 'No', evidence: 'skills' }, draft: 'I build LLM applications in Python.' })
    expect((await runEngine()).status).toBe('dry_run')
    expect(document.getElementById('k8s').selectedOptions[0].text).toBe('No')
    setupEngine({ aiChoiceResult: { answer: 'No', evidence: 'skills' }, allowAi: false, draft: 'I build LLM applications in Python.' })
    expect((await runEngine()).status).toBe('needs_you')
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'aiChoice' }))
  })
})

// ── One-click Run, end to end (the browser tabs are simulated) ──

describe('one-click Run', () => {
  let mem, opened, outcome
  beforeEach(async () => {
    mem = {
      settings: { geminiKey: 'k', autoApply: { ...auto } },
      resumes: [{ id: 'r1', label: 'Main', isDefault: true }],
      tracker: { old: { key: 'old', company: 'Stripe', title: 'Engineer', status: 'applied' } },
      autoApplyLog: [],
    }
    opened = []
    // What each application page "does" when the run opens it (the real page runs src/content/autorun.js).
    outcome = (url) => (/zeta/.test(url) ? { status: 'needs_you', reasons: ['Kubernetes?'], questions: [{ key: 'k8s', label: 'Kubernetes?', scope: 'all' }] } : { status: 'applied' })
    globalThis.chrome = {
      storage: { local: { get: async (k) => Object.fromEntries([k].flat().map((x) => [x, structuredClone(mem[x])])), set: async (o) => Object.assign(mem, structuredClone(o)) } },
      tabs: {
        create: vi.fn(async ({ url }) => {
          opened.push(url)
          const run = mem.autoApplyRun
          const res = outcome(url)
          setTimeout(() => {
            mem.autoApplyLog = [{ ...res, jobKey: run.jobKey, company: run.company, title: run.title, dryRun: run.dryRun, at: new Date().toISOString() }, ...mem.autoApplyLog]
            mem.autoApplyRun = { ...run, active: false, stage: res.status }
          }, 20)
          return { id: opened.length }
        }),
        remove: vi.fn(async () => {}),
      },
      notifications: { create: vi.fn() },
      runtime: { getURL: (p) => `chrome-extension://x/${p}` },
    }
    // Gemini: everything fits except the job at Omega
    globalThis.fetch = vi.fn(async (_url, init) => {
      const omega = /Omega/.test(JSON.parse(init.body).contents[0].parts[0].text)
      const verdict = omega ? { decision: 'skip', fit: 'weak', reasons: [], blockers: ['Requires 5+ years'] } : { decision: 'apply', fit: 'good', reasons: ['Python'], blockers: [] }
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(verdict) }] }, finishReason: 'STOP' }] }) }
    })
    const store = await import('../extension/src/lib/store.js')
    store.useStorage(chrome.storage.local)
  })

  it('applies to at most 5 different companies, skips poor fits and companies already applied to, and remembers', async () => {
    const { oneClickRun } = await import('../extension/pages/autoapply.js')
    const jobs = byKey(
      ...['Acme', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Eta', 'Theta'].map((c, i) => job(c, { match: { verdict: 'good', score: 90 - i, matched: [], gaps: [] } })),
      job('Acme', { title: 'ML Engineer', match: { verdict: 'good', score: 50, matched: [], gaps: [] } }),
      job('Stripe', { match: { verdict: 'strong', score: 95, matched: [], gaps: [] } }),
      job('Omega', { match: { verdict: 'strong', score: 99, matched: [], gaps: [] } }),
      job('Zeta', { match: { verdict: 'strong', score: 98, matched: [], gaps: [] } }),
    )
    const search = vi.fn(async () => {})
    const state = { profile: you() }
    const s1 = await oneClickRun(state, { search, allJobs: () => jobs })
    expect(search).toHaveBeenCalled()
    expect(s1.applied).toHaveLength(5)
    expect(s1.skippedFit).toEqual(['AI Engineer at Omega'])
    expect(s1.needsYou).toEqual(['AI Engineer at Zeta'])
    const companies = opened.map((u) => u.split('/')[3])
    expect(new Set(companies).size).toBe(companies.length) // one per company
    expect(companies).not.toContain('stripe') // applied before (tracker)
    expect(companies).not.toContain('omega') // AI said it does not fit
    expect(Object.values(mem.processedJobs).filter((p) => p.status === 'applied')).toHaveLength(5)
    expect(mem.pendingQuestions.k8s.jobs).toHaveLength(1)
    expect(mem.lastRun).toMatchObject({ dryRun: false })
    expect(chrome.notifications.create).toHaveBeenCalled()

    // Second run: only the companies not yet applied to; Zeta waits for your answer, Omega is not re-checked.
    opened = []
    const s2 = await oneClickRun(state, { search, allJobs: () => jobs })
    expect(opened.map((u) => u.split('/')[3])).toEqual(['eta', 'theta'])
    expect(s2.applied).toEqual(['AI Engineer at Eta', 'AI Engineer at Theta'])

    // You answer the Kubernetes question: the third run retries Zeta, and now it goes through.
    mem.answerBank = { k8s: { answer: 'No' } }
    outcome = () => ({ status: 'applied' })
    opened = []
    const s3 = await oneClickRun(state, { search, allJobs: () => jobs })
    expect(opened.map((u) => u.split('/')[3])).toEqual(['zeta'])
    expect(s3.applied).toEqual(['AI Engineer at Zeta'])

    // Nothing left: a fourth run applies to nobody rather than to an unsuitable job.
    opened = []
    const s4 = await oneClickRun(state, { search, allJobs: () => jobs })
    expect(opened).toEqual([])
    expect(s4.applied).toEqual([])
  }, 60000)

  it('does not count a dry run as applied: the same jobs are tried again when you go live', async () => {
    mem.settings.autoApply.dryRun = true
    outcome = () => ({ status: 'dry_run' })
    const { oneClickRun } = await import('../extension/pages/autoapply.js')
    const jobs = byKey(job('Acme'), job('Beta'))
    const state = { profile: you() }
    await oneClickRun(state, { search: async () => {}, allJobs: () => jobs })
    expect(opened).toHaveLength(2)
    expect(chrome.tabs.remove).not.toHaveBeenCalled() // dry-run tabs stay open for you to check
    mem.settings.autoApply.dryRun = false
    outcome = () => ({ status: 'applied' })
    opened = []
    const s = await oneClickRun(state, { search: async () => {}, allJobs: () => jobs })
    expect(opened).toHaveLength(2)
    expect(s.applied).toHaveLength(2)
  }, 30000)
})
