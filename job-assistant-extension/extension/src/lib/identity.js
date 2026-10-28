// "Your details" for the public edition, where there is no portfolio to read them from. They are typed on the
// Profile page as plain lines and turned into exactly the shapes the portfolio edition gets from the site, so the
// matcher, the answers and the form filler work the same way. Nothing here is inferred: a field you leave empty
// stays empty.

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const lines = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
const cells = (line) => line.split('|').map(clean)
const list = (s) => clean(s).split(/\s*[,;]\s*/).filter(Boolean)
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function splitName(full) {
  const [first = '', ...rest] = clean(full).split(' ')
  return { firstName: first, lastName: rest.join(' ') }
}

/** "School | Degree | 2022–2025 | CGPA 7.1 (optional)" per line. */
export function parseEducation(text) {
  return lines(text).map((l) => {
    const [school = '', degree = '', years = '', gpa = ''] = cells(l)
    const [start, end] = years.split(/\s*[—–-]\s*/)
    return { school, degree, start: end ? clean(start) : null, end: clean(end || start) || null, gpa: (/(\d+(?:\.\d+)?)/.exec(gpa) ?? [])[1] ?? null, notes: [] }
  }).filter((e) => e.school || e.degree)
}
export const formatEducation = (items) => (items ?? []).map((e) => [e.school, e.degree, [e.start, e.end].filter(Boolean).join('–'), e.gpa ? `CGPA ${e.gpa}` : ''].join(' | ').replace(/( \| )+$/, '')).join('\n')

/** "Title | Company | Dates | What you did | tech, tech" per line. */
export function parseExperience(text) {
  return lines(text).map((l) => {
    const [title = '', company = '', dates = '', summary = '', tech = ''] = cells(l)
    return { title, company, dates, summary, bullets: [], tech: list(tech) }
  }).filter((e) => e.title || e.company)
}
export const formatExperience = (items) => (items ?? []).map((e) => [e.title, e.company, e.dates, e.summary, (e.tech ?? []).join(', ')].join(' | ').replace(/( \| )+$/, '')).join('\n')

/** "Name | What it does | tech, tech | Status (optional) | GitHub link (optional)" per line. */
export function parseProjects(text) {
  return lines(text).map((l) => {
    const [name = '', summary = '', tech = '', status = '', github = ''] = cells(l)
    return { id: slug(name), name, where: 'Personal project', summary, bullets: [], tech: list(tech), status: status || 'Personal project', github: github || null }
  }).filter((p) => p.name)
}
export const formatProjects = (items) => (items ?? []).map((p) => [p.name, p.summary, (p.tech ?? []).join(', '), p.status === 'Personal project' ? '' : p.status, p.github ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n')

/** "Domain: item, item" per line. */
export function parseSkills(text) {
  return lines(text).map((l) => {
    const i = l.indexOf(':')
    return i < 0 ? { domain: 'Skills', items: list(l) } : { domain: clean(l.slice(0, i)), items: list(l.slice(i + 1)) }
  }).filter((g) => g.items.length)
}
export const formatSkills = (groups) => (groups ?? []).map((g) => `${g.domain}: ${(g.items ?? []).join(', ')}`).join('\n')

/** Your typed details on top of the starting profile (empty fields change nothing). */
export function applyIdentity(base, id) {
  if (!id) return base
  const out = { ...base }
  for (const k of ['fullName', 'email', 'headline', 'summary', 'country']) if (clean(id[k])) out[k] = clean(id[k])
  if (clean(id.fullName)) Object.assign(out, splitName(id.fullName))
  out.links = { ...base.links, ...Object.fromEntries(Object.entries(id.links ?? {}).filter(([, v]) => clean(v))) }
  for (const k of ['education', 'experience', 'projects', 'skillGroups']) if (Array.isArray(id[k]) && id[k].length) out[k] = id[k]
  return out
}

/** What a visitor still has to type before the assistant can tell what they are good at. */
export function missingIdentity(p) {
  const out = []
  if (!clean(p.fullName)) out.push({ field: 'fullName', label: 'Your name', why: 'Forms ask for it; it is never guessed.' })
  if (!clean(p.email)) out.push({ field: 'email', label: 'Your email', why: 'Forms ask for it.' })
  const evidence = (p.experience?.length ?? 0) + (p.projects?.length ?? 0) + (p.skillGroups?.length ?? 0)
  if (!evidence) out.push({ field: 'skills', label: 'Skills, work or projects', why: 'The match score only counts skills that appear in your own details.' })
  return out
}
