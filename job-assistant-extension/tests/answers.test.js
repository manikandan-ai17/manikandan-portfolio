// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classifyQuestion, templateAnswer, checkAnswer, draftAnswer, aiAnswer } from '../extension/src/lib/answers.js'
import { defaultProfile } from '../extension/src/lib/profile.js'
import { scoreJob } from '../extension/src/lib/match.js'
import { parseWorkable, parseSmartRecruitersDetail, portalOf } from '../extension/src/lib/sources.js'
import { manualJob, trackerRecord, trackerCsv } from '../extension/src/lib/store.js'

const profile = () => ({ ...defaultProfile(), city: 'Coimbatore' })
const job = { key: 'ashby:pinecone:1', company: 'Pinecone', title: 'Applied AI Engineer', locations: ['New York'], employmentType: 'full_time', description: 'What you will do:\n• Build LLM-powered applications and agents for customers in Python and TypeScript\n• Integrate LLM APIs into production backends with FastAPI\nNice to have: PyTorch.' }
const ctx = () => { const p = profile(); return { profile: p, job, match: scoreJob(job, p), settings: {} } }

describe('which questions are drafted, and how', () => {
  it('recognises the common questions', () => {
    expect(classifyQuestion('Tell us about yourself')).toBe('about_you')
    expect(classifyQuestion('Why Anthropic?')).toBe('why_company')
    expect(classifyQuestion('Why do you want to join Pinecone?')).toBe('why_company')
    expect(classifyQuestion('What is your most impactful project?')).toBe('impactful_project')
    expect(classifyQuestion('Why are you a good fit for this role?')).toBe('why_role')
    expect(classifyQuestion('Describe a difficult technical problem you solved')).toBe('technical_example')
  })
  it('never drafts sensitive questions, and treats personal and fact questions as yours', () => {
    expect(classifyQuestion('Will you require visa sponsorship?')).toBe('sensitive')
    expect(classifyQuestion('Please describe any disability accommodations')).toBe('sensitive')
    expect(classifyQuestion('What is your biggest weakness?')).toBe('personal')
    expect(classifyQuestion('What are your salary expectations?')).toBe('fact')
    expect(classifyQuestion('What is your notice period?')).toBe('fact')
  })
})

describe('template drafts use verified facts only', () => {
  it('"Tell us about yourself" follows your real path, oldest first', () => {
    const { text } = templateAnswer('Tell us about yourself', ctx())
    expect(text).toMatch(/^I'm a software engineer early in my career, based in Coimbatore\./)
    expect(text).toContain('Bachelor of Science in Computer Technology at KG College of Arts and Science in 2025')
    expect(text).toContain('I started as an AI Software Developer intern at Deep Tech Launchpad (Jul 2025 – Jan 2026), then joined as a Trainee Software Developer at AltiusNxt Technologies (Jan 2026 – Jul 2026), and now I\'m a Junior Software Developer there.')
    expect(checkAnswer(text, profile())).toEqual([])
  })

  it('"Why us" never invents your motivation: it asks you, and cannot be approved until you answer', () => {
    const { text } = templateAnswer('Why do you want to join Pinecone?', ctx())
    expect(text).toMatch(/\[your own reason for wanting to work at Pinecone/)
    const issues = checkAnswer(text, profile())
    expect(issues[0]).toMatchObject({ blocking: true })
    const p = profile()
    p.myWords.lookingFor = 'I want to work on AI products people rely on.'
    expect(templateAnswer('Why Pinecone?', { ...ctx(), profile: p }).text).toMatch(/^I want to work on AI products people rely on\./)
  })

  it('"Most impactful project" picks finished work, keeps its real status, and asks why it mattered', () => {
    const { text } = templateAnswer('What is your most impactful project?', ctx())
    expect(text).not.toMatch(/CatalogWiz/) // partial / reassigned work is not presented as the proudest
    expect(text).toMatch(/\[one or two sentences on why it mattered/)
  })

  it('"Why a good fit" quotes the posting duties you already do and states your experience honestly', () => {
    const { text } = templateAnswer('Why are you a good fit for this role?', ctx())
    expect(text).toContain('“build LLM-powered applications and agents for customers in Python and TypeScript”')
    expect(text).toContain('I have about 1 year of professional experience')
    expect(text).not.toMatch(/PyTorch/)
    expect(checkAnswer(text, profile())).toEqual([])
  })
})

describe('checks before approval', () => {
  it('flags unsupported skills, invented numbers, stock phrases and over-long answers', () => {
    const issues = checkAnswer('I am passionate about PyTorch and led a team of 12.', profile(), { maxLength: 20 })
    const t = issues.map((i) => i.text).join(' | ')
    expect(t).toMatch(/PyTorch, which your profile does not show/)
    expect(t).toMatch(/"12"/)
    expect(t).toMatch(/passionate about/)
    expect(issues.find((i) => /characters/.test(i.text)).blocking).toBe(true)
  })
})

describe('drafting routes', () => {
  it('sensitive → nothing; facts → from the profile or ask; personal without AI → ask', async () => {
    expect((await draftAnswer('Do you require visa sponsorship?', ctx())).source).toBe('none')
    const c = ctx()
    c.profile.eligibility.noticePeriod = '30 days'
    expect(await draftAnswer('What is your notice period?', c)).toMatchObject({ source: 'profile', text: '30 days' })
    expect(await draftAnswer('What are your salary expectations?', ctx())).toMatchObject({ source: 'none', needs: true })
    expect(await draftAnswer('What is your biggest weakness?', ctx())).toMatchObject({ source: 'none', needs: true })
  })

  it('other questions use Claude when you added a key — with the strict rules and fallbacks — and are checked', async () => {
    const sent = []
    class Anthropic {
      constructor(o) { this.beta = { messages: { create: async (b) => (sent.push({ o, b }), { stop_reason: 'end_turn', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'I use Gemini through its API at work, and PyTorch daily.' }] }) } } }
    }
    Object.assign(Anthropic, { APIError: class extends Error {}, AuthenticationError: class extends Error {}, RateLimitError: class extends Error {} })
    const c = { ...ctx(), settings: { anthropicKey: 'sk-test', model: 'claude-opus-5-5' }, Anthropic }
    const d = await draftAnswer('What are your favourite AI tools?', c)
    expect(d.source).toBe('ai')
    expect(sent[0].b).toMatchObject({ model: 'claude-opus-5-5', betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', output_config: { effort: 'medium' } })
    expect(sent[0].b.system).toMatch(/Never invent/)
    expect(sent[0].b.system).toMatch(/square brackets/)
    expect(d.issues.map((i) => i.text)).toContain('Mentions PyTorch, which your profile does not show')
    // The common questions still use the template unless you ask for an AI draft.
    expect((await draftAnswer('Tell us about yourself', c)).source).toBe('template')
    expect((await draftAnswer('Tell us about yourself', { ...c, preferAi: true })).source).toBe('ai')
  })

  it('without a key, AI drafting says what to do', async () => {
    await expect(aiAnswer({ question: 'x', ...ctx(), apiKey: '' })).rejects.toThrow(/Add an AI key/)
    expect((await draftAnswer('What are your favourite AI tools?', ctx())).note).toMatch(/own words/)
  })
})

describe('more job sites', () => {
  it('Workable and SmartRecruiters postings', () => {
    const [w] = parseWorkable({ jobs: [{ title: 'ML Engineer', shortcode: 'ABC', url: 'https://apply.workable.com/j/ABC', application_url: 'https://apply.workable.com/j/ABC/apply', city: 'Paris', country: 'France', telecommuting: true, employment_type: 'Full-time', description: '<p>Python</p>', published_on: '2026-05-29' }] }, { company: 'Hugging Face', token: 'huggingface' })
    expect(w).toMatchObject({ key: 'workable:huggingface:ABC', locations: ['Paris, France', 'Remote'], employmentType: 'full_time', applyUrl: 'https://apply.workable.com/j/ABC/apply', description: 'Python' })
    const s = parseSmartRecruitersDetail({ id: '7', name: 'AI Engineer', location: { city: 'Bengaluru', country: 'in', fullLocation: 'Bengaluru, , India' }, typeOfEmployment: { label: 'Full-time' }, postingUrl: 'p', applyUrl: 'a', jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>LLM apps</p>' } } } }, { company: 'Freshworks', token: 'Freshworks' })
    expect(s).toMatchObject({ key: 'smartrecruiters:Freshworks:7', locations: ['Bengaluru, India'], applyUrl: 'a' })
    expect(s.description).toMatch(/LLM apps/)
  })
  it('names the job site of a link', () => {
    expect(portalOf('https://job-boards.greenhouse.io/anthropic/jobs/1')).toBe('Greenhouse')
    expect(portalOf('https://www.linkedin.com/jobs/view/1')).toBe('LinkedIn')
    expect(portalOf('https://in.indeed.com/viewjob?jk=1')).toBe('Indeed')
    expect(portalOf('https://careers.example.ai/jobs/1')).toBe('Company site (careers.example.ai)')
  })
  it('a job added by hand is scored and tracked with its site, and the CSV carries the answers', () => {
    const j = manualJob({ portal: 'LinkedIn', company: 'Sarvam AI', title: 'AI Engineer', url: 'https://www.linkedin.com/jobs/view/1', location: 'Bengaluru, India', description: 'Python and LLM APIs. 0-2 years.' })
    expect(j).toMatchObject({ ats: 'manual', portal: 'LinkedIn', locations: ['Bengaluru, India'] })
    expect(manualJob({ company: 'Sarvam AI', title: 'AI Engineer', url: 'https://www.linkedin.com/jobs/view/1' }).key).toBe(j.key)
    const rec = { ...trackerRecord(j, scoreJob(j, profile())), status: 'applied', answers: [{ question: 'Why Sarvam?', answer: 'Because …' }] }
    expect(rec.portal).toBe('LinkedIn')
    const csv = trackerCsv({ [j.key]: rec })
    expect(csv.split('\r\n')[0]).toMatch(/portal/)
    expect(csv).toContain('Q: Why Sarvam?')
  })
})

// ── The panel's written answers, on a form shaped like Greenhouse's ──

describe('written answers on the application page', () => {
  let store
  beforeEach(async () => {
    store = { profile: profile(), resumes: [], pendingApply: { k: { jobKey: 'k', jobId: '123', company: 'Pinecone', title: 'Applied AI Engineer', answers: [{ question: 'Tell us about yourself.', kind: 'about_you', text: 'Approved on the dashboard.' }] } }, tracker: {} }
    globalThis.chrome = {
      storage: { local: { get: async (keys) => Object.fromEntries([keys].flat().map((k) => [k, store[k]])), set: async (o) => Object.assign(store, o) } },
      runtime: { sendMessage: vi.fn(async (m) => (m.type === 'draftAnswers' ? { ok: true, drafts: m.questions.map((q) => ({ id: q.id, question: q.text, kind: 'why_company', source: 'template', text: '[your own reason] The role matches.', issues: [{ text: 'Replace the bracketed part', blocking: true }] })) } : { ok: true, issues: [] })) },
    }
    Element.prototype.getBoundingClientRect = () => ({ width: 100, height: 20 })
    history.replaceState(null, '', '/pinecone/jobs/123')
    document.body.innerHTML = `<form><label for="first_name">First Name*</label><input id="first_name"><label for="email">Email*</label><input id="email">
      <label for="q1">Why Pinecone?*</label><textarea id="q1" maxlength="1000"></textarea>
      <label for="q2">Do you require visa sponsorship?</label><textarea id="q2"></textarea></form>`
    window.__jobAssistLoaded = false
    await import('../extension/src/content/fieldmap.js')
    await import('../extension/src/content/autofill.js?' + Math.random())
  })

  it('finds the written questions (not the sensitive one) and asks the background for drafts with the job and your approved answers', async () => {
    const qs = globalThis.__jobAssist.writtenQuestions()
    expect(qs.map((q) => q.text)).toEqual(['Why Pinecone?'])
    expect(qs[0].maxLength).toBe(1000)
  })

  it('records the job site and the answers you put in the form when you mark it applied', async () => {
    globalThis.__jobAssist.inserted.set('Why Pinecone?', 'My own answer.')
    const rec = await globalThis.__jobAssist.markApplied()
    expect(rec).toMatchObject({ status: 'applied', title: 'Applied AI Engineer', company: 'Pinecone', answers: [{ question: 'Why Pinecone?', answer: 'My own answer.' }] })
    expect(rec.portal).toMatch(/Company site|Greenhouse/)
    expect(store.pendingApply.k).toBeUndefined()
  })
})

// ── The background worker: answers you approved on the dashboard are reused ──

describe('background drafting', () => {
  it('reuses an approved dashboard answer of the same kind, and drafts the rest', async () => {
    let handler
    const data = { profileUser: null, settings: {}, jobs: {}, manualJobs: {} }
    globalThis.chrome = {
      storage: { local: { get: async (k) => Object.fromEntries([k].flat().filter((x) => x in data).map((x) => [x, data[x]])), set: async (o) => Object.assign(data, o) } },
      runtime: { onMessage: { addListener: (f) => (handler = f) } },
    }
    const { useStorage } = await import('../extension/src/lib/store.js')
    useStorage(globalThis.chrome.storage.local)
    await import('../extension/src/background.js?' + Math.random())
    const reply = await new Promise((resolve) => handler({ type: 'draftAnswers', jobKey: null, page: { title: 'AI Engineer', company: 'Acme', description: 'Python, LLM APIs' }, approved: [{ question: 'Tell us about yourself.', kind: 'about_you', text: 'My approved intro.' }], questions: [{ id: '0', text: 'Tell us a bit about you' }, { id: '1', text: 'Why are you a good fit for this role?' }, { id: '2', text: 'Gender' }] }, {}, resolve))
    expect(reply.ok).toBe(true)
    const [a, b, c] = reply.drafts
    expect(a).toMatchObject({ source: 'dashboard', text: 'My approved intro.' })
    expect(b.source).toBe('template')
    expect(c.source).toBe('none')
  })
})
