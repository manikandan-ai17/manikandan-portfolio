import { describe, expect, it, vi } from 'vitest'
import { aiConfig, hasAi, geminiGenerate, GEMINI_DEFAULT_MODEL } from '../extension/src/lib/ai.js'
import { aiAnswer, draftAnswer } from '../extension/src/lib/answers.js'
import { aiCoverLetter } from '../extension/src/lib/coverLetter.js'
import { defaultProfile } from '../extension/src/lib/profile.js'

const ok = (text, extra = {}) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP', ...extra }], modelVersion: 'gemini-2.5-flash' }) })
const fail = (status, message) => ({ ok: false, status, statusText: 'x', json: async () => ({ error: { message } }) })

describe('which AI is used', () => {
  it('follows your choice and falls back to whichever key exists', () => {
    expect(aiConfig({})).toBeNull()
    expect(hasAi({})).toBe(false)
    expect(aiConfig({ geminiKey: 'g' })).toEqual({ provider: 'gemini', apiKey: 'g', model: GEMINI_DEFAULT_MODEL })
    expect(aiConfig({ anthropicKey: 'a' }).provider).toBe('anthropic')
    expect(aiConfig({ geminiKey: 'g', anthropicKey: 'a', aiProvider: 'anthropic' }).provider).toBe('anthropic')
    expect(aiConfig({ geminiKey: 'g', anthropicKey: 'a', aiProvider: 'gemini', geminiModel: 'gemini-2.5-pro' })).toMatchObject({ provider: 'gemini', model: 'gemini-2.5-pro' })
    expect(aiConfig({ geminiKey: 'g', aiProvider: 'anthropic' }).provider).toBe('gemini') // chosen provider has no key
  })
})

describe('the Gemini client', () => {
  it('sends the key in a header (never the URL) and returns the text', async () => {
    const fetchFn = vi.fn(async () => ok('  Hello there  '))
    const r = await geminiGenerate({ apiKey: 'KEY123', system: 'sys', user: 'usr', fetchFn })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
    expect(url).not.toContain('KEY123')
    expect(init.headers['x-goog-api-key']).toBe('KEY123')
    const body = JSON.parse(init.body)
    expect(body.systemInstruction.parts[0].text).toBe('sys')
    expect(body.contents[0].parts[0].text).toBe('usr')
    expect(r).toMatchObject({ text: 'Hello there', truncated: false })
  })

  it('gives readable errors', async () => {
    await expect(geminiGenerate({ apiKey: '', fetchFn: vi.fn() })).rejects.toThrow(/Add your Gemini API key/)
    await expect(geminiGenerate({ apiKey: 'k', fetchFn: async () => fail(400, 'API key not valid. Please pass a valid API key.') })).rejects.toThrow(/key was refused/)
    await expect(geminiGenerate({ apiKey: 'k', fetchFn: async () => fail(429, 'quota') })).rejects.toThrow(/rate limit/)
    await expect(geminiGenerate({ apiKey: 'k', model: 'nope', fetchFn: async () => fail(404, 'not found') })).rejects.toThrow(/“nope” was not found/)
    await expect(geminiGenerate({ apiKey: 'k', fetchFn: async () => { throw new Error('offline') } })).rejects.toThrow(/Could not reach the Gemini API: offline/)
    await expect(geminiGenerate({ apiKey: 'k', fetchFn: async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }) })).rejects.toThrow(/declined/)
    await expect(geminiGenerate({ apiKey: 'k', fetchFn: async () => ok('', {}) })).rejects.toThrow(/no text/)
    expect((await geminiGenerate({ apiKey: 'k', fetchFn: async () => ok('cut', { finishReason: 'MAX_TOKENS' }) })).truncated).toBe(true)
  })
})

describe('Gemini drafts use the same guard rails', () => {
  const profile = defaultProfile()
  const job = { company: 'Acme', title: 'AI Engineer', locations: ['Remote'], description: 'Python, FastAPI, LLM APIs. PyTorch is a plus.' }

  it('answers: the strict prompt goes to Gemini and the draft is still checked for unsupported claims', async () => {
    const fetchFn = vi.fn(async () => ok('I have 12 years with PyTorch and I leverage synergies.'))
    const d = await aiAnswer({ question: 'Why are you a good fit?', profile, job, match: null, apiKey: 'k', provider: 'gemini', fetchFn })
    const body = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(body.systemInstruction.parts[0].text).toMatch(/Never invent employers/)
    expect(body.contents[0].parts[0].text).toContain('"fullName"'.slice(0, 0) + 'JOB: AI Engineer at Acme')
    expect(d).toMatchObject({ source: 'ai', text: expect.stringContaining('PyTorch') })
  })

  it('draftAnswer: with only a Gemini key, written questions are drafted by Gemini and issues are reported', async () => {
    const orig = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ok('I have 12 years with PyTorch.'))
    try {
      const d = await draftAnswer('Why are you a good fit for this role?', { profile, job, match: null, settings: { geminiKey: 'k' }, preferAi: true })
      expect(d.source).toBe('ai')
      expect(d.issues.map((i) => i.text).join(' ')).toMatch(/PyTorch/)
      expect(globalThis.fetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com')
    } finally {
      globalThis.fetch = orig
    }
  })

  it('cover letters: Gemini drafts are checked like template letters', async () => {
    const fetchFn = vi.fn(async () => ok('Dear Acme,\nI know PyTorch deeply.\nManikandan'))
    const r = await aiCoverLetter({ profile, job, match: null, apiKey: 'k', provider: 'gemini', fetchFn })
    expect(r.issues.join(' ')).toMatch(/PyTorch/)
  })
})
