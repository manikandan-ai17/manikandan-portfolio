import { h, toast, download, fmtDate } from './ui.js'
import { get, set, loadProfile, saveProfile, loadSources, loadSettings } from '../src/lib/store.js'
import { missingInfo, isBlankEdition } from '../src/lib/profile.js'
import { parseEducation, parseExperience, parseProjects, parseSkills, formatEducation, formatExperience, formatProjects, formatSkills } from '../src/lib/identity.js'
import { DEFAULT_AUTO } from '../src/lib/autoapply.js'
import { GEMINI_DEFAULT_MODEL, aiConfig, geminiGenerate } from '../src/lib/ai.js'
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

// ── Auto-apply ──────────────────────────────────────────────────────────────

function renderAutoApply() {
  const a = { ...DEFAULT_AUTO, ...(settings.autoApply ?? {}) }
  const check = (k, label, hint) => h('label', { class: 'check', style: 'align-items:flex-start' }, h('input', { type: 'checkbox', checked: a[k], onchange: (e) => (a[k] = e.target.checked) }), h('span', {}, label, hint ? h('div', { class: 'muted small' }, hint) : null))
  $('autoapply').replaceChildren(
    h('h2', {}, 'Auto-apply'),
    h('p', { class: 'muted small' }, 'Lets the assistant fill and submit applications on Greenhouse, Lever and Ashby company pages for Strong/Good matches. Start with dry run on: it fills the form and stops before Submit so you can check what it would send. It never runs on LinkedIn, Indeed or Wellfound, never solves CAPTCHAs, and stops (without submitting) whenever an answer is not in your profile above.'),
    check('enabled', 'Turn on auto-apply'),
    check('dryRun', 'Dry run: fill the form but do NOT submit (recommended until you have checked a few)'),
    h('div', { class: 'grid2' },
      h('label', { class: 'field' }, 'Minimum match', h('select', { onchange: (e) => (a.minVerdict = e.target.value) }, [['good', 'Good or Strong'], ['strong', 'Strong only']].map(([v, l]) => h('option', { value: v, selected: a.minVerdict === v ? '' : null }, l)))),
      h('label', { class: 'field' }, 'Applications per day (live)', h('input', { type: 'number', min: 1, max: 50, value: a.dailyCap, oninput: (e) => (a.dailyCap = Math.max(1, Math.min(50, Number(e.target.value) || 10))) })),
      h('label', { class: 'field' }, 'Seconds between applications', h('input', { type: 'number', min: 10, max: 300, value: a.pauseSeconds, oninput: (e) => (a.pauseSeconds = Math.max(10, Math.min(300, Number(e.target.value) || 30))) })),
    ),
    check('acceptConsent', 'Tick privacy / data-processing / “my information is true” boxes for me', 'Legal agreements (arbitration, non-compete, NDA) are never accepted for you.'),
    check('neverAppliedBefore', 'I have not applied to these companies before except through this assistant', 'Used to answer “Have you applied here before?” with No. Leave it off to be asked instead.'),
    check('autoCoverLetter', 'Attach the template cover letter when a form has a cover-letter box', 'Built only from your verified profile and checked for unsupported claims.'),
    check('allowAi', 'Allow checked AI drafts for written questions (needs a Gemini or Anthropic key)', 'Off: only answers from your profile and answers you approved on the dashboard are used; other written questions stop the application.'),
    h('h3', {}, 'One-click Run'),
    h('p', { class: 'muted small' }, 'Run (in the popup or on the Auto-apply tab) searches the boards, picks the best job at each company you have not applied to, asks Gemini whether it really fits, and applies until it reaches the number below. It applies to fewer when fewer jobs qualify. Answers you give under “Questions for you” are reused on later forms.'),
    h('div', { class: 'grid2' },
      h('label', { class: 'field' }, 'Applications per Run (different companies)', h('input', { type: 'number', min: 1, max: 10, value: a.targetPerRun, oninput: (e) => (a.targetPerRun = Math.max(1, Math.min(10, Number(e.target.value) || 5))) })),
      h('label', { class: 'field' }, 'Most forms to try per Run', h('input', { type: 'number', min: 1, max: 30, value: a.maxAttemptsPerRun, oninput: (e) => (a.maxAttemptsPerRun = Math.max(1, Math.min(30, Number(e.target.value) || 12))) })),
      h('label', { class: 'field' }, 'Where', h('select', { onchange: (e) => (a.where = e.target.value) }, [['india_remote', 'Countries I can work in, or remote'], ['relocate', 'Also on-site abroad (I can relocate)'], ['anywhere', 'Anywhere']].map(([v, l]) => h('option', { value: v, selected: a.where === v ? '' : null }, l)))),
      h('label', { class: 'field' }, 'Check for new jobs every … hours (0 = off)', h('input', { type: 'number', min: 0, max: 48, value: a.watchHours, oninput: (e) => (a.watchHours = Math.max(0, Math.min(48, Number(e.target.value) || 0))) })),
    ),
    check('onePerCompany', 'Only one application per company, ever', 'Companies in your tracker (applied, interviewing, rejected …) are skipped too.'),
    check('aiFit', 'Ask Gemini whether each job really fits before applying', 'Needs a Gemini key under AI drafting. A “skip” is recorded with the reason and that job is not tried again.'),
    h('div', { class: 'banner small' }, 'Assumes you were not referred. Turn auto-apply off, or apply yourself, for any job where someone referred you. Visa, relocation, notice period and salary answers come only from what you typed above.'),
    h('div', {}, h('button', { class: 'btn primary', onclick: async () => { settings = { ...settings, autoApply: a }; await set('settings', settings); toast(a.enabled ? (a.dryRun ? 'Saved. Auto-apply is on in dry-run mode.' : 'Saved. Auto-apply is LIVE.') : 'Saved. Auto-apply is off.', 4000) } }, 'Save auto-apply settings')),
  )
}

// ── In your own words (used as written in drafted answers) ─────────────────

function renderMyWords() {
  const w = { ...profile.myWords }
  const area = (k, label, hint, ph) => h('label', { class: 'field' }, label, h('textarea', { style: 'min-height:80px', placeholder: ph, value: w[k] ?? '', oninput: (e) => (w[k] = e.target.value) }), h('span', { class: 'muted small', style: 'font-weight:400' }, hint))
  $('mywords').replaceChildren(
    h('h2', {}, 'In your own words (optional)'),
    h('p', { class: 'muted small' }, 'Drafted answers use these exactly as you write them. Where they are empty, a draft asks you in [brackets] instead of inventing anything — for example why you want a particular company.'),
    h('div', { class: 'grid2' },
      area('aboutMe', 'Something about you that the facts do not show', 'Added to “Tell us about yourself”.', 'e.g. what got you into building with LLMs, how you like to work'),
      area('lookingFor', 'What you are looking for in your next role', 'Opens “Why do you want to join …?” (you still add a company-specific reason).', 'e.g. working on AI products used by real people, with strong engineers to learn from'),
      area('proudestWhy', 'Why your proudest project mattered to you', 'Ends “What is your most impactful project?”.', 'e.g. what you learned, what was hard, what you would change'),
      h('label', { class: 'field' }, 'Salary expectation', h('input', { type: 'text', value: w.salaryExpectation ?? '', placeholder: 'e.g. ₹8–10 LPA, or negotiable', oninput: (e) => (w.salaryExpectation = e.target.value) }), h('span', { class: 'muted small', style: 'font-weight:400' }, 'Only used when a form asks, and only after you approve that answer.')),
    ),
    h('div', {}, h('button', { class: 'btn primary', onclick: async () => { profile.myWords = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, String(v ?? '').trim()])); await persist('Saved.') } }, 'Save')),
  )
}

// ── Verified (read-only) ────────────────────────────────────────────────────

/** Public edition: there is no portfolio to read, so these are the facts you type. Nothing is pre-filled or guessed. */
function renderDetails() {
  const id = profile.identity ?? {}
  const d = {
    fullName: profile.fullName, email: profile.email, headline: profile.headline, summary: profile.summary, country: profile.country,
    portfolio: profile.links?.portfolio ?? '', github: profile.links?.github ?? '', linkedin: profile.links?.linkedin ?? '',
    education: formatEducation(profile.education), experience: formatExperience(profile.experience), projects: formatProjects(profile.projects), skills: formatSkills(profile.skillGroups),
  }
  const input = (k, label, ph = '', type = 'text') => h('label', { class: 'field' }, label, h('input', { type, value: d[k] ?? '', placeholder: ph, oninput: (e) => (d[k] = e.target.value) }))
  const area = (k, label, hint, ph) => h('label', { class: 'field' }, label, h('textarea', { style: 'min-height:84px', placeholder: ph, value: d[k] ?? '', oninput: (e) => (d[k] = e.target.value) }), h('span', { class: 'muted small', style: 'font-weight:400' }, hint))
  $('verified').replaceChildren(
    h('h2', {}, 'Your details'),
    h('p', { class: 'muted small' }, 'Type only what is true: job matching and every answer are built from these lines, and a skill you do not list is never claimed. One entry per line; the parts are separated by “ | ”.'),
    h('div', { class: 'grid2' }, input('fullName', 'Full name', 'Your name'), input('email', 'Email', 'you@example.com', 'email')),
    h('div', { class: 'grid2' }, input('headline', 'Headline', 'e.g. Software Engineer'), input('country', 'Country you live in', 'e.g. India')),
    h('label', { class: 'field' }, 'Short summary', h('textarea', { style: 'min-height:60px', placeholder: 'Two sentences about what you build', value: d.summary ?? '', oninput: (e) => (d.summary = e.target.value) })),
    h('div', { class: 'grid2' }, input('portfolio', 'Portfolio link (optional)', 'https://…', 'url'), input('github', 'GitHub profile (optional)', 'https://github.com/you', 'url')),
    input('linkedin', 'LinkedIn profile link (optional; the assistant never opens it)', 'https://www.linkedin.com/in/you', 'url'),
    area('education', 'Education', 'School | Degree | 2022–2025 | CGPA 7.1 (CGPA optional)', 'Example College | B.Sc. Computer Science | 2021–2024 | CGPA 8.2'),
    area('experience', 'Work experience (leave empty if none)', 'Title | Company | Dates | What you did | tech, tech', 'Software Engineer Intern | Acme | Jun–Dec 2024 | Built internal APIs | Python, FastAPI'),
    area('projects', 'Projects', 'Name | What it does | tech, tech | Status (optional) | GitHub link (optional)', 'Job Tracker | Tracks applications in a local database | Python, SQLite | Finished | https://github.com/you/job-tracker'),
    area('skills', 'Skills you can back up', 'Group: skill, skill (one group per line)', 'Languages: Python, TypeScript, SQL'),
    h('div', {}, h('button', { class: 'btn primary', onclick: async () => {
      profile.identity = {
        ...id,
        fullName: d.fullName, email: d.email, headline: d.headline, summary: d.summary, country: d.country,
        links: { portfolio: d.portfolio.trim(), github: d.github.trim(), linkedin: d.linkedin.trim() },
        education: parseEducation(d.education), experience: parseExperience(d.experience), projects: parseProjects(d.projects), skillGroups: parseSkills(d.skills),
      }
      await saveProfile(profile)
      profile = await loadProfile()
      await persist('Saved. Press “Re-check” on the dashboard to score the saved jobs with your details.')
      renderDetails()
      renderGitHub()
    } }, 'Save my details')),
  )
}

function renderVerified() {
  if (isBlankEdition()) return renderDetails()
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
    SEED_PROFILE.resumeUrl ? h('div', { class: 'row' }, h('button', { class: 'btn', onclick: async (ev) => {
      ev.target.disabled = true
      try {
        const r = await fetchPortfolioResume(SEED_PROFILE.resumeUrl)
        resumes = [...resumes, { ...r, isDefault: !resumes.length }]
        await saveResumes('Loaded the resume from your portfolio.')
      } catch (err) { toast(err.message, 5000) }
      ev.target.disabled = false
    } }, 'Load resume from my portfolio')) : null,
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
    h('p', { class: 'muted small' }, profile.links.github ? `Public repositories of ${profile.links.github}. Their languages and topics count as project evidence.` : 'Add your GitHub profile link under Your details to load your public repositories as project evidence.'),
    g ? h('ul', { class: 'list small' }, g.repos.map((r) => h('li', {}, h('a', { href: r.url, target: '_blank' }, r.name), ` — ${r.language ?? 'no language'}${r.description ? `: ${r.description}` : ''}`))) : h('p', {}, 'Not loaded yet.'),
    !profile.links.github ? null : h('div', {}, h('button', { class: 'btn', onclick: async (ev) => {
      ev.target.disabled = true
      try { profile.github = await fetchGitHubRepos(profile.links.github); await persist(`Loaded ${profile.github.repos.length} repositories.`); renderGitHub() } catch (err) { toast(err.message, 5000); ev.target.disabled = false }
    } }, g ? 'Refresh from GitHub' : 'Load from GitHub')),
  )
}

// ── AI drafting ─────────────────────────────────────────────────────────────

function renderAI() {
  const provider = h('select', { onchange: (e) => (settings = { ...settings, aiProvider: e.target.value }) }, [['gemini', 'Google Gemini'], ['anthropic', 'Anthropic Claude']].map(([v, l]) => h('option', { value: v, selected: (settings.aiProvider ?? (settings.anthropicKey && !settings.geminiKey ? 'anthropic' : 'gemini')) === v ? '' : null }, l)))
  const gKey = h('input', { type: 'password', placeholder: settings.geminiKey ? '•••••••• (saved)' : 'AIza…', autocomplete: 'off' })
  const gModel = h('input', { type: 'text', value: settings.geminiModel || GEMINI_DEFAULT_MODEL })
  const cKey = h('input', { type: 'password', placeholder: settings.anthropicKey ? '•••••••• (saved)' : 'sk-ant-…', autocomplete: 'off' })
  const cModel = h('input', { type: 'text', value: settings.model })
  $('ai').replaceChildren(
    h('h2', {}, 'AI drafts (optional)'),
    h('p', { class: 'small' }, 'Without a key you still get template answers and cover letters built from your profile. With your own key, “AI draft” writes from the same verified facts; every draft is checked for skills and numbers your profile does not show, and you approve it before use.'),
    h('p', { class: 'muted small' }, 'Keys are kept in this browser’s extension storage (not synced, not in any file or repository) and sent only to the provider you pick (generativelanguage.googleapis.com for Gemini, api.anthropic.com for Claude). Anyone with access to this browser profile could read them — use a key with a spending limit, and remove it here when you stop using it.'),
    h('label', { class: 'field' }, 'Use', provider),
    h('div', { class: 'grid2' }, h('label', { class: 'field' }, 'Gemini API key', gKey), h('label', { class: 'field' }, 'Gemini model', gModel)),
    h('div', { class: 'grid2' }, h('label', { class: 'field' }, 'Anthropic API key (optional)', cKey), h('label', { class: 'field' }, 'Claude model', cModel)),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: async () => { settings = { ...settings, aiProvider: provider.value, geminiModel: gModel.value.trim() || GEMINI_DEFAULT_MODEL, model: cModel.value.trim() || 'claude-opus-5-5', ...(gKey.value.trim() ? { geminiKey: gKey.value.trim() } : {}), ...(cKey.value.trim() ? { anthropicKey: cKey.value.trim() } : {}) }; await set('settings', settings); renderAI(); toast('AI settings saved.') } }, 'Save'),
      h('button', { class: 'btn', onclick: async () => {
        const cfg = aiConfig({ ...settings, aiProvider: provider.value, ...(gKey.value.trim() ? { geminiKey: gKey.value.trim() } : {}) })
        if (!cfg || cfg.provider !== 'gemini') return toast('Save a Gemini key first to test it.')
        try { await geminiGenerate({ apiKey: cfg.apiKey, model: cfg.model, system: 'Reply with one word.', user: 'Say ok.', maxOutputTokens: 20 }); toast('Gemini key works.') } catch (err) { toast(err.message, 5000) }
      } }, 'Test Gemini key'),
      settings.geminiKey ? h('button', { class: 'btn danger', onclick: async () => { settings = { ...settings, geminiKey: '' }; await set('settings', settings); renderAI(); toast('Gemini key removed.') } }, 'Remove Gemini key') : null,
      settings.anthropicKey ? h('button', { class: 'btn danger', onclick: async () => { settings = { ...settings, anthropicKey: '' }; await set('settings', settings); renderAI(); toast('Anthropic key removed.') } }, 'Remove Anthropic key') : null,
    ),
  )
}

// ── Job boards ──────────────────────────────────────────────────────────────

function renderBoards() {
  const company = h('input', { type: 'text', placeholder: 'Company name' })
  const ats = h('select', {}, [['greenhouse', 'Greenhouse'], ['ashby', 'Ashby'], ['lever', 'Lever'], ['workable', 'Workable'], ['smartrecruiters', 'SmartRecruiters']].map(([a, l]) => h('option', { value: a }, l)))
  const token = h('input', { type: 'text', placeholder: 'Board name: “anthropic” in job-boards.greenhouse.io/anthropic, “huggingface” in apply.workable.com/huggingface' })
  const saveSources = async (msg) => { await set('sources', sources); renderBoards(); if (msg) toast(msg) }
  $('boards').replaceChildren(
    h('h2', {}, 'Job boards searched'),
    h('p', { class: 'muted small' }, 'Official public job-board feeds the companies publish themselves. Add any company that uses Greenhouse, Ashby, Lever, Workable or SmartRecruiters. LinkedIn, Indeed and Wellfound have no such feed and forbid automated reading — add jobs from them by hand on the dashboard.'),
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
        if (all.settings) all.settings = { ...all.settings, anthropicKey: all.settings.anthropicKey ? '(removed from export)' : '', geminiKey: all.settings.geminiKey ? '(removed from export)' : '' }
        download(`job-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(all, null, 1), 'application/json')
      } }, 'Export everything (JSON)'),
      h('button', { class: 'btn danger', onclick: async () => { if (confirm('Delete ALL assistant data in this browser: answers, resumes, tracked applications, saved jobs and the API key?')) { await chrome.storage.local.clear(); location.reload() } } }, 'Delete all data'),
    ),
  )
}

renderMissing()
renderAnswers()
renderAutoApply()
renderMyWords()
renderVerified()
renderResumes()
renderLinkedIn()
renderGitHub()
renderAI()
renderBoards()
renderData()
await saveProfile(profile)
if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
