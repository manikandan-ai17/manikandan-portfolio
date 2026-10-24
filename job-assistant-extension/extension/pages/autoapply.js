// The dashboard's Auto-apply tab and the queue that drives it. The queue opens each job's official application
// page in a background tab; src/content/autorun.js fills and (unless dry-run) submits it, then reports back
// through storage. Keep this dashboard tab open while the queue runs.

import { h, toast, fmtDate } from './ui.js'
import { get, set, loadSettings, updateTracker, trackerRecord } from '../src/lib/store.js'
import { loadAuto, eligibility, appliedToday, pauseFor, pickCandidates } from '../src/lib/autoapply.js'
import { templateCoverLetter, checkLetter } from '../src/lib/coverLetter.js'
import { aiConfig } from '../src/lib/ai.js'
import { aiFit, fitAllowsApply } from '../src/lib/aiTasks.js'
import { mergePending, answerQuestion } from '../src/lib/answerBank.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FINAL = new Set(['applied', 'needs_you', 'failed', 'dry_run', 'unconfirmed'])
const STATUS_TEXT = { applied: 'Applied', needs_you: 'Needs you', failed: 'Failed', dry_run: 'Dry run done', unconfirmed: 'Check the tab', queued: 'Queued', filling: 'Filling…', submitted: 'Submitting…', skipped_fit: 'Skipped: poor fit', fit_error: 'Fit check failed' }
const STATUS_CLASS = { applied: 'strong', dry_run: 'good', needs_you: 'stretch', failed: 'blocked', unconfirmed: 'stretch', skipped_fit: '', fit_error: 'stretch' }

export const queue = { running: false, stop: false, total: 0, index: 0, current: null, message: '' }
let notify = () => {}
export const onQueueChange = (fn) => { notify = fn }

async function waitResult(jobKey, startedAt, timeoutMs = 6 * 60 * 1000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    await sleep(1500)
    const run = await get('autoApplyRun')
    if (run?.jobKey === jobKey && !run.active && FINAL.has(run.stage)) {
      const log = await get('autoApplyLog', [])
      const entry = log.find((e) => e.jobKey === jobKey && new Date(e.at).getTime() >= startedAt - 1000)
      if (entry) return entry
    }
    if (queue.stop) break
  }
  const entry = { status: 'failed', reason: 'The application page never started the assistant (the page may not be a supported form).', jobKey, at: new Date().toISOString() }
  const log = await get('autoApplyLog', [])
  await set('autoApplyLog', [entry, ...log].slice(0, 300))
  await set('autoApplyRun', { ...(await get('autoApplyRun')), active: false, stage: 'failed' })
  return entry
}

async function noteNeeds(job, entry) {
  await updateTracker((t) => {
    const rec = t[job.key] ?? trackerRecord(job, job.match)
    const why = (entry.reasons ?? [entry.reason]).filter(Boolean).join('; ')
    t[job.key] = { ...rec, status: rec.status === 'shortlisted' ? 'preparing' : rec.status, notes: `Auto-apply: ${STATUS_TEXT[entry.status] ?? entry.status} — ${why}`.slice(0, 600) }
    return t
  })
}

/** Opens one job's application page and waits for the engine's result. Records the outcome in the job history. */
async function applyOne(job, state, auto) {
  const resumes = await get('resumes', [])
  const resume = resumes.find((r) => r.isDefault) ?? resumes[0]
  let coverLetter = null
  if (auto.autoCoverLetter) {
    const letter = templateCoverLetter(state.profile, job, job.match)
    if (!checkLetter(letter, state.profile).length) coverLetter = letter
  }
  const pendingApply = await get('pendingApply', {})
  pendingApply[job.key] = { jobKey: job.key, jobId: job.id, company: job.company, title: job.title, score: job.match.score, resumeId: resume?.id ?? null, resumeLabel: resume?.label ?? null, coverLetter, answers: [], createdAt: new Date().toISOString() }
  await set('pendingApply', pendingApply)
  const startedAt = Date.now()
  await set('autoApplyRun', { active: true, stage: 'queued', jobKey: job.key, jobId: String(job.id ?? ''), applyUrl: job.applyUrl, company: job.company, title: job.title, dryRun: auto.dryRun, auto, startedAt, job: { company: job.company, title: job.title, locations: job.locations ?? [], remote: job.remote ?? null } })
  const tab = await chrome.tabs.create({ url: job.applyUrl, active: false })
  const entry = await waitResult(job.key, startedAt)
  if (entry.status === 'needs_you' || entry.status === 'failed' || entry.status === 'unconfirmed') await noteNeeds(job, entry)
  // Finished tabs close; anything that needs a look stays open (and a dry run stays open so you can review it).
  if (['applied', 'failed'].includes(entry.status) && !auto.dryRun) chrome.tabs.remove(tab.id).catch(() => {})
  await recordProcessed(job, entry)
  if (entry.questions?.length) await set('pendingQuestions', mergePending(await get('pendingQuestions', {}), entry.questions, job.key))
  return entry
}

async function recordProcessed(job, entry, extra = {}) {
  const processed = await get('processedJobs', {})
  const prev = processed[job.key]
  processed[job.key] = {
    key: job.key, company: job.company, title: job.title, url: job.applyUrl ?? job.url, portal: job.ats,
    status: entry.status, reasons: entry.reasons ?? (entry.reason ? [entry.reason] : []), questions: (entry.questions ?? []).map((q) => ({ key: q.key, label: q.label })),
    attempts: (prev?.attempts ?? 0) + (entry.status === 'skipped_fit' || entry.status === 'fit_error' ? 0 : 1), at: new Date().toISOString(), dryRun: Boolean(entry.dryRun), ...extra,
  }
  await set('processedJobs', processed)
}

const pauseBetween = async (auto) => {
  for (let s = pauseFor(auto); s > 0 && !queue.stop; s--) {
    queue.message = `Next application in ${s}s…`
    notify()
    await sleep(1000)
  }
}

/** Runs the queue one job at a time ("Apply to this" on the tab). `jobs` already passed eligibility(). */
export async function startQueue(jobs, state) {
  if (queue.running) return toast('Auto-apply is already running.')
  const auto = loadAuto(await loadSettings())
  if (!auto.enabled) return toast('Turn on Auto-apply in Profile first.', 4000)
  Object.assign(queue, { running: true, stop: false, total: jobs.length, index: 0 })
  notify()
  try {
    for (const job of jobs) {
      if (queue.stop) break
      queue.index++
      queue.current = job
      const elig = eligibility(job, { profile: state.profile, auto, tracker: await get('tracker', {}), resumes: await get('resumes', []), log: await get('autoApplyLog', []) })
      if (!elig.ok) { queue.message = `Skipped ${job.title}: ${elig.reasons[0]}`; notify(); continue }
      queue.message = `${auto.dryRun ? 'Dry run: ' : ''}${job.title} at ${job.company}…`
      notify()
      const entry = await applyOne(job, state, auto)
      queue.message = `${job.title} at ${job.company}: ${STATUS_TEXT[entry.status] ?? entry.status}`
      notify()
      if (!queue.stop && job !== jobs.at(-1)) await pauseBetween(auto)
    }
  } finally {
    Object.assign(queue, { running: false, current: null, message: queue.stop ? 'Stopped.' : 'Queue finished.' })
    notify()
  }
}

/**
 * ONE-CLICK RUN: fresh search → best job at each company you have not applied to → AI fit check → apply until
 * `targetPerRun` applications succeed (or `maxAttemptsPerRun` forms were tried, or the good candidates run out).
 * Fewer than the target is fine: unsuitable jobs are never sent to make up the number.
 */
export async function oneClickRun(state, { search, allJobs }) {
  if (queue.running) return toast('A run is already going.')
  const settings = await loadSettings()
  const auto = loadAuto(settings)
  if (!auto.enabled) return toast('Turn on Auto-apply in Profile → Auto-apply first.', 5000)
  Object.assign(queue, { running: true, stop: false, total: auto.targetPerRun, index: 0, message: 'Searching the job boards…' })
  notify()
  const summary = { at: new Date().toISOString(), dryRun: auto.dryRun, applied: [], needsYou: [], failed: [], skippedFit: [], tried: 0, candidates: 0 }
  try {
    await search()
    const jobs = allJobs()
    const { candidates, skipped } = pickCandidates(jobs, { profile: state.profile, auto, tracker: await get('tracker', {}), resumes: await get('resumes', []), log: await get('autoApplyLog', []), processed: await get('processedJobs', {}), answerBank: await get('answerBank', {}) })
    summary.candidates = candidates.length
    summary.skipped = skipped
    const useFit = auto.aiFit && aiConfig(settings)?.provider === 'gemini'
    for (const job of candidates) {
      if (queue.stop || summary.applied.length >= auto.targetPerRun || summary.tried >= auto.maxAttemptsPerRun) break
      if (!auto.dryRun && appliedToday(await get('autoApplyLog', [])) >= auto.dailyCap) { summary.stoppedBy = `daily limit of ${auto.dailyCap}`; break }
      if (useFit) {
        queue.message = `Checking fit: ${job.title} at ${job.company}…`
        notify()
        let fit = null
        try { fit = await aiFit({ job, profile: state.profile, match: job.match, settings }) } catch (err) { fit = { decision: 'error', blockers: [err.message] } }
        if (fit?.decision === 'error') { await recordProcessed(job, { status: 'fit_error', reasons: fit.blockers }); continue }
        if (!fitAllowsApply(fit)) {
          await recordProcessed(job, { status: 'skipped_fit', reasons: fit.blockers?.length ? fit.blockers : [`AI judged the fit ${fit.fit}`] }, { fit })
          summary.skippedFit.push(`${job.title} at ${job.company}`)
          continue
        }
      }
      summary.tried++
      queue.index = summary.applied.length + 1
      queue.message = `${auto.dryRun ? 'Dry run: ' : ''}Applying: ${job.title} at ${job.company}…`
      notify()
      const entry = await applyOne(job, state, auto)
      const line = `${job.title} at ${job.company}`
      if (entry.status === 'applied' || entry.status === 'dry_run') summary.applied.push(line)
      else if (entry.status === 'needs_you' || entry.status === 'unconfirmed') summary.needsYou.push(line)
      else summary.failed.push(`${line}: ${entry.reason ?? entry.status}`)
      queue.message = `${line}: ${STATUS_TEXT[entry.status] ?? entry.status}`
      notify()
      if (!queue.stop && summary.applied.length < auto.targetPerRun) await pauseBetween(auto)
    }
  } catch (err) {
    summary.error = err.message
  } finally {
    await set('lastRun', summary)
    const verb = summary.dryRun ? 'filled (dry run)' : 'applied'
    const text = `${summary.applied.length} ${verb}${summary.needsYou.length ? ` · ${summary.needsYou.length} need your answers` : ''}${summary.failed.length ? ` · ${summary.failed.length} failed` : ''}${summary.skippedFit.length ? ` · ${summary.skippedFit.length} skipped as poor fit` : ''}`
    chrome.notifications?.create(`run-${Date.now()}`, { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title: summary.error ? 'Run stopped' : 'Run finished', message: summary.error ? summary.error : summary.candidates ? text : 'No new suitable jobs this time.', priority: 1 })
    Object.assign(queue, { running: false, current: null, message: summary.error ? `Stopped: ${summary.error}` : `Run finished: ${text}` })
    notify()
  }
  return summary
}

// ── The tab ────────────────────────────────────────────────────────────────

export async function renderAutoTab(root, state, allJobs, { search } = {}) {
  const settings = await loadSettings()
  const auto = loadAuto(settings)
  const tracker = await get('tracker', {})
  const resumes = await get('resumes', [])
  const log = await get('autoApplyLog', [])
  const jobs = Object.values(allJobs())
  const ready = []
  const skipped = new Map()
  for (const j of jobs) {
    if (!j.match || !['strong', 'good'].includes(j.match.verdict)) continue
    const e = eligibility(j, { profile: state.profile, auto, tracker, resumes, log })
    if (e.ok) ready.push(j)
    else skipped.set(e.reasons[0], (skipped.get(e.reasons[0]) ?? 0) + 1)
  }
  ready.sort((a, b) => b.match.score - a.match.score)
  const todayCount = appliedToday(log)
  const processed = Object.values(await get('processedJobs', {})).sort((a, b) => String(b.at).localeCompare(String(a.at)))
  const pending = await get('pendingQuestions', {})
  const lastRun = await get('lastRun')
  const hasGemini = aiConfig(settings)?.provider === 'gemini'
  const rerender = () => renderAutoTab(root, state, allJobs, { search })

  root.replaceChildren(...[
    h('div', { class: 'card stack' },
      h('h2', {}, 'Auto-apply'),
      !auto.enabled
        ? h('div', { class: 'banner bad' }, h('b', {}, 'Auto-apply is OFF. '), 'Turn it on in ', h('a', { href: 'profile.html#autoapply' }, 'Profile → Auto-apply'), '.')
        : h('div', { class: auto.dryRun ? 'banner info' : 'banner' }, h('b', {}, auto.dryRun ? 'DRY RUN — it fills each form but does NOT submit. ' : 'LIVE — it will submit applications. '), auto.dryRun ? 'Check a few filled tabs, then switch dry run off in Profile.' : `Applied today: ${todayCount} of ${auto.dailyCap}.`),
      h('p', { class: 'muted small' }, `Ready: ${ready.length} Strong/Good match${ready.length === 1 ? '' : 'es'} on Greenhouse, Lever or Ashby that you have not applied to. It never runs on LinkedIn, Indeed or Wellfound. It stops and tells you when an answer is not in your profile, a CAPTCHA appears, or the form fails — it never guesses. Keep this tab open while it runs.`),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', disabled: queue.running || !auto.enabled || !search ? '' : null, onclick: () => oneClickRun(state, { search, allJobs }) }, queue.running ? 'Running…' : `▶ Run — find jobs and ${auto.dryRun ? 'dry-run' : 'apply to'} up to ${auto.targetPerRun} companies`),
        h('button', { class: 'btn', disabled: queue.running || !auto.enabled || !ready.length ? '' : null, onclick: () => startQueue(ready, state) }, `${auto.dryRun ? 'Dry-run' : 'Apply to'} all ${ready.length} listed`),
        h('button', { class: 'btn', disabled: queue.running ? null : '', onclick: () => { queue.stop = true; notify() } }, '■ Stop'),
        queue.running ? h('span', { class: 'muted small' }, `${queue.index} of ${queue.total} · ${queue.message}`) : queue.message ? h('span', { class: 'muted small' }, queue.message) : null,
      ),
      !hasGemini && auto.aiFit ? h('div', { class: 'banner small' }, 'No Gemini key yet, so the AI fit check and AI answers are skipped and only the rule-based match decides. Add the key in ', h('a', { href: 'profile.html#ai' }, 'Profile → AI drafting'), '.') : null,
      !state.profile.myWords?.lookingFor ? h('div', { class: 'banner small' }, '“Why do you want to join …?” questions stop an application until you write ', h('a', { href: 'profile.html#mywords' }, 'What you are looking for'), ' in your profile, or answer them under Questions for you.') : null,
      lastRun ? h('p', { class: 'small' }, h('b', {}, `Last Run ${fmtDate(lastRun.at)}${lastRun.dryRun ? ' (dry run)' : ''}: `), `${lastRun.candidates} new candidate${lastRun.candidates === 1 ? '' : 's'} · ${lastRun.applied.length} ${lastRun.dryRun ? 'filled' : 'applied'} · ${lastRun.needsYou.length} need you · ${lastRun.failed.length} failed · ${lastRun.skippedFit.length} poor fit${lastRun.stoppedBy ? ` · stopped at the ${lastRun.stoppedBy}` : ''}${lastRun.error ? ` · error: ${lastRun.error}` : ''}`) : null,
      skipped.size ? h('details', {}, h('summary', { class: 'small muted' }, `Not eligible (${[...skipped.values()].reduce((a, b) => a + b, 0)} Strong/Good roles)`), h('ul', { class: 'list small' }, [...skipped].map(([why, n]) => h('li', {}, `${n} × ${why}`)))) : null,
    ),
    questionsCard(pending, rerender),
    historyCard(processed, rerender),
    ready.length ? h('div', { class: 'card stack' }, h('h3', {}, 'Ready to apply'), h('div', { class: 'stack' }, ready.slice(0, 40).map((j) => h('div', { class: 'spread' }, h('div', {}, h('b', {}, j.title), h('div', { class: 'muted small' }, `${j.company} · ${j.match.score}/100 · ${(j.locations ?? []).join(' · ') || 'Location not stated'}`)), h('button', { class: 'btn small', disabled: queue.running || !auto.enabled ? '' : null, onclick: () => startQueue([j], state) }, auto.dryRun ? 'Dry-run this' : 'Apply to this'))), ready.length > 40 ? h('p', { class: 'muted small' }, `Showing 40 of ${ready.length}.`) : null)) : null,
    h('div', { class: 'card stack' },
      h('h3', {}, 'Results'),
      log.length ? h('div', { style: 'overflow:auto' }, h('table', { class: 't' },
        h('thead', {}, h('tr', {}, ['When', 'Role', 'Result', 'Details'].map((c) => h('th', {}, c)))),
        h('tbody', {}, log.slice(0, 60).map((e) => h('tr', {},
          h('td', { class: 'small' }, `${fmtDate(e.at)} ${new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
          h('td', {}, h('b', {}, e.title ?? e.jobKey), h('div', { class: 'muted small' }, e.company ?? '')),
          h('td', {}, h('span', { class: `chip ${STATUS_CLASS[e.status] ?? ''}` }, `${STATUS_TEXT[e.status] ?? e.status}${e.dryRun ? ' (dry run)' : ''}`)),
          h('td', { class: 'small' }, e.reasons?.length ? h('ul', { class: 'list' }, e.reasons.map((r) => h('li', {}, r))) : e.reason ?? (e.notes?.length ? `${e.notes.length} answers set` : '')),
        ))))) : h('p', { class: 'muted' }, 'Nothing yet.'),
    ),
  ].filter(Boolean))
}

/** "Questions for you": what a form asked that your profile does not answer. Each answer is saved and reused. */
function questionsCard(pending, rerender) {
  const qs = Object.entries(pending ?? {})
  if (!qs.length) return null
  const save = async (key, value) => {
    if (!String(value ?? '').trim()) return toast('Type or pick an answer first.')
    const next = answerQuestion({ bank: await get('answerBank', {}), pending: await get('pendingQuestions', {}) }, key, value)
    await set('answerBank', next.bank)
    await set('pendingQuestions', next.pending)
    toast('Saved. The next Run retries the jobs that asked this.')
    rerender()
  }
  return h('div', { class: 'card stack' },
    h('h3', {}, `Questions for you (${qs.length})`),
    h('p', { class: 'muted small' }, 'Answer only what is true. Factual answers are reused on every company’s form; written answers are kept for that company only.'),
    qs.map(([key, q]) => {
      let value = ''
      const input = q.options?.length
        ? h('select', { onchange: (e) => (value = e.target.value) }, h('option', { value: '' }, 'Choose…'), q.options.map((o) => h('option', { value: o }, o)))
        : q.kind === 'written'
          ? h('textarea', { style: 'min-height:90px', placeholder: 'Your answer, in your own words', oninput: (e) => (value = e.target.value) })
          : h('input', { type: 'text', oninput: (e) => (value = e.target.value) })
      const asked = q.jobs?.length ?? 1
      return h('div', { class: 'stack' },
        h('div', {}, h('b', {}, q.label), h('div', { class: 'muted small' }, `${q.scope === 'company' ? `${q.company} only` : 'All companies'} · asked by ${asked} job${asked === 1 ? '' : 's'}${q.why ? ` · ${q.why}` : ''}`)),
        input,
        h('div', { class: 'row' },
          h('button', { class: 'btn small primary', onclick: () => save(key, value) }, 'Save answer'),
          h('button', { class: 'btn small', onclick: async () => { const p = await get('pendingQuestions', {}); delete p[key]; await set('pendingQuestions', p); rerender() } }, 'Dismiss'),
        ),
      )
    }),
  )
}

/** Every job a Run looked at and what happened. "Try again" forgets the record so a later Run may pick the job again. */
function historyCard(processed, rerender) {
  if (!processed.length) return null
  return h('div', { class: 'card stack' },
    h('h3', {}, `Job history (${processed.length})`),
    h('p', { class: 'muted small' }, 'Jobs marked Applied, Check the tab or Skipped: poor fit are not tried again, and no other job at a company you applied to is picked.'),
    h('div', { style: 'overflow:auto' }, h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ['When', 'Role', 'Status', 'Why', ''].map((c) => h('th', {}, c)))),
      h('tbody', {}, processed.slice(0, 100).map((r) => h('tr', {},
        h('td', { class: 'small' }, fmtDate(r.at)),
        h('td', {}, r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, h('b', {}, r.title)) : h('b', {}, r.title), h('div', { class: 'muted small' }, `${r.company}${r.attempts ? ` · ${r.attempts} attempt${r.attempts === 1 ? '' : 's'}` : ''}`)),
        h('td', {}, h('span', { class: `chip ${STATUS_CLASS[r.status] ?? ''}` }, `${STATUS_TEXT[r.status] ?? r.status}${r.dryRun ? ' (dry run)' : ''}`)),
        h('td', { class: 'small' }, (r.reasons ?? []).slice(0, 3).join('; ') || (r.questions?.length ? `${r.questions.length} question(s) for you` : '')),
        h('td', {}, r.status === 'applied' ? null : h('button', { class: 'btn small', onclick: async () => { const p = await get('processedJobs', {}); delete p[r.key]; await set('processedJobs', p); rerender() } }, 'Try again')),
      ))),
    )),
  )
}
