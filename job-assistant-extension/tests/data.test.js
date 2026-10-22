import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { parseGreenhouse, parseAshby, parseLever, parseWorkdayDetail, employmentTypeOf } from '../extension/src/lib/sources.js'
import { findDuplicate, trackerRecord, withStatus, trackerCsv, similarKey } from '../extension/src/lib/store.js'
import { parseCsv, readLinkedInFiles, importLinkedInZip } from '../extension/src/lib/linkedin.js'
import { runSearch } from '../extension/src/lib/pipeline.js'
import { defaultProfile } from '../extension/src/lib/profile.js'
import { htmlToText } from '../extension/src/lib/text.js'

// Shapes copied from the live feeds (Oct 2026), trimmed.
const GH = { jobs: [{ id: 5456619008, title: 'AI Engineer, New Grad', absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/5456619008', location: { name: 'San Francisco, CA | Remote' }, metadata: [{ name: 'Location Type', value: 'On-Site' }], content: '&lt;p&gt;Build with &lt;strong&gt;Python&lt;/strong&gt; &amp;amp; LLMs.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;FastAPI&lt;/li&gt;&lt;/ul&gt;', first_published: '2026-10-19T11:17:24-04:00' }] }
const ASHBY = { jobs: [{ id: 'a571b8e4', title: 'Applied AI Engineer', jobUrl: 'https://jobs.ashbyhq.com/elevenlabs/a571b8e4', applyUrl: 'https://jobs.ashbyhq.com/elevenlabs/a571b8e4/application', location: 'United Kingdom', secondaryLocations: [{ location: 'Dublin' }], isRemote: true, employmentType: 'FullTime', descriptionPlain: 'Python, LLMs', publishedAt: '2026-03-12T16:38:15.322+00:00', isListed: true, compensation: { compensationTierSummary: '$100K' } }, { id: 'x', title: 'Hidden', isListed: false }] }

describe('job-board feeds', () => {
  it('Greenhouse: decodes its escaped HTML and splits locations', () => {
    const [j] = parseGreenhouse(GH, { company: 'Acme', token: 'acme' })
    expect(j).toMatchObject({ key: 'greenhouse:acme:5456619008', title: 'AI Engineer, New Grad', locations: ['San Francisco, CA', 'Remote'], remote: true, applyUrl: GH.jobs[0].absolute_url })
    expect(j.description).toBe('Build with Python & LLMs.\n• FastAPI')
  })
  it('Ashby: skips unlisted jobs and keeps the application URL', () => {
    const jobs = parseAshby(ASHBY, { company: 'ElevenLabs', token: 'elevenlabs' })
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ locations: ['United Kingdom', 'Dublin'], employmentType: 'full_time', remote: true, compensation: '$100K', applyUrl: ASHBY.jobs[0].applyUrl })
  })
  it('Lever and Workday', () => {
    const [l] = parseLever([{ id: 'l1', text: 'Python Developer', hostedUrl: 'h', applyUrl: 'a', categories: { location: 'Paris', commitment: 'Internship' }, descriptionPlain: 'Python', lists: [{ text: 'Requirements', content: '<li>FastAPI</li>' }], createdAt: 1760000000000 }], { company: 'X', token: 'x' })
    expect(l).toMatchObject({ employmentType: 'internship', applyUrl: 'a' })
    expect(l.description).toMatch(/Requirements\n• FastAPI/)
    const w = parseWorkdayDetail({ jobPostingInfo: { jobReqId: 'JR1', title: 'AI Engineer', location: 'India, Bengaluru', timeType: 'Full time', externalUrl: 'u', jobDescription: '<p>Python</p>' } }, { company: 'NVIDIA', tenant: 'nvidia' })
    expect(w).toMatchObject({ key: 'workday:nvidia:JR1', employmentType: 'full_time', description: 'Python' })
  })
  it('"intern" means an internship only as a word (not Internal / International)', () => {
    expect(employmentTypeOf('FullTime', 'Internal Communications')).toBe('full_time')
    expect(employmentTypeOf('FullTime', 'International Payroll')).toBe('full_time')
    expect(employmentTypeOf(null, 'ML Intern (Winter 2027)')).toBe('internship')
  })
  it('htmlToText strips scripts', () => {
    expect(htmlToText('<script>alert(1)</script><p>Hi</p>')).toBe('Hi')
  })
})

describe('tracker', () => {
  const j = { key: 'ashby:openai:1', company: 'OpenAI', title: 'Applied AI Engineer (London)', url: 'u', applyUrl: 'a', locations: [] }
  it('records status history and the resume version when applied', () => {
    let r = trackerRecord(j, { score: 72, verdict: 'strong' }, new Date('2026-10-01'))
    r = withStatus(r, 'applied', { resumeVersion: 'General', now: new Date('2026-10-02') })
    expect(r.status).toBe('applied')
    expect(r.appliedAt).toBe('2026-10-02T00:00:00.000Z')
    expect(r.resumeVersion).toBe('General')
    expect(r.history.map((x) => x.status)).toEqual(['shortlisted', 'applied'])
    expect(() => withStatus(r, 'teleported')).toThrow()
  })
  it('finds the same job and the same role at the same company (another city or a repost)', () => {
    const applied = { ...withStatus(trackerRecord(j, null), 'applied') }
    const t = { [j.key]: applied }
    expect(findDuplicate(t, j).kind).toBe('same job')
    expect(findDuplicate(t, { ...j, key: 'ashby:openai:2', title: 'Applied AI Engineer (Paris)' }).kind).toBe('same role at this company')
    expect(findDuplicate(t, { ...j, key: 'ashby:openai:3', title: 'Research Engineer' })).toBeNull()
    expect(findDuplicate({ [j.key]: trackerRecord(j, null) }, j)).toBeNull() // only shortlisted, not applied
    expect(similarKey('OpenAI', 'Applied AI Engineer (London)')).toBe(similarKey('openai', 'Applied AI Engineer'))
  })
  it('exports CSV without letting a cell become an Excel formula', () => {
    const csv = trackerCsv({ a: { ...trackerRecord(j, null), notes: '=HYPERLINK("x")' } })
    expect(csv.split('\r\n')[0]).toBe('company,title,status,appliedAt,resumeVersion,score,verdict,locations,employmentType,applyUrl,notes')
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
  })
})

// A minimal ZIP writer (deflate), to test the importer the way LinkedIn's archive is built.
function zip(files) {
  const enc = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const nameB = enc.encode(name)
    const data = deflateRawSync(Buffer.from(text))
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(text.length, 22); local.writeUInt16LE(nameB.length, 26)
    parts.push(local, nameB, data)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(text.length, 24); c.writeUInt16LE(nameB.length, 28); c.writeUInt32LE(offset, 42)
    central.push(c, nameB)
    offset += 30 + nameB.length + data.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  const buf = Buffer.concat([...parts, cd, end])
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('LinkedIn data export', () => {
  it('parses quoted CSV with commas and newlines', () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2"\n')).toEqual([['a', 'b'], ['x, y', 'line1\nline2']])
  })
  it('reads the profile files out of the export ZIP (including files that start with notes)', async () => {
    const data = await importLinkedInZip(zip({
      'Profile.csv': 'First Name,Last Name,Headline,Summary,Geo Location\nManikandan,Santhosh,Software Engineer,"Builds LLM apps, mostly Python",Coimbatore\n',
      'Positions.csv': 'Company Name,Title,Description,Location,Started On,Finished On\nAltiusNxt Technologies,Junior Software Developer,"Outreach platform",Coimbatore,Jul 2026,\n',
      'Skills.csv': 'Name\nPython\nFastAPI\n',
      'Languages.csv': 'Name,Proficiency\nEnglish,Professional working proficiency\nTamil,Native or bilingual proficiency\n',
      'Connections.csv': 'Notes:\n"When exporting your connection data…"\n\nFirst Name,Last Name\nA,B\n',
      'Rich_Media.csv': 'Date/Time\nx\n',
    }))
    expect(data.name).toBe('Manikandan Santhosh')
    expect(data.positions[0]).toMatchObject({ company: 'AltiusNxt Technologies', title: 'Junior Software Developer', end: null })
    expect(data.skills).toEqual(['Python', 'FastAPI'])
    expect(data.languages.map((l) => l.name)).toEqual(['English', 'Tamil'])
    expect(data.filesFound.sort()).toEqual(['Languages.csv', 'Positions.csv', 'Profile.csv', 'Skills.csv'])
  })
  it('refuses a ZIP that is not a LinkedIn export', async () => {
    await expect(importLinkedInZip(zip({ 'notes.csv': 'x\n1\n' }))).rejects.toThrow(/No LinkedIn profile files/)
    await expect(importLinkedInZip(new TextEncoder().encode('hello').buffer)).rejects.toThrow(/not a ZIP/)
  })
  it('LinkedIn skills you listed are evidence only as "self-listed"', () => {
    const files = new Map([['Skills.csv', 'Name\nPyTorch\n']])
    expect(readLinkedInFiles(files).skills).toEqual(['PyTorch'])
  })
})

describe('a run', () => {
  it('reads each board, scores engineering roles only, and reports a failing board without stopping', async () => {
    const fetchFn = async (url) => {
      if (url.includes('greenhouse')) return new Response(JSON.stringify({ jobs: [GH.jobs[0], { ...GH.jobs[0], id: 2, title: 'Recruiter' }] }))
      if (url.includes('ashby')) return new Response('nope', { status: 500 })
      throw new Error('unexpected ' + url)
    }
    const p = defaultProfile()
    const res = await runSearch({ sources: [{ company: 'Acme', ats: 'greenhouse', token: 'acme' }, { company: 'Down', ats: 'ashby', token: 'down' }], profile: p, fetchFn })
    expect(Object.keys(res.jobs)).toEqual(['greenhouse:acme:5456619008'])
    expect(res.meta.perSource[0]).toMatchObject({ total: 2, relevant: 1, error: null })
    expect(res.meta.perSource[1].error).toMatch(/HTTP 500/)
  })
})
