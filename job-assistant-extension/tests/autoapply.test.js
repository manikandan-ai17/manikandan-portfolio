// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultProfile } from '../extension/src/lib/profile.js'
import { DEFAULT_AUTO, eligibility, appliedToday, pauseFor } from '../extension/src/lib/autoapply.js'

let AQ
beforeAll(async () => {
  await import('../extension/src/content/fieldmap.js')
  await import('../extension/src/content/autoquestions.js')
  AQ = globalThis.JobAssistAuto
})

const you = () => ({ ...defaultProfile(), phone: '+91 90000 00000', city: 'Coimbatore', country: 'India', eligibility: { ...defaultProfile().eligibility, authorizedCountries: ['India'], needsSponsorshipElsewhere: false, openToRelocate: true, noticePeriod: '30 days', earliestStart: 'Immediately' } })
const indiaJob = { company: 'Acme', title: 'AI Engineer', locations: ['Bengaluru, India'] }
const usJob = { company: 'Acme', title: 'AI Engineer', locations: ['San Francisco, CA'] }
const auto = { ...DEFAULT_AUTO, enabled: true, acceptConsent: true }
const ctx = (job, over = {}) => ({ profile: you(), job, settings: auto, tracker: {}, ...over })
const q = (label, kind = 'select', options = ['Yes', 'No'], required = true) => ({ label, kind, options, required })

describe('answers come only from your profile', () => {
  it('knows which countries a location or question means', () => {
    expect(AQ.countriesIn('Bengaluru, India')).toEqual(['india'])
    expect(AQ.countriesIn('San Francisco, CA')).toEqual(['united states'])
    expect(AQ.countriesIn('London, UK or Remote')).toEqual(['united kingdom'])
    expect(AQ.countriesIn('Are you authorized to work in the United States?')).toEqual(['united states'])
  })

  it('work authorization: yes where your profile says you may work, no elsewhere, ask when unknown', () => {
    expect(AQ.decide(q('Are you legally authorized to work in India? *'), ctx(indiaJob))).toEqual({ action: 'set', option: 'Yes' })
    expect(AQ.decide(q('Are you authorized to work in the United States? *'), ctx(indiaJob))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('Are you authorized to work in the country where this job is located? *'), ctx(usJob))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('Are you authorized to work in the country where this job is located? *'), ctx({ ...indiaJob, locations: [] })).action).toBe('needs_you')
  })

  it('sponsorship: no in your own country, your stated answer abroad, and the inverted wording', () => {
    expect(AQ.decide(q('Will you now or in the future require visa sponsorship? *'), ctx(indiaJob))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('Will you now or in the future require visa sponsorship? *'), ctx(usJob))).toEqual({ action: 'set', option: 'No' }) // you said no sponsorship needed
    const needs = you()
    needs.eligibility.needsSponsorshipElsewhere = true
    expect(AQ.decide(q('Will you require visa sponsorship? *'), { ...ctx(usJob), profile: needs })).toEqual({ action: 'set', option: 'Yes' })
    expect(AQ.decide(q('Are you able to work without sponsorship? *'), { ...ctx(usJob), profile: needs })).toEqual({ action: 'set', option: 'No' })
    const unanswered = you()
    unanswered.eligibility.needsSponsorshipElsewhere = null
    expect(AQ.decide(q('Do you require visa sponsorship? *'), { ...ctx(usJob), profile: unanswered }).action).toBe('needs_you')
  })

  it('demographic questions pick “decline”, never a guess', () => {
    expect(AQ.decide(q('Gender', 'select', ['Male', 'Female', 'Decline to self-identify']), ctx(indiaJob))).toEqual({ action: 'set', option: 'Decline to self-identify' })
    expect(AQ.decide(q('Veteran status *', 'select', ['Yes', 'No']), ctx(indiaJob)).action).toBe('needs_you')
    expect(AQ.decide(q('Race', 'select', ['A', 'B'], false), ctx(indiaJob)).action).toBe('leave')
  })

  it('consent boxes are ticked only when allowed; legal agreements never', () => {
    expect(AQ.decide(q('I acknowledge the Privacy Policy *', 'checkbox', []), ctx(indiaJob))).toEqual({ action: 'set', checked: true })
    expect(AQ.decide(q('I acknowledge the Privacy Policy *', 'checkbox', []), ctx(indiaJob, { settings: { ...auto, acceptConsent: false } })).action).toBe('needs_you')
    expect(AQ.decide(q('I agree to the Arbitration Agreement *', 'checkbox', []), ctx(indiaJob)).action).toBe('needs_you')
    expect(AQ.decide(q('Non-compete acknowledgement *', 'checkbox', []), ctx(indiaJob)).action).toBe('needs_you')
  })

  it('history, referral and unknown questions', () => {
    expect(AQ.decide(q('Have you previously worked at Acme? *'), ctx(indiaJob))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('Have you applied to Acme before? *'), ctx(indiaJob)).action).toBe('needs_you')
    expect(AQ.decide(q('Have you applied to Acme before? *'), ctx(indiaJob, { settings: { ...auto, neverAppliedBefore: true } }))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('Have you applied to Acme before? *'), ctx(indiaJob, { tracker: { k: { company: 'Acme', status: 'applied' } } }))).toEqual({ action: 'set', option: 'Yes' })
    expect(AQ.decide(q('Were you referred by an employee?'), ctx(indiaJob))).toEqual({ action: 'set', option: 'No' })
    expect(AQ.decide(q('How many years of Kubernetes experience do you have? *', 'text', []), ctx(indiaJob)).action).toBe('needs_you')
    expect(AQ.decide(q('Salary expectation *', 'text', []), ctx(indiaJob)).action).toBe('needs_you')
    expect(AQ.decide(q('Notice period *', 'text', []), ctx(indiaJob))).toEqual({ action: 'set', value: '30 days' })
    expect(AQ.decide(q('Country *', 'select', ['United States', 'India']), ctx(indiaJob))).toEqual({ action: 'set', option: 'India' })
    // The dial-code picker beside a phone field: exact country only, never a partial name match.
    expect(AQ.decide(q('Country', 'combobox', ['United States +1', 'British Indian Ocean Territory +246', 'India +91'], false), ctx(indiaJob))).toEqual({ action: 'set', option: 'India +91' })
    expect(AQ.decide(q('Country *', 'combobox', ['United States +1', 'British Indian Ocean Territory +246'], true), ctx(indiaJob)).action).toBe('needs_you')
  })
})

describe('which jobs may be auto-applied', () => {
  const job = (over = {}) => ({ key: 'greenhouse:acme:1', ats: 'greenhouse', company: 'Acme', title: 'AI Engineer', applyUrl: 'https://job-boards.greenhouse.io/acme/jobs/1', match: { verdict: 'good', score: 70, blockers: [] }, ...over })
  const env = (over = {}) => ({ profile: you(), auto: { ...auto, dryRun: false }, tracker: {}, resumes: [{ id: 'r1' }], log: [], ...over })

  it('accepts a good Greenhouse job when your profile is complete', () => expect(eligibility(job(), env())).toEqual({ ok: true, reasons: [] }))

  it('refuses unsupported sites, blocked and weak matches, duplicates, and incomplete profiles', () => {
    expect(eligibility(job({ ats: 'workday' }), env()).reasons[0]).toMatch(/not automated/)
    expect(eligibility(job({ ats: 'manual', portal: 'LinkedIn' }), env()).reasons[0]).toMatch(/LinkedIn applications are not automated/)
    expect(eligibility(job({ match: { verdict: 'blocked', blockers: [{ text: 'Senior title' }] } }), env()).reasons).toContain('Blocked: Senior title')
    expect(eligibility(job({ match: { verdict: 'stretch', score: 50 } }), env()).reasons[0]).toMatch(/Below your minimum/)
    expect(eligibility(job(), env({ tracker: { x: { key: 'greenhouse:acme:1', status: 'applied', company: 'Acme', title: 'AI Engineer' } } })).reasons[0]).toMatch(/Already applied/)
    const bare = { ...defaultProfile() }
    expect(eligibility(job(), env({ profile: bare, resumes: [] })).reasons).toEqual(expect.arrayContaining(['Add your phone number (Profile)', 'Answer the visa-sponsorship question (Profile)', 'Add a resume (Profile → Resumes)']))
  })

  it('enforces the daily limit on live runs only', () => {
    const now = new Date('2026-10-23T10:00:00Z')
    const log = Array.from({ length: 10 }, () => ({ status: 'applied', at: now.toISOString(), dryRun: false }))
    expect(appliedToday(log, now)).toBe(10)
    expect(eligibility(job(), env({ log, now })).reasons.at(-1)).toMatch(/Daily limit of 10/)
    expect(eligibility(job(), env({ log, now, auto: { ...auto, dryRun: true } })).ok).toBe(true)
    expect(pauseFor({ pauseSeconds: 30 }, () => 0)).toBe(30)
    expect(pauseFor({ pauseSeconds: 30 }, () => 1)).toBe(45)
  })
})

// ── The engine on a page shaped like a Greenhouse form ──

const FORM = `
  <form id="f" action="/submit" method="post">
    <label for="first_name">First Name*</label><input id="first_name" required>
    <label for="last_name">Last Name*</label><input id="last_name" required>
    <label for="email">Email*</label><input id="email" required>
    <label for="phone">Phone*</label><input id="phone" type="tel" required>
    <label for="sp">Will you now or in the future require visa sponsorship? *</label>
    <select id="sp" required><option value="">Select...</option><option value="1">Yes</option><option value="2">No</option></select>
    <fieldset><legend>Are you legally authorized to work in India? *</legend>
      <label><input type="radio" name="auth" value="y" required> Yes</label>
      <label><input type="radio" name="auth" value="n"> No</label></fieldset>
    <label for="g">Gender</label>
    <select id="g"><option value="">Select...</option><option>Male</option><option>Decline to self-identify</option></select>
    <label><input type="checkbox" id="priv" required> I acknowledge the Privacy Policy*</label>
    <label for="why">Why do you want to work here?*</label><textarea id="why" required></textarea>
    <button type="submit">Submit application</button>
  </form>`

let store
function setup({ profile = you(), dryRun = false, job = indiaJob, html = FORM } = {}) {
  store = {
    profile,
    resumes: [{ id: 'r1', label: 'Main', fileName: 'r.pdf', dataB64: 'JVBERg==', isDefault: true }],
    pendingApply: { 'greenhouse:acme:1': { jobKey: 'greenhouse:acme:1', jobId: '1', company: 'Acme', title: 'AI Engineer', resumeId: 'r1', resumeLabel: 'Main', answers: [] } },
    tracker: {},
    settings: { autoApply: { ...auto, dryRun } },
    autoApplyRun: { active: true, stage: 'queued', jobKey: 'greenhouse:acme:1', jobId: '1', applyUrl: 'https://job-boards.greenhouse.io/acme/jobs/1', company: 'Acme', title: 'AI Engineer', dryRun, job },
    autoApplyLog: [],
  }
  globalThis.chrome = {
    storage: { local: { get: async (keys) => (keys === null ? { ...store } : Object.fromEntries([keys].flat().map((k) => [k, store[k]]))), set: async (o) => Object.assign(store, o) } },
    runtime: { sendMessage: vi.fn(async (m) => (m?.type === 'draftAnswers' ? { ok: true, drafts: m.questions.map((x) => ({ id: x.id, question: x.text, kind: 'why_company', source: 'template', text: 'I build LLM applications in Python and TypeScript.', issues: [] })) } : { ok: true })) },
  }
  Element.prototype.getBoundingClientRect = () => ({ width: 100, height: 20 })
  window.history.pushState({}, '', '/acme/jobs/1')
  document.body.innerHTML = html
  window.__jobAssistLoaded = false
  window.__jobAssistAutoLoaded = false
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

describe('the engine', () => {
  beforeEach(() => {
    delete globalThis.__jobAssistAuto
  })

  it('dry run: fills facts, answers the profile questions, writes the answer, and does NOT submit', async () => {
    setup({ dryRun: true })
    const submit = vi.fn((e) => e.preventDefault())
    document.getElementById('f').addEventListener('submit', submit)
    const r = await runEngine()
    expect(r).toMatchObject({ status: 'dry_run', dryRun: true })
    const v = (id) => document.getElementById(id)
    expect([v('first_name').value, v('last_name').value, v('email').value, v('phone').value]).toEqual(['Manikandan', 'Santhosh', 'maniappu7777@gmail.com', '+91 90000 00000'])
    expect(v('sp').selectedOptions[0].text).toBe('No')
    expect(document.querySelector('input[name=auth][value=y]').checked).toBe(true)
    expect(v('g').selectedOptions[0].text).toBe('Decline to self-identify')
    expect(v('priv').checked).toBe(true)
    expect(v('why').value).toMatch(/LLM applications/)
    expect(submit).not.toHaveBeenCalled()
    expect(store.tracker).toEqual({})
  })

  it('live: submits, sees the site’s confirmation and records the application', async () => {
    setup({ dryRun: false })
    const form = document.getElementById('f')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      setTimeout(() => (document.body.innerHTML = '<h1>Thank you for applying</h1><p>Your application has been submitted.</p>'), 50)
    })
    const r = await runEngine()
    expect(r.status).toBe('applied')
    const rec = Object.values(store.tracker)[0]
    expect(rec).toMatchObject({ status: 'applied', company: 'Acme', title: 'AI Engineer', resumeVersion: 'Main' })
    expect(rec.answers).toEqual([{ question: 'Why do you want to work here?', answer: 'I build LLM applications in Python and TypeScript.' }])
    expect(rec.history.at(-1)).toMatchObject({ status: 'applied', via: 'auto-apply' })
  })

  it('stops without submitting when your profile cannot answer a required question', async () => {
    const p = you()
    p.eligibility.needsSponsorshipElsewhere = null
    setup({ profile: p, job: usJob })
    store.autoApplyRun.job = usJob
    const submit = vi.fn((e) => e.preventDefault())
    document.getElementById('f').addEventListener('submit', submit)
    const r = await runEngine()
    expect(r.status).toBe('needs_you')
    expect(r.reasons.join(' ')).toMatch(/visa-sponsorship/i)
    expect(submit).not.toHaveBeenCalled()
    expect(store.tracker).toEqual({})
  })

  it('stops when a legal agreement is required', async () => {
    setup({ dryRun: false, html: FORM.replace('<label><input type="checkbox" id="priv" required> I acknowledge the Privacy Policy*</label>', '<label><input type="checkbox" id="arb" required> I agree to the Arbitration Agreement*</label>') })
    const submit = vi.fn((e) => e.preventDefault())
    document.getElementById('f').addEventListener('submit', submit)
    const r = await runEngine()
    expect(r.status).toBe('needs_you')
    expect(r.reasons.join(' ')).toMatch(/Legal agreement/)
    expect(submit).not.toHaveBeenCalled()
  })

  it('reports a failure when the site shows validation errors after Submit, and records nothing', async () => {
    setup({ dryRun: false })
    document.getElementById('f').addEventListener('submit', (e) => {
      e.preventDefault()
      const d = document.createElement('div')
      d.setAttribute('role', 'alert')
      d.textContent = 'Please correct the highlighted fields'
      document.body.append(d)
    })
    const r = await runEngine()
    expect(r.status).toBe('failed')
    expect(r.reason).toMatch(/Please correct/)
    expect(store.tracker).toEqual({})
  }, 20000)

  it('does nothing on a page that is not the queued job', async () => {
    setup({ dryRun: true })
    window.history.pushState({}, '', '/other/jobs/999')
    await import('../extension/src/content/fieldmap.js')
    await import('../extension/src/content/autofill.js?' + Math.random())
    await import('../extension/src/content/autoquestions.js?' + Math.random())
    await import('../extension/src/content/autorun.js?' + Math.random())
    await new Promise((r) => setTimeout(r, 400))
    expect(store.autoApplyRun.stage).toBe('queued')
    expect(document.getElementById('first_name').value).toBe('')
  })
})
