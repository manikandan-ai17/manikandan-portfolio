import { h, toast, download, fmtDate, TYPE_LABEL, STATUS_LABEL } from './ui.js'
import { get, set, loadProfile, saveProfile, loadSources, loadSettings, findDuplicate, trackerRecord, withStatus, updateTracker, trackerCsv, manualJob, STATUSES } from '../src/lib/store.js'
import { draftAnswer, checkAnswer, COMMON_QUESTIONS, KINDS, classifyQuestion } from '../src/lib/answers.js'
import { portalOf } from '../src/lib/sources.js'
import { missingInfo, skillEvidence } from '../src/lib/profile.js'
import { runSearch } from '../src/lib/pipeline.js'
import { scoreJob, VERDICT_LABEL } from '../src/lib/match.js'
import { templateCoverLetter, aiCoverLetter, checkLetter } from '../src/lib/coverLetter.js'
import { renderAutoTab, onQueueChange, oneClickRun } from './autoapply.js'
import { aiConfig, hasAi, providerName } from '../src/lib/ai.js'

const $ = (id) => document.getElementById(id)
const state = {
  profile: await loadProfile(),
  jobs: await get('jobs', {}),
  // Jobs you added by hand (found on LinkedIn, Indeed, Wellfound …): kept across runs.
  manual: await get('manualJobs', {}),
  adding: location.hash === '#add',
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
$('who').textContent = state.profile.fullName ? `${state.profile.fullName} · roles that match your verified experience` : 'Add your details in Profile to see roles that match you'

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

const allJobs = () => ({ ...state.jobs, ...state.manual })

async function rescore() {
  const ev = skillEvidence(state.profile)
  for (const j of Object.values(allJobs())) j.match = scoreJob(j, state.profile, ev)
  await set('jobs', state.jobs)
  await set('manualJobs', state.manual)
  toast('Re-checked every saved job against your current profile.')
  renderAll()
}

// ── Matches ──────────────────────────────────────────────────────────────────

const ORDER = { strong: 0, good: 1, stretch: 2, low: 3, blocked: 4 }

function filtered() {
  const f = state.filters
  const q = f.q.trim().toLowerCase()
  return Object.values(allJobs())
    .filter((j) => f.show.has(j.match.verdict))
    .filter((j) => f.type === 'all' || j.employmentType === f.type || (f.type === 'full_time' && j.employmentType === null))
    .filter((j) => f.company === 'all' || j.company === f.company)
    .filter((j) => !q || `${j.title} ${j.company} ${j.locations.join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => ORDER[a.match.verdict] - ORDER[b.match.verdict] || b.match.score - a.match.score)
}

function filterBar() {
  const f = state.filters
  const counts = {}
  for (const j of Object.values(allJobs())) counts[j.match.verdict] = (counts[j.match.verdict] ?? 0) + 1
  const companies = [...new Set(Object.values(allJobs()).map((j) => j.company))].sort()
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
  m.append(h('div', { class: 'row', style: 'margin-bottom:12px' }, h('button', { class: 'btn small', onclick: () => { state.adding = !state.adding; renderMatches() } }, state.adding ? 'Close' : '+ Add a job you found elsewhere (LinkedIn, Indeed, Wellfound …)')))
  if (state.adding) m.append(addJobForm())
  if (!Object.keys(allJobs()).length) {
    m.append(h('div', { class: 'card stack' }, h('h2', {}, 'No search yet'), h('p', { class: 'muted' }, 'Press “Run search”. It reads the official job boards of Anthropic, OpenAI, Mistral AI, ElevenLabs, NVIDIA and other AI companies, then scores every engineering role against your profile.')))
    return
  }
  m.append(filterBar(), h('div', { id: 'list', class: 'stack' }))
  renderList()
}

// Jobs from sites the assistant must not automate: you paste the posting, it scores, tracks and drafts answers.
function addJobForm() {
  const f = { portal: 'LinkedIn', company: '', title: '', url: '', location: '', employmentType: '', description: '' }
  const inp = (k, ph) => h('input', { type: 'text', placeholder: ph, oninput: (e) => (f[k] = e.target.value) })
  return h('div', { class: 'card stack', style: 'margin-bottom:12px' },
    h('h2', {}, 'Add a job you found yourself'),
    h('p', { class: 'muted small' }, 'LinkedIn, Indeed and Wellfound do not allow extensions to read or fill their pages, so copy the posting in here. It is scored against your profile, tracked (no duplicates) and gets drafted answers that you paste into their form yourself.'),
    h('div', { class: 'grid2' },
      h('label', { class: 'field' }, 'Where you found it', h('select', { onchange: (e) => (f.portal = e.target.value) }, ['LinkedIn', 'Indeed', 'Wellfound', 'Naukri', 'Referral', 'Company site', 'Other'].map((p) => h('option', { value: p }, p)))),
      h('label', { class: 'field' }, 'Type', h('select', { onchange: (e) => (f.employmentType = e.target.value) }, [['', 'Not stated'], ['full_time', 'Full-time'], ['internship', 'Internship'], ['contract', 'Contract']].map(([v, l]) => h('option', { value: v }, l)))),
      h('label', { class: 'field' }, 'Company', inp('company', 'e.g. Sarvam AI')),
      h('label', { class: 'field' }, 'Job title', inp('title', 'e.g. AI Engineer')),
      h('label', { class: 'field' }, 'Link to the posting', inp('url', 'https://…')),
      h('label', { class: 'field' }, 'Location', inp('location', 'e.g. Bengaluru, India; Remote')),
    ),
    h('label', { class: 'field' }, 'The job description (copy it from the posting)', h('textarea', { style: 'min-height:140px', oninput: (e) => (f.description = e.target.value) })),
    h('div', {}, h('button', { class: 'btn primary', onclick: async () => {
      if (!f.company.trim() || !f.title.trim()) return toast('Add at least the company and the job title.')
      if (f.description.trim().length < 80) return toast('Paste the job description too — the match and the answers are based on it.')
      const job = manualJob(f)
      job.match = scoreJob(job, state.profile)
      state.manual = { ...state.manual, [job.key]: job }
      await set('manualJobs', state.manual)
      state.adding = false
      state.filters.show.add(job.match.verdict)
      state.filters.q = job.title
      toast(`Added: ${job.title} at ${job.company} — ${VERDICT_LABEL[job.match.verdict]} (${job.match.score}/100).`, 4000)
      renderAll()
    } }, 'Score and add')),
  )
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
  // Re-render the list (the draft lives in state.drafts). Replacing `box` only worked once: after that it is
  // no longer on the page, so later updates (e.g. "Drafting…" → the draft) never showed.
  const redraw = () => renderList()

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
    h('button', { class: 'btn small', disabled: draft.busy || !hasAi(state.settings) ? '' : null, title: hasAi(state.settings) ? `Uses ${providerName(aiConfig(state.settings))} (${aiConfig(state.settings).model}) with your API key` : 'Add a Gemini or Anthropic API key in Profile to use this', onclick: async () => {
      draft.busy = true; draft.error = null; redraw()
      try {
        const ai = aiConfig(state.settings)
        const r = await aiCoverLetter({ profile: state.profile, job: j, match: m, apiKey: ai.apiKey, model: ai.model, provider: ai.provider })
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

  // Written answers
  box.append(h('h3', {}, '3. Written answers (optional)'), answersStep(j, m, draft, rec, redraw))

  // Go
  const ready = (m.verdict !== 'blocked' || draft.acceptBlocked) && (draft.mode === 'none' || draft.reviewed)
  const resume = state.resumes.find((r) => r.id === draft.resumeId)
  const approved = (draft.answers ?? []).filter((a) => a.approved && a.text.trim()).map((a) => ({ question: a.question, kind: a.kind, text: a.text }))
  const fields = () => ({ resumeVersion: resume?.label ?? null, coverLetter: draft.mode === 'letter' ? draft.text : null, prepared: approved })
  const manual = j.ats === 'manual'
  box.append(h('h3', {}, '4. Apply'))
  box.append(h('p', { class: 'muted small' }, manual ? `Opens the posting on ${j.portal}. The assistant does not fill forms there — copy your approved answers in yourself, submit, then press “I submitted it” here.` : j.ats === 'workday' ? 'Opens the Workday posting (needs your Workday account; fill it yourself, then mark it applied under Applications).' : 'Opens the official application page. Click “Fill from my profile” in the panel there, then “Draft written answers” — your approved answers are offered first. Review everything, press the site’s Submit button, then click “I submitted it”.'))
  box.append(h('div', { class: 'row' },
    h('button', { class: 'btn primary', disabled: ready && j.applyUrl ? null : '', onclick: async () => {
      await track(j, rec && ['applied', 'interviewing', 'offer'].includes(rec.status) ? rec.status : 'preparing', { fields: fields() })
      const pendingApply = await get('pendingApply', {})
      pendingApply[j.key] = { jobKey: j.key, jobId: j.id, company: j.company, title: j.title, score: j.match.score, resumeId: resume?.id ?? null, resumeLabel: resume?.label ?? null, coverLetter: fields().coverLetter, answers: approved, createdAt: new Date().toISOString() }
      await set('pendingApply', pendingApply)
      chrome.tabs.create({ url: j.applyUrl })
    } }, manual ? `Open on ${j.portal} ↗` : 'Open application page ↗'),
    manual || j.ats === 'workday' ? h('button', { class: 'btn', disabled: ready ? null : '', onclick: async () => {
      if (!confirm('Record this application as submitted? Only after you submitted it on the site.')) return
      await track(j, 'applied', { resumeVersion: resume?.label, fields: { ...fields(), answers: approved.map((a) => ({ question: a.question, answer: a.text })) } })
      toast('Recorded as applied.')
    } }, 'I submitted it') : null,
    !ready ? h('span', { class: 'muted small' }, m.verdict === 'blocked' && !draft.acceptBlocked ? 'Confirm the blockers first.' : 'Tick that you reviewed the letter, or choose “No cover letter”.') : null,
  ))
  return box
}

/** Drafts for the common questions (and any you add), each edited and approved by you before it is used. */
function answersStep(j, m, draft, rec, redraw) {
  draft.answers ??= (rec?.prepared?.length ? rec.prepared.map((a) => ({ ...a, approved: true, source: 'saved', issues: [] })) : COMMON_QUESTIONS.map((q) => ({ question: q.replace('{company}', j.company), kind: classifyQuestion(q), text: '', approved: false, issues: [] })))
  const wrap = h('div', { class: 'stack' })
  const ctx = { profile: state.profile, job: j, match: m, settings: state.settings }
  const draftOne = async (a) => {
    a.busy = true
    a.error = null
    redraw()
    try {
      const d = await draftAnswer(a.question, { ...ctx, preferAi: a.preferAi })
      Object.assign(a, { text: d.text, kind: d.kind, source: d.source, note: d.note, issues: d.issues ?? [], approved: false })
    } catch (err) {
      a.error = err.message
    }
    a.busy = false
    redraw()
  }
  wrap.append(h('p', { class: 'muted small' }, 'Drafted from your verified profile and this posting. Bracketed parts are things only you can say — the answer cannot be approved until you replace them. With an Anthropic key, other questions get AI drafts too (checked the same way).'))
  wrap.append(h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: async () => { for (const a of draft.answers) if (!a.text && !a.approved) await draftOne(a) } }, 'Draft all')))
  for (const a of draft.answers) {
    const blocking = (a.issues ?? []).some((i) => i.blocking)
    const ta = h('textarea', { style: 'min-height:120px', value: a.text, placeholder: a.note ?? 'Press Draft, or write your answer here.', oninput: (e) => { a.text = e.target.value; a.approved = false; a.issues = checkAnswer(a.text, state.profile); issueBox.replaceChildren(...issueNodes()); ok.checked = false } })
    const issueNodes = () => (a.issues ?? []).map((i) => h('div', { class: `small ${i.blocking ? '' : 'muted'}`, style: i.blocking ? 'color:var(--warn)' : '' }, `• ${i.text}`))
    const issueBox = h('div', {}, ...issueNodes())
    const ok = h('input', { type: 'checkbox', checked: a.approved, disabled: blocking || !a.text.trim() ? '' : null, onchange: (e) => { a.approved = e.target.checked; redraw() } })
    wrap.append(h('div', { class: 'card stack', style: 'box-shadow:none;padding:12px' },
      h('div', { class: 'spread' }, h('b', {}, a.question), h('span', { class: 'chip' }, KINDS[a.kind] ?? 'Question')),
      a.source ? h('div', { class: 'muted small' }, { template: 'Draft from your profile', ai: 'AI draft — check every claim', saved: 'Saved answer', none: 'Needs your answer', profile: 'From your profile' }[a.source] ?? a.source) : null,
      ta,
      issueBox,
      a.error ? h('div', { class: 'banner bad small' }, a.error) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn small', disabled: a.busy ? '' : null, onclick: () => draftOne(a) }, a.busy ? 'Drafting…' : a.text ? 'Redraft' : 'Draft'),
        hasAi(state.settings) ? h('button', { class: 'btn small', disabled: a.busy ? '' : null, onclick: () => { a.preferAi = true; draftOne(a) } }, 'AI draft') : null,
        h('button', { class: 'btn small', disabled: a.text ? null : '', onclick: async () => { await navigator.clipboard.writeText(a.text); toast('Copied.') } }, 'Copy'),
        h('label', { class: 'check' }, ok, blocking ? 'Replace the bracketed parts first' : 'Approved — true and in my words'),
        h('button', { class: 'btn small danger', onclick: () => { draft.answers = draft.answers.filter((x) => x !== a); redraw() } }, 'Remove'),
      ),
    ))
  }
  const q = h('input', { type: 'text', placeholder: 'Add a question from the application form, e.g. “What are your favourite AI tools?”' })
  wrap.append(h('div', { class: 'row' }, h('div', { style: 'flex:1' }, q), h('button', { class: 'btn small', onclick: () => { if (!q.value.trim()) return; draft.answers.push({ question: q.value.trim(), kind: classifyQuestion(q.value), text: '', approved: false, issues: [] }); redraw() } }, 'Add question')))
  return wrap
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
    h('thead', {}, h('tr', {}, ['Role', 'Job site', 'Status', 'Applied', 'Resume version', 'Answers', 'Notes', ''].map((c) => h('th', {}, c)))),
    h('tbody', {}, recs.map((r) => h('tr', {},
      h('td', {}, h('b', {}, r.title), h('div', { class: 'muted small' }, `${r.company}${r.score != null ? ` · ${r.score}/100` : ''}`)),
      h('td', { class: 'small' }, r.portal ?? portalOf(r.applyUrl ?? r.url ?? '')),
      h('td', {}, h('select', { onchange: async (e) => {
        const status = e.target.value
        if (status === 'applied' && !confirm('Mark as applied? Do this only after you submitted the application on the official page.')) return renderApps()
        state.tracker = await updateTracker((t) => ({ ...t, [r.key]: withStatus(t[r.key], status) }))
        renderAll()
      } }, STATUSES.map((st) => h('option', { value: st, selected: st === r.status ? '' : null }, STATUS_LABEL[st])))),
      h('td', { class: 'small' }, fmtDate(r.appliedAt)),
      h('td', {}, h('input', { type: 'text', value: r.resumeVersion ?? '', style: 'min-width:140px', onchange: (e) => save(r.key, { resumeVersion: e.target.value || null }) })),
      h('td', { class: 'small' }, (() => {
        // What the company received (put in the form), else what you prepared.
        const list = r.answers?.length ? r.answers.map((a) => ({ q: a.question, a: a.answer })) : (r.prepared ?? []).map((a) => ({ q: a.question, a: a.text }))
        if (!list.length) return '—'
        return h('details', {}, h('summary', {}, `${list.length} ${r.answers?.length ? 'submitted' : 'prepared'}`), ...list.map((x) => h('div', { style: 'margin:6px 0;max-width:420px' }, h('b', {}, x.q), h('div', { style: 'white-space:pre-wrap' }, x.a))))
      })()),
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
    for (const id of ['matches', 'auto', 'apps', 'sources']) $(id).hidden = id !== t.dataset.tab
    if (t.dataset.tab === 'auto') renderAuto()
  }
}

const renderAuto = () => renderAutoTab($('auto'), state, allJobs, { search: run })
const showTab = (name) => document.querySelector(`.tab[data-tab="${name}"]`)?.click()
onQueueChange(renderAuto)

function renderAll() {
  renderBanners()
  renderMatches()
  renderApps()
  renderSources()
  renderAuto()
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.autoApplyLog || changes.autoApplyRun || changes.settings || changes.processedJobs || changes.pendingQuestions || changes.lastRun) renderAuto()
  if (changes.tracker) {
    state.tracker = changes.tracker.newValue ?? {}
    renderApps()
    renderList()
  }
})

$('run').onclick = run
$('rescore').onclick = rescore
renderAll()
if (location.hash === '#add') history.replaceState(null, '', location.pathname)
if (location.hash === '#run') {
  history.replaceState(null, '', location.pathname)
  run()
}
if (location.hash === '#auto') {
  history.replaceState(null, '', location.pathname)
  showTab('auto')
}
// The popup's Run: search, then apply to up to N suitable companies. Keep this tab open until it finishes.
if (location.hash === '#autorun') {
  history.replaceState(null, '', location.pathname)
  showTab('auto')
  oneClickRun(state, { search: run, allJobs })
}
