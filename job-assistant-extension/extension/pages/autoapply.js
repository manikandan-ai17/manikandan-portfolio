// The dashboard's Auto-apply tab and the queue that drives it. The queue opens each job's official application
// page in a background tab; src/content/autorun.js fills and (unless dry-run) submits it, then reports back
// through storage. Keep this dashboard tab open while the queue runs.

import { h, toast, fmtDate } from './ui.js'
import { get, set, loadSettings, updateTracker, trackerRecord } from '../src/lib/store.js'
import { loadAuto, eligibility, appliedToday, pauseFor } from '../src/lib/autoapply.js'
import { templateCoverLetter, checkLetter } from '../src/lib/coverLetter.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const FINAL = new Set(['applied', 'needs_you', 'failed', 'dry_run', 'unconfirmed'])
const STATUS_TEXT = { applied: 'Applied', needs_you: 'Needs you', failed: 'Failed', dry_run: 'Dry run done', unconfirmed: 'Check the tab', queued: 'Queued', filling: 'Filling…', submitted: 'Submitting…' }
const STATUS_CLASS = { applied: 'strong', dry_run: 'good', needs_you: 'stretch', failed: 'blocked', unconfirmed: 'stretch' }

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

/** Runs the queue one job at a time. `jobs` are scored job objects that already passed eligibility(). */
export async function startQueue(jobs, state) {
  if (queue.running) return toast('Auto-apply is already running.')
  const settings = await loadSettings()
  const auto = loadAuto(settings)
  if (!auto.enabled) return toast('Turn on Auto-apply in Profile first.', 4000)
  queue.running = true
  queue.stop = false
  queue.total = jobs.length
  queue.index = 0
  notify()
  try {
    for (const job of jobs) {
      if (queue.stop) break
      queue.index++
      queue.current = job
      const log = await get('autoApplyLog', [])
      const tracker = await get('tracker', {})
      const resumes = await get('resumes', [])
      const elig = eligibility(job, { profile: state.profile, auto, tracker, resumes, log })
      if (!elig.ok) {
        queue.message = `Skipped ${job.title}: ${elig.reasons[0]}`
        notify()
        continue
      }
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
      await set('autoApplyRun', { active: true, stage: 'queued', jobKey: job.key, jobId: String(job.id ?? ''), applyUrl: job.applyUrl, company: job.company, title: job.title, dryRun: auto.dryRun, startedAt, job: { company: job.company, title: job.title, locations: job.locations ?? [], remote: job.remote ?? null } })
      queue.message = `${auto.dryRun ? 'Dry run: ' : ''}${job.title} at ${job.company}…`
      notify()
      const tab = await chrome.tabs.create({ url: job.applyUrl, active: false })
      const entry = await waitResult(job.key, startedAt)
      if (entry.status === 'needs_you' || entry.status === 'failed' || entry.status === 'unconfirmed') await noteNeeds(job, entry)
      // Finished tabs close; anything that needs a look stays open (and a dry run stays open so you can review it).
      if (['applied', 'failed'].includes(entry.status) && !auto.dryRun) chrome.tabs.remove(tab.id).catch(() => {})
      queue.message = `${job.title} at ${job.company}: ${STATUS_TEXT[entry.status] ?? entry.status}`
      notify()
      if (queue.stop || job === jobs.at(-1)) continue
      for (let s = pauseFor(auto); s > 0 && !queue.stop; s--) {
        queue.message = `Next application in ${s}s…`
        notify()
        await sleep(1000)
      }
    }
  } finally {
    queue.running = false
    queue.current = null
    queue.message = queue.stop ? 'Stopped.' : 'Queue finished.'
    notify()
  }
}

// ── The tab ────────────────────────────────────────────────────────────────

export async function renderAutoTab(root, state, allJobs) {
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

  root.replaceChildren(
    h('div', { class: 'card stack' },
      h('h2', {}, 'Auto-apply'),
      !auto.enabled
        ? h('div', { class: 'banner bad' }, h('b', {}, 'Auto-apply is OFF. '), 'Turn it on in ', h('a', { href: 'profile.html#autoapply' }, 'Profile → Auto-apply'), '.')
        : h('div', { class: auto.dryRun ? 'banner info' : 'banner' }, h('b', {}, auto.dryRun ? 'DRY RUN — it fills each form but does NOT submit. ' : 'LIVE — it will submit applications. '), auto.dryRun ? 'Check a few filled tabs, then switch dry run off in Profile.' : `Applied today: ${todayCount} of ${auto.dailyCap}.`),
      h('p', { class: 'muted small' }, `Ready: ${ready.length} Strong/Good match${ready.length === 1 ? '' : 'es'} on Greenhouse, Lever or Ashby that you have not applied to. It never runs on LinkedIn, Indeed or Wellfound. It stops and tells you when an answer is not in your profile, a CAPTCHA appears, or the form fails — it never guesses. Keep this tab open while it runs.`),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', disabled: queue.running || !auto.enabled || !ready.length ? '' : null, onclick: () => startQueue(ready, state) }, queue.running ? 'Running…' : `▶ ${auto.dryRun ? 'Dry-run' : 'Apply to'} ${ready.length} job${ready.length === 1 ? '' : 's'}`),
        h('button', { class: 'btn', disabled: queue.running ? null : '', onclick: () => { queue.stop = true; notify() } }, '■ Stop'),
        queue.running ? h('span', { class: 'muted small' }, `${queue.index} of ${queue.total} · ${queue.message}`) : queue.message ? h('span', { class: 'muted small' }, queue.message) : null,
      ),
      skipped.size ? h('details', {}, h('summary', { class: 'small muted' }, `Not eligible (${[...skipped.values()].reduce((a, b) => a + b, 0)} Strong/Good roles)`), h('ul', { class: 'list small' }, [...skipped].map(([why, n]) => h('li', {}, `${n} × ${why}`)))) : null,
    ),
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
  )
}
