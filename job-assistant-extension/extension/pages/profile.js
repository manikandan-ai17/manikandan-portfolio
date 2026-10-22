import { h, toast, download, fmtDate } from './ui.js'
import { get, set, loadProfile, saveProfile, loadSources, loadSettings } from '../src/lib/store.js'
import { missingInfo } from '../src/lib/profile.js'
import { SEED_PROFILE } from '../src/lib/seedProfile.js'
import { importLinkedInZip } from '../src/lib/linkedin.js'
import { fetchGitHubRepos, fetchPortfolioResume, bytesToBase64 } from '../src/lib/publicData.js'
import { DEFAULT_SOURCES, fetchSource, sourceId } from '../src/lib/sources.js'

const $ = (id) => document.getElementById(id)
let profile = await loadProfile()
let resumes = await get('resumes', [])
let settings = await loadSettings()
let sources = await loadSources()

async function persist(msg) {
  await saveProfile(profile)
  renderMissing()
  if (msg) toast(msg)
}

function renderMissing() {
  const m = missingInfo(profile)
  $('missing').replaceChildren(m.length ? h('div', { class: 'banner' }, h('b', {}, `Still needed (${m.length}): `), h('ul', { class: 'list' }, m.map((x) => h('li', {}, `${x.label} — `, h('span', { class: 'muted' }, x.why))))) : h('div', { class: 'banner info' }, 'Your profile has everything the assistant asks for.'))
}

// ── Your answers ────────────────────────────────────────────────────────────

function triSelect(value, onchange) {
  const v = value === true ? 'yes' : value === false ? 'no' : ''
  return h('select', { onchange: (e) => onchange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null) }, [['', 'Not answered'], ['yes', 'Yes'], ['no', 'No']].map(([k, l]) => h('option', { value: k, selected: k === v ? '' : null }, l)))
}

function renderAnswers() {
  const e = profile.eligibility
  const p = profile.preferences
  const langText = (e.languages ?? []).map((l) => (l.level ? `${l.name}: ${l.level}` : l.name)).join('; ')
  const draft = { phone: profile.phone, city: profile.city, authorized: (e.authorizedCountries ?? []).join(', '), sponsor: e.needsSponsorshipElsewhere, relocate: e.openToRelocate, languages: langText, earliestStart: e.earliestStart, noticePeriod: e.noticePeriod, years: e.yearsExperience, ...p }
  const field = (label, input, hint) => h('label', { class: 'field' }, label, input, hint ? h('span', { class: 'muted small', style: 'font-weight:400' }, hint) : null)
  const text = (k, type = 'text', placeholder = '') => h('input', { type, value: draft[k] ?? '', placeholder, oninput: (ev) => (draft[k] = ev.target.value) })
  $('answers').replaceChildren(
    h('h2', {}, 'Answers only you can give'),
    h('p', { class: 'muted small' }, 'Empty answers stay empty on application forms — the assistant never guesses them.'),
    field('Phone (with country code)', text('phone', 'tel', '+91 …')),
    field('City you live in', text('city', 'text', 'e.g. Coimbatore')),
    field('Countries you are authorized to work in', text('authorized', 'text', 'e.g. India'), 'Comma-separated. Roles elsewhere are checked for visa sponsorship.'),
    field('Do you need visa sponsorship outside those countries?', triSelect(draft.sponsor, (v) => (draft.sponsor = v))),
    field('Open to relocating?', triSelect(draft.relocate, (v) => (draft.relocate = v))),
    field('Languages you speak', text('languages', 'text', 'English: Professional; Tamil: Native'), 'Separate with “;”. Used to flag roles that require another language.'),
    field('Earliest start date', text('earliestStart', 'text', 'e.g. Immediately, or 1 Jan 2027')),
    field('Notice period', text('noticePeriod', 'text', 'e.g. 30 days')),
    field('Years of professional experience', text('years', 'number'), 'You said about one year; this is compared with “N+ years” in postings.'),
    h('div', { class: 'row' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft.fullTime, onchange: (ev) => (draft.fullTime = ev.target.checked) }), 'Full-time roles'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft.internships, onchange: (ev) => (draft.internships = ev.target.checked) }), 'Internships'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft.contract, onchange: (ev) => (draft.contract = ev.target.checked) }), 'Contract roles'),
    ),
    h('button', { class: 'btn primary', onclick: async () => {
      profile.phone = draft.phone.trim()
      profile.city = draft.city.trim()
      profile.eligibility = {
        ...e,
        authorizedCountries: draft.authorized.split(',').map((x) => x.trim()).filter(Boolean),
        needsSponsorshipElsewhere: draft.sponsor,
        openToRelocate: draft.relocate,
        languages: draft.languages.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [name, level] = x.split(':').map((s) => s.trim()); return { name, level: level || null } }),
        earliestStart: draft.earliestStart.trim(),
        noticePeriod: draft.noticePeriod.trim(),
        yearsExperience: Number(draft.years) >= 0 ? Number(draft.years) : 1,
      }
      profile.preferences = { ...p, fullTime: draft.fullTime, internships: draft.internships, contract: draft.contract }
      await persist('Saved. Press “Re-check” on the dashboard to apply it to the saved jobs.')
    } }, 'Save answers'),
  )
}

// ── Verified (read-only) ────────────────────────────────────────────────────

function renderVerified() {
  $('verified').replaceChildren(
    h('h2', {}, 'Verified — from your portfolio'),
    h('p', { class: 'muted small' }, 'Read-only here, so the assistant cannot drift from what your site says. To change it, edit src/data/portfolio.ts, run “npm run sync-profile” in job-assistant-extension, and reload the extension.'),
    h('div', {}, h('b', {}, profile.fullName), ' · ', profile.email),
    h('div', { class: 'small' }, h('a', { href: profile.links.portfolio, target: '_blank' }, 'Portfolio'), ' · ', h('a', { href: profile.links.github, target: '_blank' }, 'GitHub'), ' · ', h('a', { href: profile.links.linkedin, target: '_blank' }, 'LinkedIn')),
    h('h3', {}, 'Education'), h('ul', { class: 'list small' }, profile.education.map((e) => h('li', {}, `${e.degree}, ${e.school} (${e.start}–${e.end})${e.gpa ? `, CGPA ${e.gpa}` : ''}`))),
    h('h3', {}, 'Work'), h('ul', { class: 'list small' }, profile.experience.map((e) => h('li', {}, `${e.title} — ${e.company} (${e.dates})`))),
    h('h3', {}, 'Projects'), h('ul', { class: 'list small' }, profile.projects.map((p) => h('li', {}, `${p.name} — ${p.status}`))),
  )
}

// ── Resumes ─────────────────────────────────────────────────────────────────

async function saveResumes(msg) {
  await set('resumes', resumes)
  renderResumes()
  if (msg) toast(msg)
}

function renderResumes() {
  const label = h('input', { type: 'text', placeholder: 'Version name, e.g. “AI engineer — LLM focus”' })
  const file = h('input', { type: 'file', accept: 'application/pdf,.pdf' })
  $('resumes').replaceChildren(
    h('h2', {}, 'Resumes'),
    h('p', { class: 'muted small' }, 'Stored in this browser only. The version you choose is attached to forms and recorded with each application.'),
    resumes.length
      ? h('table', { class: 't' }, h('tbody', {}, resumes.map((r) => h('tr', {},
          h('td', {}, h('label', { class: 'check' }, h('input', { type: 'radio', name: 'def', checked: r.isDefault || (resumes.every((x) => !x.isDefault) && r === resumes[0]), onchange: () => { resumes = resumes.map((x) => ({ ...x, isDefault: x.id === r.id })); saveResumes('Default resume set.') } }), 'Default')),
          h('td', {}, h('b', {}, r.label), h('div', { class: 'muted small' }, `${r.fileName} · ${Math.round((r.dataB64.length * 0.75) / 1024)} KB · added ${fmtDate(r.addedAt)}`)),
          h('td', {}, h('button', { class: 'btn small danger', onclick: () => { if (confirm(`Remove “${r.label}”?`)) { resumes = resumes.filter((x) => x.id !== r.id); saveResumes('Removed.') } } }, 'Remove')),
        ))))
      : h('p', {}, 'None yet.'),
    h('div', { class: 'row' }, h('button', { class: 'btn', onclick: async (ev) => {
      ev.target.disabled = true
      try {
        const r = await fetchPortfolioResume(SEED_PROFILE.resumeUrl)
        resumes = [...resumes, { ...r, isDefault: !resumes.length }]
        await saveResumes('Loaded the resume from your portfolio.')
      } catch (err) { toast(err.message, 5000) }
      ev.target.disabled = false
    } }, 'Load resume from my portfolio')),
    h('div', { class: 'grid2' }, label, file),
    h('div', {}, h('button', { class: 'btn', onclick: async () => {
      const f = file.files?.[0]
      if (!f) return toast('Choose a PDF first.')
      if (f.size > 5 * 1024 * 1024) return toast('That PDF is larger than 5 MB.')
      const bytes = new Uint8Array(await f.arrayBuffer())
      if (String.fromCharCode(...bytes.subarray(0, 4)) !== '%PDF') return toast('That file is not a PDF.')
      resumes = [...resumes, { id: `upload-${Date.now()}`, label: label.value.trim() || f.name.replace(/\.pdf$/i, ''), fileName: f.name, mime: 'application/pdf', dataB64: bytesToBase64(bytes), addedAt: new Date().toISOString(), source: 'upload', isDefault: !resumes.length }]
      await saveResumes('Resume added.')
    } }, 'Add this PDF')),
  )
}

// ── LinkedIn export ─────────────────────────────────────────────────────────

function renderLinkedIn(preview = null) {
  const li = profile.linkedin
  const file = h('input', { type: 'file', accept: '.zip,application/zip' })
  const show = preview ?? li
  $('linkedin').replaceChildren(
    h('h2', {}, 'LinkedIn'),
    h('p', { class: 'small' }, 'The assistant does not open or read linkedin.com — LinkedIn’s terms forbid extensions that scrape it. Instead, use LinkedIn’s own export: ', h('b', {}, 'LinkedIn → Settings & Privacy → Data privacy → Get a copy of your data'), ', tick Profile, Positions, Education, Skills and Languages, request the archive, and select the ZIP LinkedIn emails you here.'),
    li ? h('p', { class: 'muted small' }, `Imported ${fmtDate(li.importedAt)}: ${li.positions.length} positions, ${li.education.length} education entries, ${li.skills.length} skills, ${li.languages.length} languages.`) : null,
    h('div', { class: 'row' }, file, h('button', { class: 'btn', onclick: async () => {
      const f = file.files?.[0]
      if (!f) return toast('Choose the ZIP from LinkedIn first.')
      try { renderLinkedIn(await importLinkedInZip(await f.arrayBuffer())) } catch (err) { toast(err.message, 6000) }
    } }, 'Read the ZIP')),
    show ? h('div', { class: 'stack small' },
      h('h3', {}, preview ? 'Found in the ZIP (not saved yet)' : 'Saved from LinkedIn'),
      h('div', {}, h('b', {}, 'Positions: '), show.positions.map((p) => `${p.title} at ${p.company} (${p.start || '?'}–${p.end || 'present'})`).join(' · ') || 'none'),
      h('div', {}, h('b', {}, 'Education: '), show.education.map((e) => `${e.degree || ''} ${e.school}`.trim()).join(' · ') || 'none'),
      h('div', {}, h('b', {}, 'Skills you listed: '), show.skills.join(', ') || 'none'),
      h('div', {}, h('b', {}, 'Languages: '), show.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ''}`).join(', ') || 'none'),
      h('p', { class: 'muted' }, 'Positions count as work evidence; skills you listed only count as “self-listed”, never as work experience. Your portfolio stays the source for forms.'),
      preview ? h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: async () => { profile.linkedin = preview; await persist('LinkedIn data saved.'); renderLinkedIn() } }, 'Save this import'),
        preview.languages.length ? h('button', { class: 'btn', onclick: async () => { profile.linkedin = preview; profile.eligibility.languages = preview.languages; await persist('Saved, and your languages were taken from LinkedIn.'); renderAnswers(); renderLinkedIn() } }, 'Save and use these languages') : null,
        preview.phones.length && !profile.phone ? h('button', { class: 'btn', onclick: async () => { profile.linkedin = preview; profile.phone = preview.phones[0]; await persist('Saved, with the phone number from LinkedIn.'); renderAnswers(); renderLinkedIn() } }, `Save and use phone ${preview.phones[0]}`) : null,
      ) : h('button', { class: 'btn small danger', onclick: async () => { profile.linkedin = null; await persist('LinkedIn data removed.'); renderLinkedIn() } }, 'Remove LinkedIn data'),
    ) : null,
  )
}

// ── GitHub ──────────────────────────────────────────────────────────────────

function renderGitHub() {
  const g = profile.github
  $('github').replaceChildren(
    h('h2', {}, 'GitHub'),
    h('p', { class: 'muted small' }, `Public repositories of ${profile.links.github}. Their languages and topics count as project evidence.`),
    g ? h('ul', { class: 'list small' }, g.repos.map((r) => h('li', {}, h('a', { href: r.url, target: '_blank' }, r.name), ` — ${r.language ?? 'no language'}${r.description ? `: ${r.description}` : ''}`))) : h('p', {}, 'Not loaded yet.'),
    h('div', {}, h('button', { class: 'btn', onclick: async (ev) => {
      ev.target.disabled = true
      try { profile.github = await fetchGitHubRepos(profile.links.github); await persist(`Loaded ${profile.github.repos.length} repositories.`); renderGitHub() } catch (err) { toast(err.message, 5000); ev.target.disabled = false }
    } }, g ? 'Refresh from GitHub' : 'Load from GitHub')),
  )
}

// ── AI drafting ─────────────────────────────────────────────────────────────

function renderAI() {
  const key = h('input', { type: 'password', placeholder: settings.anthropicKey ? '•••••••• (saved)' : 'sk-ant-…', autocomplete: 'off' })
  const model = h('input', { type: 'text', value: settings.model })
  $('ai').replaceChildren(
    h('h2', {}, 'AI cover-letter drafts (optional)'),
    h('p', { class: 'small' }, 'Without a key you still get template cover letters built from your profile. With your own Anthropic API key, “AI draft” asks Claude to write one from the same verified facts; every draft is checked for skills and numbers your profile does not show, and you approve it before use.'),
    h('p', { class: 'muted small' }, 'The key is kept in this browser’s extension storage (not synced, not in any file or repository) and is sent only to api.anthropic.com. Anyone with access to this browser profile could read it — use a key with a spending limit, and remove it here when you stop using it.'),
    h('div', { class: 'grid2' }, h('label', { class: 'field' }, 'Anthropic API key', key), h('label', { class: 'field' }, 'Model', model)),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: async () => { settings = { ...settings, model: model.value.trim() || 'claude-opus-5-5', ...(key.value.trim() ? { anthropicKey: key.value.trim() } : {}) }; await set('settings', settings); renderAI(); toast('AI settings saved.') } }, 'Save'),
      settings.anthropicKey ? h('button', { class: 'btn danger', onclick: async () => { settings = { ...settings, anthropicKey: '' }; await set('settings', settings); renderAI(); toast('API key removed.') } }, 'Remove key') : null,
    ),
  )
}

// ── Job boards ──────────────────────────────────────────────────────────────

function renderBoards() {
  const company = h('input', { type: 'text', placeholder: 'Company name' })
  const ats = h('select', {}, ['greenhouse', 'ashby', 'lever'].map((a) => h('option', { value: a }, a[0].toUpperCase() + a.slice(1))))
  const token = h('input', { type: 'text', placeholder: 'Board name, e.g. “anthropic” in job-boards.greenhouse.io/anthropic' })
  const saveSources = async (msg) => { await set('sources', sources); renderBoards(); if (msg) toast(msg) }
  $('boards').replaceChildren(
    h('h2', {}, 'Job boards searched'),
    h('p', { class: 'muted small' }, 'Official public job-board feeds the companies publish themselves. Add any company that uses Greenhouse, Ashby or Lever.'),
    h('div', { class: 'row' }, sources.map((s) => h('label', { class: 'check chip' }, h('input', { type: 'checkbox', checked: s.enabled !== false, onchange: (e) => { s.enabled = e.target.checked; saveSources() } }), `${s.company} · ${s.ats}`))),
    h('div', { class: 'grid2' }, company, h('div', { class: 'row' }, ats, token)),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async (ev) => {
        const src = { company: company.value.trim(), ats: ats.value, token: token.value.trim(), enabled: true }
        if (!src.company || !src.token) return toast('Give the company name and its board name.')
        if (sources.some((s) => sourceId(s) === sourceId(src))) return toast('That board is already in the list.')
        ev.target.disabled = true
        try {
          const jobs = await fetchSource(src)
          sources = [...sources, src]
          await saveSources(`Added ${src.company}: ${jobs.length} open roles right now.`)
        } catch (err) { toast(`Could not read that board: ${err.message}`, 6000); ev.target.disabled = false }
      } }, 'Test and add'),
      h('button', { class: 'btn small', onclick: () => { if (confirm('Go back to the default list of companies?')) { sources = structuredClone(DEFAULT_SOURCES); saveSources('Default boards restored.') } } }, 'Restore defaults'),
    ),
  )
}

// ── Your data ───────────────────────────────────────────────────────────────

function renderData() {
  $('data').replaceChildren(
    h('h2', {}, 'Your data'),
    h('p', { class: 'muted small' }, 'Everything stays in this browser’s extension storage. Export it to keep a copy; the export leaves out your API key.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: async () => {
        const all = await chrome.storage.local.get(null)
        if (all.settings) all.settings = { ...all.settings, anthropicKey: all.settings.anthropicKey ? '(removed from export)' : '' }
        download(`job-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all, null, 1), 'application/json')
      } }, 'Export everything (JSON)'),
      h('button', { class: 'btn danger', onclick: async () => { if (confirm('Delete ALL assistant data in this browser: answers, resumes, tracked applications, saved jobs and the API key?')) { await chrome.storage.local.clear(); location.reload() } } }, 'Delete all data'),
    ),
  )
}

renderMissing()
renderAnswers()
renderVerified()
renderResumes()
renderLinkedIn()
renderGitHub()
renderAI()
renderBoards()
renderData()
await saveProfile(profile)
if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
