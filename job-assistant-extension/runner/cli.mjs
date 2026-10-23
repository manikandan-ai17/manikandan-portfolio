#!/usr/bin/env node
// Companion runner: drives a real browser with Playwright, using the extension's own rules.
//
//   node runner/cli.mjs survey   [--portals greenhouse,ashby,lever,workable,smartrecruiters,workday] [--per-portal 3] [--headed]
//   node runner/cli.mjs prepare  --data export.json [--limit 3] [--url <apply page> --company X --title Y] [--ai]
//   node runner/cli.mjs apply    --data export.json [--limit 3] [--min good|strong] [--live] [--headed] [--pause 30]
//   node runner/cli.mjs selftest
//
// survey   reads live postings and reports what the rules could answer. It fills and submits NOTHING.
// prepare  is the REVIEW-FIRST mode: it fills the form, asks you about anything uncertain, leaves the page open
//          and you press Submit yourself. It never clicks Submit.
// apply    is unattended: a dry run (fills, stops before Submit) unless you pass --live.

import fs from 'node:fs'
import path from 'node:path'
import { loadExport, demoData, loadAuto, OUT_DIR, ensureOut, aiSettingsFromEnv } from './lib/shared.mjs'
import { launch } from './lib/browser.mjs'
import { processJob, record, recordApplication } from './lib/engine.mjs'
import { terminalAsker } from './lib/ask.mjs'
import { loadMemory, saveMemory } from './lib/memory.mjs'
import { waitForConfirmation } from './lib/browser.mjs'
import { startFixtureServer, TINY_PDF_B64 } from './lib/fixture.mjs'
import { DEFAULT_SOURCES, fetchSource } from '../extension/src/lib/sources.js'
import { isRelevantTitle, isWorthDetail, scoreJob } from '../extension/src/lib/match.js'
import { eligibility, pauseFor, appliedToday } from '../extension/src/lib/autoapply.js'

const argv = process.argv.slice(2)
const cmd = argv[0]
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const v = argv[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0)

// ── survey ──────────────────────────────────────────────────────────────────

const EXTRA_SOURCES = [
  { company: 'Palantir', ats: 'lever', token: 'palantir' },
  { company: 'Spotify', ats: 'lever', token: 'spotify' },
]

async function pickJobs(portals, perPortal, profile) {
  const picks = []
  const all = [...DEFAULT_SOURCES.filter((s) => s.enabled !== false), ...EXTRA_SOURCES]
  for (const portal of portals) {
    const sources = all.filter((s) => s.ats === portal)
    const chosen = []
    for (const src of sources) {
      if (chosen.length >= perPortal) break
      try {
        const jobs = await fetchSource(src, { keepTitle: isWorthDetail, maxWorkdayDetails: 8 })
        const rel = jobs.filter((j) => isRelevantTitle(j.title) && j.applyUrl)
        for (const j of rel) j.match = scoreJob(j, profile)
        // Prefer roles a junior engineer could really apply to, then anything relevant.
        const pick = rel.find((j) => j.match.verdict !== 'blocked') ?? rel[0]
        if (pick) chosen.push(pick)
      } catch (err) {
        console.log(`  (could not read ${src.company}: ${String(err.message).slice(0, 60)})`)
      }
    }
    picks.push(...chosen)
  }
  return picks
}

function surveyReport(results, demo) {
  const byPortal = {}
  for (const r of results) (byPortal[r.portal] ??= []).push(r)
  const lines = ['# Portal survey', '', `Run ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · read-only: nothing was filled or submitted.`, demo ? 'Answers are judged against a **stand-in profile** (India, no sponsorship needed, open to relocate) so the rules have something to apply.' : '', '']
  lines.push('| Portal | Postings | Form found | Avg required questions | Auto-answerable | Would apply with no help | CAPTCHA | Sign-in wall |', '|---|---|---|---|---|---|---|---|')
  for (const [portal, rs] of Object.entries(byPortal)) {
    const withForm = rs.filter((r) => r.stats)
    const req = withForm.reduce((a, r) => a + r.stats.required, 0)
    const ans = withForm.reduce((a, r) => a + r.stats.answerable, 0)
    lines.push(`| ${portal} | ${rs.length} | ${withForm.length}/${rs.length} | ${withForm.length ? (req / withForm.length).toFixed(1) : '–'} | ${pct(ans, req)}% | ${withForm.filter((r) => r.status === 'would_apply').length}/${withForm.length} | ${rs.filter((r) => r.captcha?.present).length} | ${rs.filter((r) => r.status === 'login_required').length} |`)
  }
  lines.push('', '## Each posting', '')
  for (const r of results) {
    lines.push(`### ${r.portal} · ${r.company} · ${r.title}`, `${r.url}`, `Result: **${r.status}** (${(r.ms / 1000).toFixed(1)} s)${r.stats ? ` · ${r.stats.controls} controls, ${r.stats.required} required, ${r.stats.answerable} auto-answerable` : ''}${r.widgets ? ` · widgets: ${r.widgets.join(', ')}` : ''}${r.captcha?.present ? ' · CAPTCHA present' : ''}`)
    for (const n of (r.reasons ?? []).slice(0, 8)) lines.push(`- ${n}`)
    lines.push('')
  }
  const reasons = {}
  for (const r of results) for (const n of r.reasons ?? []) { const k = n.replace(/^.*? — /, '').slice(0, 70); reasons[k] = (reasons[k] ?? 0) + 1 }
  lines.push('## What stops auto-apply most often', '', ...Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `- ${n}× ${k}`))
  return lines.join('\n')
}

async function survey() {
  const portals = String(flag('portals', 'greenhouse,ashby,lever,workable,smartrecruiters,workday')).split(',')
  const per = Number(flag('per-portal', 3))
  const data = demoData()
  console.log(`Choosing live postings (${per} per portal)…`)
  const jobs = await pickJobs(portals, per, data.profile)
  console.log(`${jobs.length} postings. Opening each application page (read-only)…\n`)
  const { context, close } = await launch({ headed: Boolean(flag('headed')) })
  const results = []
  try {
    for (const job of jobs) {
      process.stdout.write(`  ${job.ats.padEnd(15)} ${job.company.slice(0, 22).padEnd(22)} ${job.title.slice(0, 40).padEnd(40)} `)
      const r = await processJob(context, job, data, { mode: 'survey' })
      results.push(r)
      record(r)
      console.log(`${r.status}${r.stats ? ` (${r.stats.answerable}/${r.stats.required} required answerable)` : ''}`)
    }
  } finally {
    await close()
  }
  ensureOut()
  const file = path.join(OUT_DIR, `survey-${new Date().toISOString().slice(0, 10)}.md`)
  fs.writeFileSync(file, surveyReport(results, data.demo))
  fs.writeFileSync(file.replace(/\.md$/, '.json'), JSON.stringify(results, null, 1))
  console.log(`\nReport: ${file}`)
}

// ── apply ───────────────────────────────────────────────────────────────────

async function apply() {
  const file = flag('data')
  if (!file || file === true) throw new Error('Pass --data path/to/export.json (extension → Profile → Export everything).')
  const data = loadExport(file)
  const auto = { ...loadAuto(data.settings), dryRun: !flag('live'), minVerdict: flag('min', loadAuto(data.settings).minVerdict) }
  data.settings = { ...data.settings, autoApply: auto }
  const log = []
  const limit = Number(flag('limit', 3))
  const queue = Object.values(data.jobs).filter((j) => eligibility(j, { profile: data.profile, auto, tracker: data.tracker, resumes: data.resumes, log }).ok).sort((a, b) => b.match.score - a.match.score).slice(0, limit)
  console.log(`${auto.dryRun ? 'DRY RUN (nothing is submitted)' : 'LIVE (will submit)'} · ${queue.length} eligible job(s) of ${Object.keys(data.jobs).length} saved · limit ${limit}`)
  if (!queue.length) return console.log('Nothing eligible. Run a search in the extension first, and check Profile answers (phone, city, visa, relocation) and a resume.')
  const { context, close } = await launch({ headed: Boolean(flag('headed')), userDataDir: flag('profile-dir') || null })
  try {
    for (const [n, job] of queue.entries()) {
      if (!auto.dryRun && appliedToday(log) >= auto.dailyCap) { console.log('Daily limit reached.'); break }
      process.stdout.write(`  ${job.company} — ${job.title.slice(0, 50)} … `)
      const r = await processJob(context, job, data, { mode: 'apply', submit: !auto.dryRun })
      record(r)
      if (r.status === 'applied') log.push({ status: 'applied', at: new Date().toISOString() })
      console.log(r.status + (r.reasons?.length ? `\n      ${r.reasons.slice(0, 5).join('\n      ')}` : ''))
      if (n < queue.length - 1) await sleep(pauseFor({ pauseSeconds: Number(flag('pause', auto.pauseSeconds)) }) * 1000)
    }
  } finally {
    await close()
  }
  console.log(`\nResults: ${path.join(OUT_DIR, 'results.jsonl')} · screenshots in ${path.join(OUT_DIR, 'shots')}`)
}


// ── prepare: fill, ask, then YOU review and submit ──────────────────────────

const analysisText = (a) => !a ? [] : [
  `    Match: ${a.verdict} (${a.score}/100) — ${a.summary ?? ''}`.trimEnd(),
  a.matched?.length ? `    Your profile shows: ${a.matched.slice(0, 6).join('; ')}` : null,
  a.gaps?.length ? `    Asked for, NOT in your profile: ${a.gaps.slice(0, 6).join(', ')}` : null,
  ...(a.warnings ?? []).slice(0, 4).map((w) => `    Check: ${w}`),
  ...(a.blockers ?? []).slice(0, 3).map((b) => `    BLOCKER: ${b}`),
].filter(Boolean)

async function prepare() {
  const file = flag('data')
  if (!file || file === true) throw new Error('Pass --data path/to/export.json (extension → Profile → Export everything).')
  const data = loadExport(file)
  const auto = { ...loadAuto(data.settings), dryRun: true }
  data.settings = { ...data.settings, autoApply: auto }
  let queue
  if (flag('url')) {
    // a job you found yourself: the company's own application page
    const url = String(flag('url'))
    queue = [{ key: `url:${url}`, ats: 'other', company: String(flag('company', 'the company')), title: String(flag('title', 'the role')), applyUrl: url, locations: String(flag('location', '')).split(';').filter(Boolean), description: flag('jd') ? fs.readFileSync(String(flag('jd')), 'utf8') : '' }]
  } else {
    const done = (() => { try { return JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'tracker.json'), 'utf8')) } catch { return {} } })()
    queue = Object.values(data.jobs).filter((j) => !done[j.key] && eligibility(j, { profile: data.profile, auto, tracker: data.tracker, resumes: data.resumes, log: [] }).ok).sort((a, b) => b.match.score - a.match.score).slice(0, Number(flag('limit', 3)))
  }
  if (!queue.length) return console.log('Nothing to prepare. Run a search in the extension first, or pass --url <application page> --company X --title Y.')
  console.log(`REVIEW-FIRST · ${queue.length} application(s). I fill and ask; YOU press Submit on the site. I never click Submit.\n`)
  const memory = loadMemory()
  const asker = terminalAsker()
  let Anthropic
  if (flag('ai')) {
    const ai = aiSettingsFromEnv()
    if (!ai.geminiKey && !ai.anthropicKey) throw new Error('--ai needs GEMINI_API_KEY (or ANTHROPIC_API_KEY) in runner/.env.local or the environment.')
    console.log(`AI drafts: ${ai.aiProvider === 'gemini' ? `Gemini (${ai.geminiModel})` : 'Claude'} — every draft is checked and shown to you before anything is sent.`)
    if (ai.aiProvider === 'anthropic') Anthropic = (await import('@anthropic-ai/sdk')).default ?? (await import('@anthropic-ai/sdk')).Anthropic
  }
  const { context, close } = await launch({ headed: true, userDataDir: flag('profile-dir') || null })
  try {
    for (const job of queue) {
      console.log(`\n━━ ${job.company} — ${job.title}\n    ${job.applyUrl}`)
      const r = await processJob(context, job, data, { mode: 'prepare', ask: (n, c) => asker.ask(n, c), memory, keepOpen: true, useAi: Boolean(flag('ai')), Anthropic })
      saveMemory(memory)
      record(r)
      for (const l of analysisText(r.analysis)) console.log(l)
      if (r.resume) console.log(`    Resume: ${r.resume.label} — ${r.resume.reason}`)
      if (!r.page) { console.log(`    ${r.status}: ${r.reasons.join('; ')}`); continue }
      if (r.answers.length) { console.log('\n    Filled:'); for (const a of r.answers.slice(0, 40)) console.log(`      • ${a.question.slice(0, 60)}  →  ${String(a.answer).replace(/\s+/g, ' ').slice(0, 70)}  [${a.source}]`) }
      if (r.reasons.length) { console.log('\n    STILL NEEDS YOU on the page (orange outlines):'); for (const x of r.reasons.slice(0, 15)) console.log(`      ! ${x}`) }
      await r.page.bringToFront().catch(() => {})
      console.log("\n    Review the page, finish anything orange, then press the site's own Submit.")
      const ac = new AbortController()
      const confirmed = waitForConfirmation(r.page, 45 * 60 * 1000).then((c) => (c.confirmed ? 'submitted' : 'timeout'))
      const typed = asker.line("    When done type 'skip' to move on or 'quit' to stop (it records automatically after you submit): ", ac.signal).then((t) => t ?? 'submitted')
      const outcome = await Promise.race([confirmed, typed])
      ac.abort()
      if (outcome === 'submitted') {
        recordApplication(r)
        console.log('    ✓ Recorded as applied (by you). Answers saved to runner/out/tracker.json')
      }
      await r.page.close().catch(() => {})
      if (/^quit$/i.test(String(outcome))) break
    }
  } finally {
    asker.close()
    await close()
  }
  console.log(`\nDone. Applications: ${path.join(OUT_DIR, 'tracker.json')} · your remembered answers: runner/answers.json`)
}

// ── selftest: the whole flow against a local fixture, in a real browser ─────

async function selftest() {
  const fx = await startFixtureServer()
  const base = demoData()
  const withResume = { ...base, resumes: [{ id: 'r', label: 'Main', fileName: 'resume.pdf', mime: 'application/pdf', dataB64: TINY_PDF_B64, isDefault: true }] }
  withResume.settings = { autoApply: { ...base.settings.autoApply, dryRun: false } }
  const job = { key: 'fix:1', ats: 'greenhouse', company: 'Fixture Co', title: 'AI Engineer', applyUrl: `${fx.url}/job/1`, locations: ['Bengaluru, India'], description: 'Python, LLM APIs, FastAPI' }
  const { context, close } = await launch({ headed: Boolean(flag('headed')) })
  let failed = 0
  const check = (name, ok, extra = '') => { console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${ok ? '' : `  ${extra}`}`); if (!ok) failed++ }
  try {
    // 1. dry run: fills, does not submit
    let r = await processJob(context, { ...job }, withResume, { mode: 'apply', submit: false })
    check('dry run fills the form and does not submit', r.status === 'dry_run' && fx.posts.length === 0, JSON.stringify(r.reasons))

    // 2. live: submits and sees the confirmation
    r = await processJob(context, { ...job }, withResume, { mode: 'apply', submit: true })
    const body = fx.posts.at(-1)?.body ?? ''
    check('live run submits and sees the confirmation', r.status === 'applied', `${r.status} ${JSON.stringify(r.reasons)}`)
    check('  facts were sent', /name="first_name"\r\n\r\nManikandan/.test(body) && /maniappu7777@gmail\.com/.test(body))
    check('  dropdown answers were sent (sponsorship: No, AI policy: Yes)', /name="q_sponsor"\r\n\r\nNo/.test(body) && /name="q_policy"\r\n\r\nYes/.test(body))
    check('  radio, diversity and consent answers were sent', /name="auth"\r\n\r\nyes/.test(body) && /name="gender"\r\n\r\nDecline to self-identify/.test(body) && /name="priv"/.test(body))
    check('  the resume file was uploaded', /filename="resume\.pdf"/.test(body) && /%PDF-1\.4/.test(body))

    // 3. a question the profile cannot answer → stops, sends nothing
    const before = fx.posts.length
    const unknown = { ...withResume, profile: { ...withResume.profile, eligibility: { ...withResume.profile.eligibility, needsSponsorshipElsewhere: null, authorizedCountries: [] } } }
    r = await processJob(context, { ...job, locations: ['San Francisco, CA'] }, unknown, { mode: 'apply', submit: true })
    check('stops without submitting when the profile cannot answer', r.status === 'needs_you' && fx.posts.length === before, `${r.status} posts=${fx.posts.length - before}`)

    // 4. survey mode is read-only
    r = await processJob(context, { ...job }, withResume, { mode: 'survey' })
    check('survey mode reports and sends nothing', ['would_apply', 'needs_you'].includes(r.status) && fx.posts.length === before && r.stats?.required > 0, `${r.status}`)

    // 5. REVIEW-FIRST: asks about what the profile cannot answer, fills the rest, leaves the page open, sends nothing
    const trackerFile = path.join(OUT_DIR, 'tracker.json')
    const backup = fs.existsSync(trackerFile) ? fs.readFileSync(trackerFile) : null
    fs.rmSync(trackerFile, { force: true })
    const unsure = { ...withResume, profile: { ...withResume.profile, eligibility: { ...withResume.profile.eligibility, needsSponsorshipElsewhere: null, authorizedCountries: [] } } }
    const mem = {}
    const asked = []
    const ask = async (n) => {
      asked.push(n.label)
      if (/sponsorship/i.test(n.label)) return { answer: 'No', scope: 'all' }
      if (/authorized to work/i.test(n.label)) return { answer: 'Yes', scope: 'all' }
      return null
    }
    const before2 = fx.posts.length
    r = await processJob(context, { ...job, locations: ['San Francisco, CA'] }, unsure, { mode: 'prepare', ask, memory: mem, keepOpen: true })
    check('review mode asks about what the profile cannot answer', asked.length === 2 && asked.some((a) => /sponsorship/i.test(a)) && asked.some((a) => /authorized/i.test(a)), JSON.stringify(asked))
    check('  your answers are remembered', Object.keys(mem).length === 2)
    check('  it fills the form, picks the resume, and leaves the page open for review', r.status === 'ready_for_review' && Boolean(r.page) && r.resume?.label === 'Main' && fx.posts.length === before2, `${r.status} ${JSON.stringify(r.reasons)}`)
    check('  every field is filled (nothing left for you here)', r.reasons.length === 0, JSON.stringify(r.reasons))
    const filledOk = await r.page.evaluate(() => document.getElementById('first_name').value === 'Manikandan' && document.querySelector('input[name=auth][value=yes]').checked && document.getElementById('val-q_sponsor').value === 'No')
    check('  what you typed went into the right fields', filledOk)
    check('  it never submitted by itself', fx.posts.length === before2)
    await r.page.getByRole('button', { name: /submit application/i }).click() // the user presses Submit
    const conf = await waitForConfirmation(r.page, 20000)
    check('  after YOU submit, the confirmation is detected', conf.confirmed && fx.posts.length === before2 + 1)
    const rec = recordApplication(r)
    check('  the application is recorded with the resume and the answers', rec.status === 'applied' && rec.resumeVersion === 'Main' && rec.answers.some((a) => /sponsorship/i.test(a.question) && a.answer === 'No'))
    await r.page.close()
    asked.length = 0
    r = await processJob(context, { ...job, locations: ['San Francisco, CA'] }, unsure, { mode: 'prepare', ask, memory: mem, keepOpen: true })
    check('  next time it uses your remembered answers and asks nothing', asked.length === 0 && r.status === 'ready_for_review', JSON.stringify(asked))
    await r.page.close()
    if (backup) fs.writeFileSync(trackerFile, backup)
    else fs.rmSync(trackerFile, { force: true })
  } finally {
    await close()
    await fx.close()
  }
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed')
  process.exitCode = failed ? 1 : 0
}

const commands = { survey, apply, prepare, selftest }
if (!commands[cmd]) {
  console.log('Usage: node runner/cli.mjs <survey|apply|selftest> [options]  (see runner/README.md)')
  process.exit(1)
}
commands[cmd]().catch((err) => { console.error(`\nError: ${err.message}`); process.exit(1) })
