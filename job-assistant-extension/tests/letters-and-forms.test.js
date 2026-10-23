// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { templateCoverLetter, checkLetter, aiCoverLetter } from '../extension/src/lib/coverLetter.js'
import { defaultProfile } from '../extension/src/lib/profile.js'
import { scoreJob } from '../extension/src/lib/match.js'

// The Claude call is mocked: no key, no network, no cost. It records what would be sent.
const sent = []
let reply = { stop_reason: 'end_turn', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'Dear Acme hiring team,\nI use Python at work and know PyTorch deeply with 12 years of experience.\nManikandan Santhosh' }] }
vi.mock('../extension/src/vendor/anthropic-sdk.js', () => {
  class APIError extends Error { constructor(status, m) { super(m); this.status = status } }
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  class Anthropic {
    constructor(opts) { this.opts = opts; this.beta = { messages: { create: async (body) => { sent.push({ opts, body }); if (reply instanceof Error) throw reply; return reply } } } }
  }
  Object.assign(Anthropic, { APIError, AuthenticationError, RateLimitError })
  return { Anthropic }
})

const profile = defaultProfile()
const job = { key: 'k', company: 'Acme', title: 'Applied AI Engineer', locations: ['Remote'], employmentType: 'full_time', description: 'Python, FastAPI, LLM APIs, PDF processing, browser extensions. PyTorch is a plus.' }
const match = scoreJob(job, profile)

describe('cover letters', () => {
  it('the template uses only verified facts and passes its own check', () => {
    const letter = templateCoverLetter(profile, job, match)
    expect(letter).toMatch(/^Dear Acme hiring team,/)
    expect(letter).toContain('Bachelor of Science in Computer Technology from KG College of Arts and Science (2025)')
    expect(letter).toContain('Junior Software Developer at AltiusNxt Technologies')
    expect(letter).not.toMatch(/PyTorch/)
    expect(checkLetter(letter, profile)).toEqual([])
  })

  it('the check flags skills the profile does not show, coursework presented as work, and invented numbers', () => {
    const issues = checkLetter('I have 12 years with PyTorch and I write C++ daily. My CAD agent has 329 tests.', profile)
    expect(issues).toEqual(expect.arrayContaining([
      'Mentions PyTorch, which your profile does not show',
      'Mentions C++; your profile shows it only from coursework — do not present it as work experience',
      'Contains the number "12", which is not in your profile',
    ]))
    expect(issues.join(' ')).not.toMatch(/"329"/) // 329 tests is in the portfolio
  })

  it('AI draft: sends the verified facts with the fallback setting, and returns the draft with its issues', async () => {
    const r = await aiCoverLetter({ profile, job, match, apiKey: 'sk-test' })
    const { opts, body } = sent.at(-1)
    expect(opts).toEqual({ apiKey: 'sk-test', dangerouslyAllowBrowser: true })
    expect(body).toMatchObject({ model: 'claude-opus-5-5', max_tokens: 16000, output_config: { effort: 'medium' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
    expect(body.system).toMatch(/Use only facts in PROFILE/)
    expect(body.messages[0].content).toContain('"name": "Manikandan Santhosh"')
    expect(body.messages[0].content).toContain('GAPS (do not claim these): PyTorch')
    expect(r.issues).toEqual(expect.arrayContaining(['Mentions PyTorch, which your profile does not show', 'Contains the number "12", which is not in your profile']))
  })

  it('AI draft: no key, a refusal, or a bad key give clear messages', async () => {
    await expect(aiCoverLetter({ profile, job, match, apiKey: '' })).rejects.toThrow(/Add an AI key/)
    reply = { stop_reason: 'refusal', content: [] }
    await expect(aiCoverLetter({ profile, job, match, apiKey: 'k' })).rejects.toThrow(/declined/)
    const { Anthropic } = await import('../extension/src/vendor/anthropic-sdk.js')
    reply = new Anthropic.AuthenticationError(401, 'invalid x-api-key')
    await expect(aiCoverLetter({ profile, job, match, apiKey: 'k' })).rejects.toThrow(/key was refused/)
  })
})

// ── Field mapping (labels taken from the live Greenhouse and Ashby forms) ──

let FM
beforeAll(async () => {
  await import('../extension/src/content/fieldmap.js')
  FM = globalThis.JobAssistFieldMap
})

describe('which fields are filled', () => {
  it('fills plain facts', () => {
    const cases = { 'First Name*': 'first_name', 'Last Name*': 'last_name', 'Legal Name': 'full_name', 'Email*': 'email', 'Phone*': 'phone', 'LinkedIn Profile': 'linkedin', Website: 'portfolio', 'GitHub URL': 'github', 'When is the earliest you would want to start working with us?': 'earliest_start', 'School': 'school' }
    for (const [label, key] of Object.entries(cases)) expect(FM.classify(label), label).toEqual({ action: 'fill', key })
    expect(FM.classify('Resume _systemfield_resume', { type: 'file' })).toEqual({ action: 'fill', key: 'resume_file' })
  })
  it('never fills authorization, visa, legal, demographic or "why us" questions', () => {
    for (const label of ['Do you require visa sponsorship? *', 'Will you now or will you in the future require employment visa sponsorship?', 'Are you authorized to work in the country where the job is located?', 'Agreement to Arbitrate*', 'I acknowledge that I have opened, read, and understood the Arbitration Agreement', 'Gender', 'Are you Hispanic/Latino?', 'Veteran Status', 'Are you open to relocation for this role? *', 'Have you ever interviewed at Anthropic before?*', 'AI Policy for Application*', 'Desired salary', 'What is the address from which you plan on working? If you would need to relocate, please type "relocating".'])
      expect(FM.classify(label).action, label).toBe('sensitive')
    expect(FM.classify('Why Anthropic?*', { tag: 'TEXTAREA' }).action).toBe('skip')
    expect(FM.classify('Autofill from resume', { type: 'file' }).action).toBe('skip')
    expect(FM.classify('Country*', { combobox: true }).action).toBe('unknown')
    expect(FM.classify('Where are you currently located?', { combobox: true })).toMatchObject({ action: 'skip', note: 'Pick from the list yourself' })
  })
  it('values come from the profile only; missing answers stay empty', () => {
    expect(FM.valueFor('email', profile)).toBe('maniappu7777@gmail.com')
    expect(FM.valueFor('discipline', profile)).toBe('Computer Technology')
    expect(FM.valueFor('phone', profile)).toBeNull()
    expect(FM.valueFor('location', profile)).toBeNull()
    expect(FM.valueFor('cover_letter', profile)).toBeNull()
  })
})

// ── The panel's "Fill" on a page shaped like the real Greenhouse form ──

describe('filling a form', () => {
  let store
  beforeEach(async () => {
    store = { profile: { ...defaultProfile(), phone: '+91 90000 00000' }, resumes: [], pendingApply: {}, tracker: {} }
    globalThis.chrome = { storage: { local: { get: async (keys) => Object.fromEntries([keys].flat().map((k) => [k, store[k]])), set: async (o) => Object.assign(store, o) } } }
    Element.prototype.getBoundingClientRect = () => ({ width: 100, height: 20 })
    document.body.innerHTML = `
      <form id="application-form" action="/submit" method="post">
        <label for="first_name">First Name*</label><input id="first_name" required>
        <label for="last_name">Last Name*</label><input id="last_name" required>
        <label for="email">Email*</label><input id="email">
        <label for="phone">Phone*</label><input id="phone" type="tel">
        <label for="q1">LinkedIn Profile</label><input id="q1">
        <label for="q2">Do you require visa sponsorship? *</label><input id="q2" class="select__input" required>
        <label for="q3">Why Anthropic?*</label><textarea id="q3" required></textarea>
        <label for="q4">Website</label><input id="q4" value="https://already.example">
        <label for="resume">Resume/CV*</label><input id="resume" type="file">
        <button type="submit">Submit application</button>
      </form>`
    window.__jobAssistLoaded = false
    await import('../extension/src/content/fieldmap.js')
    await import('../extension/src/content/autofill.js?' + Math.random())
  })

  it('fills facts, leaves sensitive and own-words questions, keeps existing answers, and never submits', async () => {
    const submit = vi.fn((e) => e.preventDefault())
    document.querySelector('form').addEventListener('submit', submit)
    const r = await globalThis.__jobAssist.fill()
    const v = (id) => document.getElementById(id).value
    expect([v('first_name'), v('last_name'), v('email'), v('phone'), v('q1')]).toEqual(['Manikandan', 'Santhosh', 'maniappu7777@gmail.com', '+91 90000 00000', 'https://www.linkedin.com/in/manikandan-s-032518285/'])
    expect(v('q2')).toBe('')
    expect(v('q3')).toBe('')
    expect(v('q4')).toBe('https://already.example')
    expect(r.sensitive).toEqual(['Do you require visa sponsorship?'])
    expect(r.left.join(' | ')).toMatch(/Why Anthropic\? — Write this in your own words/)
    expect(r.missing).toEqual(['Resume (add one in Profile → Resumes)'])
    expect(submit).not.toHaveBeenCalled()
  })
})
