// Official, public job-board feeds. Each company publishes these itself for its careers page, so nothing is
// scraped and no login is used. Every adapter returns the same normalized job shape:
//   { key, ats, company, id, title, locations[], remote, employmentType, url, applyUrl, description, postedAt, compensation }

import { htmlToText } from './text.js'

export const DEFAULT_SOURCES = [
  { company: 'Anthropic', ats: 'greenhouse', token: 'anthropic', enabled: true },
  { company: 'OpenAI', ats: 'ashby', token: 'openai', enabled: true },
  { company: 'Mistral AI', ats: 'ashby', token: 'mistral.ai', enabled: true },
  { company: 'ElevenLabs', ats: 'ashby', token: 'elevenlabs', enabled: true },
  { company: 'NVIDIA', ats: 'workday', host: 'nvidia.wd5.myworkdayjobs.com', tenant: 'nvidia', site: 'NVIDIAExternalCareerSite', enabled: true },
  { company: 'Cohere', ats: 'ashby', token: 'cohere', enabled: true },
  { company: 'Perplexity', ats: 'ashby', token: 'perplexity', enabled: true },
  { company: 'LangChain', ats: 'ashby', token: 'langchain', enabled: true },
  { company: 'Scale AI', ats: 'greenhouse', token: 'scaleai', enabled: true },
  { company: 'xAI', ats: 'greenhouse', token: 'xai', enabled: true },
  { company: 'Together AI', ats: 'greenhouse', token: 'togetherai', enabled: true },
  { company: 'Pinecone', ats: 'ashby', token: 'pinecone', enabled: true },
  { company: 'Runway', ats: 'ashby', token: 'runway', enabled: true },
  { company: 'Stability AI', ats: 'greenhouse', token: 'stabilityai', enabled: true },
]

export const sourceId = (s) => (s.ats === 'workday' ? `workday:${s.tenant}` : `${s.ats}:${s.token}`)

const INTERN_RE = /\bintern(s|ship|ships)?\b|\bco-?op\b|\bapprentice(ship)?\b/i

/** 'FullTime' / 'Full time' / 'Intern' … → full_time | internship | contract | part_time | null. */
export function employmentTypeOf(raw, title = '') {
  const s = String(raw ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  if (INTERN_RE.test(title) || s.includes('intern')) return 'internship'
  if (s.includes('fulltime') || s === 'permanent' || s === 'regular') return 'full_time'
  if (s.includes('parttime')) return 'part_time'
  if (s.includes('contract') || s.includes('temporary') || s.includes('temp')) return 'contract'
  return null
}

const iso = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
const splitLocations = (s) =>
  String(s ?? '')
    .split(/\s*[|;]\s*|\s+or\s+|\s*\/\s*(?=[A-Z])/)
    .map((x) => x.trim())
    .filter(Boolean)
const isRemoteText = (s) => /\bremote\b|\banywhere\b|\bdistributed\b/i.test(s)

// ── Greenhouse ───────────────────────────────────────────────────────────────

export function parseGreenhouse(json, src) {
  return (json?.jobs ?? []).map((j) => {
    const locations = splitLocations(j.location?.name)
    const locType = (j.metadata ?? []).find((m) => /location type|workplace/i.test(m?.name ?? ''))?.value
    return {
      key: `greenhouse:${src.token}:${j.id}`,
      ats: 'greenhouse',
      company: src.company,
      id: String(j.id),
      title: String(j.title ?? '').trim(),
      locations,
      remote: /remote/i.test(String(locType ?? '')) || locations.some(isRemoteText) || null,
      employmentType: employmentTypeOf(null, j.title),
      url: j.absolute_url,
      applyUrl: j.absolute_url,
      description: htmlToText(j.content),
      postedAt: iso(j.first_published ?? j.updated_at),
      compensation: null,
    }
  })
}

// ── Ashby ────────────────────────────────────────────────────────────────────

export function parseAshby(json, src) {
  return (json?.jobs ?? [])
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const locations = [j.location, ...(j.secondaryLocations ?? []).map((l) => l?.location)].filter(Boolean).map(String)
      return {
        key: `ashby:${src.token}:${j.id}`,
        ats: 'ashby',
        company: src.company,
        id: String(j.id),
        title: String(j.title ?? '').trim(),
        locations,
        remote: j.isRemote === true || locations.some(isRemoteText) || (j.isRemote === false ? false : null),
        employmentType: employmentTypeOf(j.employmentType, j.title),
        url: j.jobUrl,
        applyUrl: j.applyUrl ?? j.jobUrl,
        description: j.descriptionPlain ? String(j.descriptionPlain).trim() : htmlToText(j.descriptionHtml),
        postedAt: iso(j.publishedAt),
        compensation: j.compensation?.compensationTierSummary ?? null,
      }
    })
}

// ── Lever (for companies you add yourself) ──────────────────────────────────

export function parseLever(json, src) {
  return (Array.isArray(json) ? json : []).map((j) => {
    const lists = (j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join('\n\n')
    const locations = [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).map(String)
    return {
      key: `lever:${src.token}:${j.id}`,
      ats: 'lever',
      company: src.company,
      id: String(j.id),
      title: String(j.text ?? '').trim(),
      locations: [...new Set(locations)],
      remote: j.workplaceType === 'remote' || locations.some(isRemoteText) || null,
      employmentType: employmentTypeOf(j.categories?.commitment, j.text),
      url: j.hostedUrl,
      applyUrl: j.applyUrl ?? j.hostedUrl,
      description: [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join('\n\n').trim(),
      postedAt: iso(j.createdAt),
      compensation: j.salaryRange ? `${j.salaryRange.min}–${j.salaryRange.max} ${j.salaryRange.currency ?? ''}`.trim() : null,
    }
  })
}

// ── Workday (NVIDIA): a search list, then one detail call per job ───────────

export function parseWorkdayListItem(item) {
  return { title: String(item.title ?? '').trim(), path: item.externalPath, locationsText: item.locationsText ?? '' }
}

export function parseWorkdayDetail(json, src) {
  const i = json?.jobPostingInfo ?? {}
  const locations = [i.location, ...(i.additionalLocations ?? [])].filter(Boolean).map(String)
  return {
    key: `workday:${src.tenant}:${i.jobReqId ?? i.id}`,
    ats: 'workday',
    company: src.company,
    id: String(i.jobReqId ?? i.id),
    title: String(i.title ?? '').trim(),
    locations,
    remote: locations.some(isRemoteText) || null,
    employmentType: employmentTypeOf(i.timeType, i.title),
    url: i.externalUrl,
    applyUrl: i.externalUrl,
    description: htmlToText(i.jobDescription),
    postedAt: iso(i.startDate),
    compensation: null,
  }
}

// Workday has no "all jobs" call; these searches cover the roles this assistant looks for.
export const WORKDAY_QUERIES = ['AI engineer', 'software engineer', 'python', 'machine learning', 'intern', 'new college grad', 'computer vision', 'LLM']

// ── Fetching ─────────────────────────────────────────────────────────────────

async function getJson(fetchFn, url, init) {
  const res = await fetchFn(url, init)
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`)
  return res.json()
}

/**
 * All jobs of one source. `keepTitle(title)` decides which Workday jobs are worth a detail call (the other
 * feeds return descriptions in one response).
 */
export async function fetchSource(src, { fetchFn = fetch, keepTitle = () => true, maxWorkdayDetails = 80 } = {}) {
  if (src.ats === 'greenhouse') {
    return parseGreenhouse(await getJson(fetchFn, `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(src.token)}/jobs?content=true`), src)
  }
  if (src.ats === 'ashby') {
    return parseAshby(await getJson(fetchFn, `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(src.token)}?includeCompensation=true`), src)
  }
  if (src.ats === 'lever') {
    return parseLever(await getJson(fetchFn, `https://api.lever.co/v0/postings/${encodeURIComponent(src.token)}?mode=json`), src)
  }
  if (src.ats === 'workday') {
    const base = `https://${src.host}/wday/cxs/${src.tenant}/${src.site}`
    const paths = new Map()
    // The searches run side by side; each pages through its own results.
    await Promise.all(
      WORKDAY_QUERIES.map(async (q) => {
        for (let offset = 0; offset < 100; offset += 20) {
          const page = await getJson(fetchFn, `${base}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: q }),
          })
          const items = (page.jobPostings ?? []).map((it) => parseWorkdayListItem(it))
          for (const it of items) if (it.path && keepTitle(it.title)) paths.set(it.path, it)
          if (items.length < 20) break
        }
      }),
    )
    // Detail calls six at a time: polite to the server, and much faster than one by one.
    const wanted = [...paths.values()].slice(0, maxWorkdayDetails)
    const jobs = []
    for (let i = 0; i < wanted.length; i += 6) {
      const batch = await Promise.allSettled(wanted.slice(i, i + 6).map((it) => getJson(fetchFn, `${base}${it.path}`, { headers: { Accept: 'application/json' } })))
      for (const r of batch) if (r.status === 'fulfilled') jobs.push(parseWorkdayDetail(r.value, src)) // a missing posting does not stop the rest
    }
    return jobs
  }
  throw new Error(`Unknown job board type "${src.ats}"`)
}
