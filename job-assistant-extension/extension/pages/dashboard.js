import { h, toast, download, fmtDate, TYPE_LABEL, STATUS_LABEL } from './ui.js'
import { get, set, loadProfile, saveProfile, loadSources, loadSettings, findDuplicate, trackerRecord, withStatus, updateTracker, trackerCsv, STATUSES } from '../src/lib/store.js'
import { missingInfo, skillEvidence } from '../src/lib/profile.js'
import { runSearch } from '../src/lib/pipeline.js'
import { scoreJob, VERDICT_LABEL } from '../src/lib/match.js'
import { templateCoverLetter, aiCoverLetter, checkLetter } from '../src/lib/coverLetter.js'

const $ = (id) => document.getElementById(id)
const state = {
  profile: await loadProfile(),
  jobs: await get('jobs', {}),
  meta: await get('runMeta'),
  tracker: await get('tracker', {}),
  resumes: await get('resumes', []),
  settings: await loadSettings(),
  filters: { show: new Set(['strong', 'good', 'stretch']), type: 'all', company: 'all', q: '' },
  open: new Set(),
  preparing: null,
  drafts: {},
}
// The application-page script reads the merged profile: keep it current.
await saveProfile(state.profile)
$('who').textContent = `${state.profile.fullName} · roles that match your verified experience`

// ── Banners ──────────────────────────────────────────────────────────────────

function renderBanners() {
  const b = $('banners')
  b.replaceChildren()
  const missing = missingInfo(state.profile)
  if (missing.length) {
    b.append(h('div', { class: 'banner' }, h('b', {}, 'Your profile still needs: '), missing.map((m) => m.label).join(' · '), '. ', h('a', { href: 'profile.html' }, 'Add them'), h('div', { class: 'small muted' }, 'Until then, visa and language checks show as warnings and forms leave those fields empty.')))
  }
  if (!state.resumes.length) b.append(h('div', { class: 'banner info' }, 'No resume stored yet — ', h('a', { href: 'profile.html#resumes' }, 'load your portfolio resume'), ' so forms can attach it.'))
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  $('run').disabled = true
  $('progress').hidden = false
  try {
    const sources = await loadSources()
    const res = await runSearch({
      sources,
      profile: state.profile,
      onProgress: ({ step, total, company }) => {
        $('progressText').textContent = `Reading ${company}’s job board…`
        $('progressCount').textContent = `${step} of ${total}`
        $('progressBar').style.width = `${Math.round(((step - 1) / total) * 100)}%`
      },
    })
    state.jobs = res.jobs
    state.meta = res.meta
    await set('jobs', res.jobs)
    await set('runMeta', res.meta)
    const errs = res.meta.perSource.filter((s) => s.error)
    toast(`Found ${Object.keys(res.jobs).length} engineering roles; ${res.meta.counts.strong ?? 0} strong and ${res.meta.counts.good ?? 0} good matches${errs.length ? ` (${errs.length} board${errs.length > 1 ? 's' : ''} failed — see Last run)` : ''}`, 5000)
  } catch (err) {
    toast(`The search failed: ${err.message}`, 6000)
  } finally {
    $('progress').hidden = true
    $('run').disabled = false
    renderAll()
  }
}

async function rescore() {
  const ev = skillEvidence(state.profile)
  for (const j of Object.values(state.jobs)) j.match = scoreJob(j, state.profile, ev)
  await set('jobs', state.jobs)
  toast('Re-checked every saved job against your current profile.')
  renderAll()
}

// ── Matches ──────────────────────────────────────────────────────────────────

const ORDER = { strong: 0, good: 1, stretch: 2, low: 3, blocked: 4 }

function filtered() {
  const f = state.filters
  const q = f.q.trim().toLowerCase()
  return Object.values(state.jobs)
    .filter((j) => f.show.has(j.match.verdict))
    .filter((j) => f.type === 'all' || j.employmentType === f.type || (f.type === 'full_time' && j.employmentType === null))
    .filter((j) => f.company === 'all' || j.company === f.company)
    .filter((j) => !q || `${j.title} ${j.company} ${j.locations.join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => ORDER[a.match.verdict] - ORDER[b.match.verdict] || b.match.score - a.match.score)
}

function filterBar() {
  const f = state.filters
  const counts = {}
  for (const j of Object.values(state.jobs)) counts[j.match.verdict] = (counts[j.match.verdict] ?? 0) + 1
  const companies = [...new Set(Object.values(state.jobs).map((j) => j.company))].sort()
  return h('div', { class: 'card row', style: 'margin-bottom:12px' },
    ...['strong', 'good', 'stretch', 'low', 'blocked'].map((v) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: f.show.has(v), onchange: (e) => { if (e.target.checked) f.show.add(v); else f.show.delete(v); renderMatches() } }), h('span', { class: `chip ${v}` }, `${VERDICT_LABEL[v]} ${counts[v] ?? 0}`))),
    h('select', { style: 'width:auto', onchange: (e) => { f.type = e.target.value; renderMatches() } }, ...[['all', 'All types'], ['internship', 'Internships'], ['full_time', 'Full-time']].map(([v, l]) => h('option', { value: v, selected: f.type === v ? '' : null }, l))),
    h('select', { style: 'width:auto', onchange: (e) => { f.company = e.target.value; renderMatches() } }, h('option', { value: 'all' }, 'All companies'), ...companies.map((c) => h('option', { value: c, selected: f.company === c ? '' : null }, c))),
    h('input', { type: 'text', placeholder: 'Search title, company, city…', value: f.q, style: 'width:220px', oninput: (e) => { f.q = e.target.value; renderList() } }),
  )
}

function renderMatches() {
  const m = $('matches')
  m.replaceChildren()
  if (!Object.keys(state.jobs).length) {
    m.append(h('div', { class: 'card stack' }, h('h2', {}, 'No search yet'), h('p', { class: 'muted' }, 'Press “Run search”. It reads the official job boards of Anthropic, OpenAI, Mistral AI, ElevenLabs, NVIDIA and other AI companies, then scores every engineering role against your profile.')))
    return
  }
  m.append(filterBar(), h('div', { id: 'list', class: 'stack' }))
  renderList()
}

function renderList() {
  const list = $('list')
  if (!list) return
  const jobs = filtered()
  list.replaceChildren(jobs.length ? '' : h('p', { class: 'muted' }, 'No roles with these filters.'))
  for (const j of jobs.slice(0, 200)) list.append(jobCard(j))
  if (jobs.length > 200) list.append(h('p', { class: 'muted small' }, `Showing the first 200 of ${jobs.length}. Narrow the filters to see the rest.`))
}

function jobCard(j) {
  const m = j.match
  const rec = state.tracker[j.key]
  const card = h('div', { class: 'card' },
    h('div', { class: 'job' },
      h('div', { class: `score ${m.verdict}`, title: `Role ${m.points.role}/35 · skills ${m.points.skills}/35 · level ${m.points.level}/20 · location ${m.points.location}/10` }, m.verdict === 'blocked' ? '✕' : m.score),
      h('div', {},
        h('div', { class: 'title' }, j.title),
        h('div', { class: 'muted small' }, [j.company, j.locations.join(' · ') || 'Location not stated', TYPE_LABEL[j.employmentType] ?? 'Type not stated', j.postedAt ? `posted ${fmtDate(j.postedAt)}` : null, j.compensation].filter(Boolean).join(' · ')),
        h('div', { class: 'row', style: 'margin-top:6px' }, h('span', { class: `chip ${m.verdict}` }, VERDICT_LABEL[m.verdict]), rec ? h('span', { class: 'chip status' }, STATUS_LABEL[rec.status]) : null, m.warnings.length ? h('span', { class: 'chip stretch' }, `${m.warnings.length} to check`) : null),
        h('div', { class: 'small', style: 'margin-top:6px' }, m.summary),
      ),
      h('div', { class: 'row actions' },
        h('button', { class: 'btn small', onclick: () => { if (state.open.has(j.key)) state.open.delete(j.key); else state.open.add(j.key); renderList() } }, state.open.has(j.key) ? 'Hide' : 'Why?'),
        !rec ? h('button', { class: 'btn small', onclick: () => track(j, 'shortlisted') }, '☆ Shortlist') : null,
        !rec || rec.status === 'shortlisted' ? h('button', { class: 'btn small', onclick: () => track(j, 'not_applying') }, 'Not for me') : null,
        h('button', { class: 'btn small primary', onclick: () => { state.preparing = state.preparing === j.key ? null : j.key; renderList() } }, state.preparing === j.key ? 'Close' : 'Prepare'),
      ),
    ),
  )
  if (state.open.has(j.key)) card.append(details(j))
  if (state.preparing === j.key) card.append(prepare(j))
  return card
}

function itemList(items, cls = '') {
  return h('ul', { class: 'list' }, items.map((it) => h('li', { class: cls }, it.text ?? it, it.evidence ? h('span', { class: 'evidence' }, `“${it.evidence}”`) : null)))
}

function details(j) {
  const m = j.match
  return h('div', { class: 'details' },
    m.blockers.length ? [h('h3', { style: 'color:var(--bad)' }, 'Blockers'), itemList(m.blockers)] : null,
    m.warnings.length ? [h('h3', { style: 'color:var(--warn)' }, 'Check before applying'), itemList(m.warnings)] : null,
    h('h3', {}, 'Why it fits'), itemList(m.reasons.length ? m.reasons : ['Nothing specific']),
    m.matched.length ? [h('h3', {}, 'Skills it asks for that your profile shows'), h('ul', { class: 'list' }, m.matched.map((s) => h('li', {}, `${s.skill} — ${s.level === 'professional' ? 'at work' : 'in a project'}: ${s.where}${s.required ? '' : ' (nice to have)'}`)))] : null,
    m.partial.length ? [h('h3', {}, 'Only from coursework or your LinkedIn list'), h('ul', { class: 'list' }, m.partial.map((s) => h('li', {}, `${s.skill} — ${s.where}`)))] : null,
    m.gaps.length ? [h('h3', {}, 'Asked for, not in your profile'), h('ul', { class: 'list' }, m.gaps.map((g) => h('li', {}, `${g.skill}${g.required ? '' : ' (nice to have)'}`)))] : null,
    h('p', { class: 'muted small' }, 'Skill detection is a keyword check of the posting — read the posting itself before deciding.'),
    h('h3', {}, 'From the posting'), h('div', { class: 'desc' }, j.description || 'No description.'),
    h('div', { class: 'row' }, h('a', { class: 'btn small', href: j.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open the official posting ↗')),
  )
}

async function track(j, status, extra = {}) {
  state.tracker = await updateTracker((t) => {
    const rec = t[j.key] ?? trackerRecord(j, j.match)
    t[j.key] = { ...(rec.status === status ? rec : withStatus(rec, status, extra)), ...extra.fields }
    return t
  })
  renderAll()
}

// ── Prepare: resume version, cover letter, duplicate and blocker checks, then open the official page ───────

function prepare(j) {
  const m = j.match
  const rec = state.tracker[j.key]
  const dup = findDuplicate(state.tracker, j)
  const draft = (state.drafts[j.key] ??= { mode: rec?.coverLetter ? 'letter' : 'none', text: rec?.coverLetter ?? '', reviewed: Boolean(rec?.coverLetter), issues: [], resumeId: state.resumes.find((r) => r.label === rec?.resumeVersion)?.id ?? state.resumes.find((r) => r.isDefault)?.id ?? state.resumes[0]?.id ?? null, acceptBlocked: false, busy: false, error: null })
  const box = h('div', { class: 'details stack' })
  const redraw = () => box.replaceWith(prepare(j))

  if (dup) box.append(h('div', { class: 'banner bad' }, `You already applied (${dup.kind}): ${dup.record.title} at ${dup.record.company}, ${fmtDate(dup.record.appliedAt)}. Applying twice usually hurts — check before going on.`))
  if (m.verdict === 'blocked') {
    box.append(h('div', { class: 'banner bad' }, h('b', {}, 'This role has blockers: '), m.blockers.map((b) => b.text).join('; '), h('div', {}, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: draft.acceptBlocked, onchange: (e) => { draft.acceptBlocked = e.target.checked; redraw() } }), 'I read the blockers and still want to apply'))))
  }
  if (j.ats === 'workday') box.append(h('div', { class: 'banner info' }, 'NVIDIA applications run on Workday, which needs a Workday account. The assistant cannot fill that form — copy your details from Profile, then mark it as applied under Applications.'))

  // Resume version
  box.append(h('h3', {}, '1. Resume version'))
  if (!state.resumes.length) box.append(h('p', {}, 'No resume stored. ', h('a', { href: 'profile.html#resumes' }, 'Add one in Profile')))
  else {
    box.append(h('select', { onchange: (e) => { draft.resumeId = e.target.value } }, state.resumes.map((r) => h('option', { value: r.id, selected: r.id === draft.resumeId ? '' : null }, `${r.label} — ${r.fileName}`))))
    const lead = m.matched.filter((s) => s.required).map((s) => s.where).filter((w, i, a) => a.indexOf(w) === i).slice(0, 3)
    if (lead.length) box.append(h('p', { class: 'muted small' }, `For this role, lead with: ${lead.join('; ')}. To tailor a version, edit public/resume.html in the portfolio, print it to PDF and add it in Profile → Resumes.`))
  }

  // Cover letter
  box.append(h('h3', {}, '2. Cover letter (optional)'))
  box.append(h('div', { class: 'row' },
    h('button', { class: 'btn small', onclick: () => { draft.mode = 'none'; draft.text = ''; draft.reviewed = false; redraw() } }, 'No cover letter'),
    h('button', { class: 'btn small', onclick: () => { draft.mode = 'letter'; draft.text = templateCoverLetter(state.profile, j, m); draft.issues = checkLetter(draft.text, state.profile); draft.reviewed = false; redraw() } }, 'Template from my profile'),
    h('button', { class: 'btn small', disabled: draft.busy || !state.settings.anthropicKey ? '' : null, title: state.settings.anthropicKey ? `Uses ${state.settings.model} with your API key` : 'Add an Anthropic API key in Profile to use this', onclick: async () => {
      draft.busy = true; draft.error = null; redraw()
      try {
        const r = await aiCoverLetter({ profile: state.profile, job: j, match: m, apiKey: state.settings.anthropicKey, model: state.settings.model })
        Object.assign(draft, { mode: 'letter', text: r.text, issues: r.issues, reviewed: false })
        if (r.truncated) draft.error = 'The draft was cut off — edit it or try again.'
      } catch (err) { draft.error = err.message }
      draft.busy = false; redraw()
    } }, draft.busy ? 'Drafting…' : 'AI draft (Claude)'),
  ))
  if (draft.error) box.append(h('div', { class: 'banner bad small' }, draft.error))
  if (draft.mode === 'letter') {
    const ta = h('textarea', { value: draft.text, oninput: (e) => { draft.text = e.target.value; draft.reviewed = false; draft.issues = checkLetter(draft.text, state.profile); issues.replaceChildren(...issueNodes()); rv.checked = false } })
    const issueNodes = () => (draft.issues.length ? [h('div', { class: 'banner small' }, h('b', {}, 'Check these claims: '), h('ul', { class: 'list' }, draft.issues.map((x) => h('li', {}, x))))] : [h('p', { class: 'muted small' }, 'No unsupported skills or numbers found. Still read every line.')])
    const issues = h('div', {}, ...issueNodes())
    const rv = h('input', { type: 'checkbox', checked: draft.reviewed, onchange: (e) => { draft.reviewed = e.target.checked; redraw() } })
    box.append(ta, issues, h('label', { class: 'check' }, rv, 'I read this letter; everything in it is true'))
  }

  // Go
  const ready = (m.verdict !== 'blocked' || draft.acceptBlocked) && (draft.mode === 'none' || draft.reviewed)
  const resume = state.resumes.find((r) => r.id === draft.resumeId)
  box.append(h('h3', {}, '3. Apply on the official page'))
  box.append(h('p', { class: 'muted small' }, j.ats === 'workday' ? 'Opens the Workday posting.' : 'Opens the official application page. Click “Fill from my profile” in the panel there, answer the highlighted questions yourself, review, and press the site’s Submit button. Then click “I submitted it”.'))
  box.append(h('div', { class: 'row' },
    h('button', { class: 'btn primary', disabled: ready ? null : '', onclick: async () => {
      const fields = { resumeVersion: resume?.label ?? null, coverLetter: draft.mode === 'letter' ? draft.text : null }
      await track(j, rec && ['applied', 'interviewing', 'offer'].includes(rec.status) ? rec.status : 'preparing', { fields })
      const pendingApply = await get('pendingApply', {})
      pendingApply[j.key] = { jobKey: j.key, jobId: j.id, company: j.company, title: j.title, score: j.match.score, resumeId: resume?.id ?? null, resumeLabel: resume?.label ?? null, coverLetter: fields.coverLetter, createdAt: new Date().toISOString() }
      await set('pendingApply', pendingApply)
      chrome.tabs.create({ url: j.applyUrl })
    } }, 'Open application page ↗'),
    !ready ? h('span', { class: 'muted small' }, m.verdict === 'blocked' && !draft.acceptBlocked ? 'Confirm the blockers first.' : 'Tick that you reviewed the letter, or choose “No cover letter”.') : null,
  ))
  return box
}

// ── Applications ─────────────────────────────────────────────────────────────

function renderApps() {
  const s = $('apps')
  s.replaceChildren()
  const recs = Object.values(state.tracker).sort((a, b) => String(b.appliedAt ?? b.history?.at(-1)?.at).localeCompare(String(a.appliedAt ?? a.history?.at(-1)?.at)))
  s.append(h('div', { class: 'spread', style: 'margin-bottom:10px' }, h('div', { class: 'muted small' }, `${recs.length} tracked · ${recs.filter((r) => ['applied', 'interviewing', 'offer'].includes(r.status)).length} applied`), h('button', { class: 'btn small', onclick: () => download(`applications-${new Date().toISOString().slice(0, 10)}.csv`, trackerCsv(state.tracker)) }, 'Export CSV')))
  if (!recs.length) {
    s.append(h('p', { class: 'muted' }, 'Nothing tracked yet. Shortlist or prepare a role from Matches.'))
    return
  }
  const save = async (key, patch) => {
    state.tracker = await updateTracker((t) => ({ ...t, [key]: { ...t[key], ...patch } }))
  }
  s.append(h('div', { class: 'card', style: 'overflow:auto' }, h('table', { class: 't' },
    h('thead', {}, h('tr', {}, ['Role', 'Status', 'Applied', 'Resume version', 'Notes', ''].map((c) => h('th', {}, c)))),
    h('tbody', {}, recs.map((r) => h('tr', {},
      h('td', {}, h('b', {}, r.title), h('div', { class: 'muted small' }, `${r.company}${r.score != null ? ` · ${r.score}/100` : ''}`)),
      h('td', {}, h('select', { onchange: async (e) => {
        const status = e.target.value
        if (status === 'applied' && !confirm('Mark as applied? Do this only after you submitted the application on the official page.')) return renderApps()
        state.tracker = await updateTracker((t) => ({ ...t, [r.key]: withStatus(t[r.key], status) }))
        renderAll()
      } }, STATUSES.map((st) => h('option', { value: st, selected: st === r.status ? '' : null }, STATUS_LABEL[st])))),
      h('td', { class: 'small' }, fmtDate(r.appliedAt)),
      h('td', {}, h('input', { type: 'text', value: r.resumeVersion ?? '', style: 'min-width:140px', onchange: (e) => save(r.key, { resumeVersion: e.target.value || null }) })),
      h('td', {}, h('input', { type: 'text', value: r.notes ?? '', style: 'min-width:160px', onchange: (e) => save(r.key, { notes: e.target.value }) })),
      h('td', {}, h('a', { href: r.applyUrl ?? r.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open ↗')),
    ))),
  )))
}

// ── Last run ─────────────────────────────────────────────────────────────────

function renderSources() {
  const s = $('sources')
  s.replaceChildren()
  if (!state.meta) return s.append(h('p', { class: 'muted' }, 'No run yet.'))
  s.append(h('p', { class: 'muted small', style: 'margin-bottom:8px' }, `Run on ${new Date(state.meta.at).toLocaleString()}. Only engineering titles are scored; the rest (sales, recruiting, legal …) are skipped.`))
  s.append(h('div', { class: 'card', style: 'overflow:auto' }, h('table', { class: 't' },
    h('thead', {}, h('tr', {}, ['Company', 'Open roles', 'Engineering roles scored', 'Time', 'Result'].map((c) => h('th', {}, c)))),
    h('tbody', {}, state.meta.perSource.map((p) => h('tr', {}, h('td', {}, p.company), h('td', {}, p.total), h('td', {}, p.relevant), h('td', { class: 'small' }, `${(p.ms / 1000).toFixed(1)} s`), h('td', { class: 'small', style: p.error ? 'color:var(--bad)' : '' }, p.error ?? 'OK')))),
  )))
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

for (const t of document.querySelectorAll('.tab')) {
  t.onclick = () => {
    for (const x of document.querySelectorAll('.tab')) x.classList.toggle('active', x === t)
    for (const id of ['matches', 'apps', 'sources']) $(id).hidden = id !== t.dataset.tab
  }
}

function renderAll() {
  renderBanners()
  renderMatches()
  renderApps()
  renderSources()
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.tracker) {
    state.tracker = changes.tracker.newValue ?? {}
    renderApps()
    renderList()
  }
})

$('run').onclick = run
$('rescore').onclick = rescore
renderAll()
if (location.hash === '#run') {
  history.replaceState(null, '', location.pathname)
  run()
}
