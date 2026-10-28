import { describe, expect, it } from 'vitest'
import { parseEducation, parseExperience, parseProjects, parseSkills, formatEducation, formatExperience, formatProjects, formatSkills, applyIdentity, missingIdentity, splitName } from '../extension/src/lib/identity.js'
import { skillEvidence, SKILLS } from '../extension/src/lib/profile.js'
import { withDefaults, defaultProfile } from '../extension/src/lib/profile.js'

describe('Your details (public edition)', () => {
  it('turns typed lines into the same shapes the portfolio edition uses', () => {
    expect(parseEducation('Example College | B.Sc. Computer Science | 2021–2024 | CGPA 8.2')).toEqual([{ school: 'Example College', degree: 'B.Sc. Computer Science', start: '2021', end: '2024', gpa: '8.2', notes: [] }])
    expect(parseEducation('Uni | MCA | 2025')[0]).toMatchObject({ start: null, end: '2025', gpa: null })
    expect(parseExperience('Intern | Acme | Jun–Dec 2024 | Built APIs | Python, FastAPI')[0]).toMatchObject({ title: 'Intern', company: 'Acme', dates: 'Jun–Dec 2024', summary: 'Built APIs', tech: ['Python', 'FastAPI'] })
    expect(parseProjects('Job Tracker | Tracks jobs | Python, SQLite')[0]).toMatchObject({ id: 'job-tracker', name: 'Job Tracker', status: 'Personal project', github: null, tech: ['Python', 'SQLite'] })
    expect(parseSkills('Languages: Python, TypeScript\nWeb: React')).toEqual([{ domain: 'Languages', items: ['Python', 'TypeScript'] }, { domain: 'Web', items: ['React'] }])
    expect(parseEducation('')).toEqual([])
  })

  it('round-trips what the editor shows', () => {
    const edu = 'Example College | B.Sc. | 2021–2024 | CGPA 8.2'
    expect(formatEducation(parseEducation(edu))).toBe(edu)
    const exp = 'Intern | Acme | 2024 | Built APIs | Python'
    expect(formatExperience(parseExperience(exp))).toBe(exp)
    const prj = 'Tracker | Tracks jobs | Python | Finished | https://github.com/a/b'
    expect(formatProjects(parseProjects(prj))).toBe(prj)
    expect(formatSkills(parseSkills('Web: React, Node.js'))).toBe('Web: React, Node.js')
  })

  it('what you type becomes evidence; what you do not type is never claimed', () => {
    const p = applyIdentity(defaultProfile(), { fullName: 'Asha Rao', skillGroups: parseSkills('Languages: Python'), projects: parseProjects('Chatbot | Answers questions with an LLM | Python') })
    expect(p).toMatchObject({ fullName: 'Asha Rao', firstName: 'Asha', lastName: 'Rao' })
    const ev = skillEvidence({ ...p, experience: [], education: [], github: null, linkedin: null })
    expect(ev.get('Python')).toBeTruthy()
    expect(ev.has('Kubernetes')).toBe(false)
    expect(ev.has('PyTorch')).toBe(false)
  })

  it('empty fields change nothing, and a saved identity survives a reload', () => {
    expect(applyIdentity({ fullName: 'A', links: { github: 'g' } }, { fullName: '  ', links: { github: '' } })).toMatchObject({ fullName: 'A', links: { github: 'g' } })
    const stored = { identity: { fullName: 'Asha Rao', education: parseEducation('X | B.Sc. | 2022–2025') }, eligibility: { graduationYear: null } }
    const p = withDefaults(stored)
    expect(p.fullName).toBe('Asha Rao')
    expect(p.eligibility.graduationYear).toBe(2025)
    expect(p.identity).toBe(stored.identity)
  })

  it('names what a new user still has to type', () => {
    expect(missingIdentity({ fullName: '', email: '', experience: [], projects: [], skillGroups: [] }).map((m) => m.field)).toEqual(['fullName', 'email', 'skills'])
    expect(missingIdentity({ fullName: 'A', email: 'a@b.c', experience: [], projects: [], skillGroups: [{ domain: 'x', items: ['y'] }] })).toEqual([])
    expect(splitName('  Asha  Rao Nair ')).toEqual({ firstName: 'Asha', lastName: 'Rao Nair' })
    expect(SKILLS.length).toBeGreaterThan(10)
  })
})
