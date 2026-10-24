import { describe, expect, it } from 'vitest'
import { scoreJob, isRelevantTitle, yearsRequired, countriesOf, splitRequirements } from '../extension/src/lib/match.js'
import { defaultProfile } from '../extension/src/lib/profile.js'

const profile = (over = {}) => {
  const p = defaultProfile()
  p.eligibility = { ...p.eligibility, authorizedCountries: ['India'], needsSponsorshipElsewhere: true, openToRelocate: true, languages: [{ name: 'English' }], ...over }
  return p
}
const job = (over = {}) => ({ key: 'k', company: 'Acme AI', title: 'AI Engineer', locations: ['Bengaluru, India'], remote: false, employmentType: 'full_time', description: 'Build LLM applications in Python and FastAPI. Integrate LLM APIs, process PDF documents.', ...over })

describe('which titles are looked at', () => {
  it('keeps engineering roles in your background and drops everything else', () => {
    for (const t of ['AI Engineer', 'Applied AI Engineer', 'Software Engineer, New Grad', 'Python Developer', 'Machine Learning Engineer', 'Software Engineering Intern (Summer 2027)', 'Computer Vision Engineer', 'Forward Deployed Engineer'])
      expect(isRelevantTitle(t), t).toBe(true)
    for (const t of ['Account Executive', 'Recruiting Coordinator', 'Internal Communications Lead', 'International Payroll Operations', 'Product Manager, API', 'AV Engineer, Builds and Design', 'Junior IT Support Engineer', 'ASIC Verification Engineer', 'Engineering Team Lead, Storage'])
      expect(isRelevantTitle(t), t).toBe(false)
  })
})

describe('blockers', () => {
  it('blocks senior titles', () => {
    const r = scoreJob(job({ title: 'Senior AI Engineer' }), profile())
    expect(r.verdict).toBe('blocked')
    expect(r.blockers[0].text).toMatch(/Senior-level/)
  })

  it('blocks "5+ years" when it is a requirement, with the words that triggered it', () => {
    const r = scoreJob(job({ description: 'Requirements:\n• 5+ years of experience building backend systems in Python' }), profile())
    expect(r.verdict).toBe('blocked')
    expect(r.blockers[0].text).toBe('Asks for 5+ years of experience; you have about 1')
    expect(r.blockers[0].evidence).toMatch(/5\+ years of experience/)
  })

  it('only warns when the years are under "preferred qualifications"', () => {
    const r = scoreJob(job({ description: 'You will build LLM apps in Python.\nPreferred qualifications:\n• 4+ years of experience in a relevant field' }), profile())
    expect(r.verdict).not.toBe('blocked')
    expect(r.warnings.map((w) => w.text)).toContain('Prefers 4+ years (listed as preferred, not required)')
  })

  it('blocks internships for current students (you graduated in 2025), but only warns if recent graduates may apply', () => {
    const intern = { title: 'Software Engineering Intern', employmentType: 'internship' }
    expect(scoreJob(job({ ...intern, description: 'You must be currently enrolled in a bachelor’s degree program.' }), profile()).verdict).toBe('blocked')
    expect(scoreJob(job({ ...intern, description: 'Expected graduation date in Fall 2027 or Spring 2028.' }), profile()).verdict).toBe('blocked')
    // NVIDIA's wording (Oct 2026): no article before the degree.
    expect(scoreJob(job({ ...intern, description: 'What we need to see:\n• Pursuing MS or PhD degree from a leading university in computer science' }), profile()).verdict).toBe('blocked')
    const r = scoreJob(job({ ...intern, description: 'Currently enrolled in a degree, or a recent graduate. Python.' }), profile())
    expect(r.verdict).not.toBe('blocked')
    expect(r.warnings[0].text).toMatch(/recent graduates/)
  })

  it('blocks a required PhD or master’s degree', () => {
    expect(scoreJob(job({ description: 'A PhD in machine learning is required.' }), profile()).blockers[0].text).toMatch(/PhD/)
    expect(scoreJob(job({ description: "Master's degree required in computer science." }), profile()).blockers[0].text).toMatch(/master/)
  })

  it('blocks a role that needs a visa when the posting says it does not sponsor', () => {
    const r = scoreJob(job({ locations: ['San Francisco, CA'], description: 'Python, LLMs. We are unable to sponsor visas for this role.' }), profile())
    expect(r.verdict).toBe('blocked')
    expect(r.blockers[0].text).toMatch(/does not sponsor/)
  })

  it('blocks a required language you do not speak', () => {
    const r = scoreJob(job({ locations: ['Paris, France'], description: 'Fluent French is required. Python and LLM APIs.' }), profile())
    expect(r.blockers.some((b) => /French/.test(b.text))).toBe(true)
  })
})

describe('when your answers are missing, it warns instead of guessing', () => {
  it('visa and language checks become warnings', () => {
    const p = defaultProfile()
    const r = scoreJob(job({ locations: ['London, UK'], description: 'Fluent German is required. Python.' }), p)
    expect(r.blockers).toEqual([])
    expect(r.warnings.map((w) => w.text).join(' ')).toMatch(/set your work authorization/)
    expect(r.warnings.map((w) => w.text).join(' ')).toMatch(/add your languages/)
  })
})

describe('skills are matched to evidence', () => {
  it('separates work experience, projects and gaps', () => {
    const r = scoreJob(job({ description: 'Requirements: Python, FastAPI, computer vision, PyTorch, CUDA kernels.' }), profile())
    const by = Object.fromEntries(r.matched.map((m) => [m.skill, m.level]))
    expect(by.Python).toBe('professional')
    expect(by.FastAPI).toBe('professional')
    expect(by['Computer vision']).toBe('project') // the CAD drawing agent, not a job
    expect(r.gaps.map((g) => g.skill)).toEqual(expect.arrayContaining(['PyTorch', 'CUDA / GPU programming']))
  })

  it('does not count C++ from coursework as experience', () => {
    const r = scoreJob(job({ description: 'Strong C++ required.' }), profile())
    expect(r.partial.find((p) => p.skill === 'C++')?.level).toBe('education')
    expect(r.matched.find((m) => m.skill === 'C++')).toBeUndefined()
  })
})

describe('scores', () => {
  it('an entry-level AI role in India that matches your stack is a strong match', () => {
    const r = scoreJob(job({ title: 'Junior AI Engineer', description: 'Entry-level. Python, FastAPI, LLM APIs, prompt engineering, PDF document processing, automation.' }), profile())
    expect(r.verdict).toBe('strong')
    expect(r.score).toBeGreaterThanOrEqual(70)
  })

  it('a role abroad with no sponsorship statement is flagged to check', () => {
    const r = scoreJob(job({ locations: ['New York, NY'] }), profile())
    expect(r.warnings.some((w) => /does not say whether it sponsors/.test(w.text))).toBe(true)
  })
})

describe('helpers', () => {
  it('reads years, countries and the nice-to-have split', () => {
    expect(yearsRequired('at least three years of professional experience')?.years).toBe(3)
    expect(yearsRequired('We were founded 5 years ago.')).toBeNull()
    expect(countriesOf('San Francisco, CA | Seattle, WA')).toEqual(['United States'])
    expect(countriesOf('Remote - India')).toEqual(['India'])
    expect(countriesOf('Doha, Qatar')).toEqual(['Qatar'])
    expect(splitRequirements('Must: Python. Nice to have: Rust.').preferred).toMatch(/Rust/)
  })
})
