// Your LinkedIn data, from LinkedIn's own export (Settings → Data privacy → Get a copy of your data).
// The assistant never opens or reads linkedin.com pages: LinkedIn's terms forbid extensions that scrape it.

import { unzip } from './zip.js'

/** RFC 4180 CSV → rows of cells (quoted fields, "" escapes, newlines inside quotes). */
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const s = String(text).replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Rows as objects, starting at the first row that has `mustHave` as a column (some exports start with notes). */
export function csvObjects(text, mustHave) {
  const rows = parseCsv(text)
  const h = rows.findIndex((r) => r.map((c) => c.trim()).includes(mustHave))
  if (h < 0) return []
  const header = rows[h].map((c) => c.trim())
  return rows.slice(h + 1).map((r) => Object.fromEntries(header.map((k, i) => [k, (r[i] ?? '').trim()])))
}

const FILES = {
  profile: ['Profile.csv', 'First Name'],
  positions: ['Positions.csv', 'Company Name'],
  education: ['Education.csv', 'School Name'],
  skills: ['Skills.csv', 'Name'],
  languages: ['Languages.csv', 'Name'],
  projects: ['Projects.csv', 'Title'],
  certifications: ['Certifications.csv', 'Name'],
  emails: ['Email Addresses.csv', 'Email Address'],
  phones: ['PhoneNumbers.csv', 'Number'],
}

/** The parts of the export the assistant uses. Missing files are simply empty. */
export function readLinkedInFiles(files) {
  const byBase = new Map([...files].map(([name, data]) => [name.split('/').pop(), typeof data === 'string' ? data : new TextDecoder().decode(data)]))
  const get = (k) => {
    const [file, col] = FILES[k]
    const text = byBase.get(file)
    return text ? csvObjects(text, col) : []
  }
  const prof = get('profile')[0] ?? {}
  return {
    importedAt: new Date().toISOString(),
    filesFound: [...byBase.keys()].filter((n) => Object.values(FILES).some(([f]) => f === n)),
    name: [prof['First Name'], prof['Last Name']].filter(Boolean).join(' ') || null,
    headline: prof.Headline || null,
    summary: prof.Summary || null,
    location: prof['Geo Location'] || null,
    positions: get('positions').map((r) => ({ company: r['Company Name'], title: r.Title, description: r.Description, location: r.Location, start: r['Started On'], end: r['Finished On'] || null })),
    education: get('education').map((r) => ({ school: r['School Name'], degree: r['Degree Name'], start: r['Start Date'], end: r['End Date'], notes: r.Notes })),
    skills: get('skills').map((r) => r.Name).filter(Boolean),
    languages: get('languages').map((r) => ({ name: r.Name, level: r.Proficiency || null })).filter((l) => l.name),
    projects: get('projects').map((r) => ({ title: r.Title, description: r.Description, url: r.Url, start: r['Started On'], end: r['Finished On'] })),
    certifications: get('certifications').map((r) => ({ name: r.Name, authority: r.Authority, url: r.Url, start: r['Started On'] })),
    emails: get('emails').map((r) => r['Email Address']).filter(Boolean),
    phones: get('phones').map((r) => r.Number).filter(Boolean),
  }
}

export async function importLinkedInZip(arrayBuffer) {
  const files = await unzip(arrayBuffer, (name) => name.toLowerCase().endsWith('.csv'))
  const data = readLinkedInFiles(files)
  if (!data.filesFound.length) throw new Error('No LinkedIn profile files were found in this ZIP. Use the export from LinkedIn → Settings → Data privacy → Get a copy of your data.')
  return data
}
