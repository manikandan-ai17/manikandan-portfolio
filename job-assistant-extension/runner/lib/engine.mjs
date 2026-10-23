// One job, end to end.
//   survey  — read-only report (may open dropdowns to read their options).
//   prepare — REVIEW-FIRST: fills everything it can from your real profile, asks you about the rest, picks the best
//             resume, highlights what is left, and leaves the page open. It never clicks Submit: you do.
//   apply   — like prepare but with no questions; with submit:true it also clicks Submit (unattended).
// Nothing is guessed: an answer comes from your profile, your approved/remembered answers, or you.

import fs from 'node:fs'
import path from 'node:path'
import { FM, AQ, OUT_DIR, ensureOut, portalOf, aiSettingsFromEnv } from './shared.mjs'
import { dismissBanners, revealForm, scan, waitForForm, readOptions, act, attachResume, findSubmit, waitForConfirmation } from './browser.mjs'
import { draftAnswer } from '../../extension/src/lib/answers.js'
import { templateCoverLetter, checkLetter } from '../../extension/src/lib/coverLetter.js'
import { scoreJob } from '../../extension/src/lib/match.js'
import { recall, remember } from './memory.mjs'
import { chooseResume } from './resume.mjs'

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const short = (s, n = 90) => clean(s).slice(0, n)
const NOT_ASKABLE = /Legal agreement|CAPTCHA|has no “Yes|Pick yourself|Could not find/i

async function wallKind(page) {
  return page.evaluate(() => {
    const t = (document.body.innerText ?? '').slice(0, 4000)
    if (document.querySelector('input[type=password]') || /\b(sign in|log in|create (an )?account|register to apply)\b/i.test(t)) return 'login_required'
    if (/page (could not be found|not found)|no longer (available|accepting)|position (has been )?(filled|closed)|job (is )?no longer/i.test(t)) return 'job_closed'
    return null
  }).catch(() => null)
}

/** What a stored/typed answer means for one control, or null when it does not fit the options. */
export function answerToAction(c, answer) {
  const a = String(answer)
  if (['select', 'radio', 'combobox', 'yesno'].includes(c.kind)) {
    const exact = c.options.find((o) => clean(o).toLowerCase() === clean(a).toLowerCase())
    const opt = exact ?? (/^(yes|no)$/i.test(a) ? AQ.yesNoOption(c.options, /^yes$/i.test(a)) : null)
    return opt ? { option: opt } : null
  }
  if (c.kind === 'checkbox') return { checked: /^(yes|true|y|ticked)$/i.test(a) }
  if (c.kind === 'text' || c.kind === 'textarea') return { value: a }
  return null
}

/** Decides what to do with every unanswered control. Reads dropdown options with real clicks. */
async function plan(page, s, job, data, { auto, coverLetter, memory, useAi, Anthropic }) {
  const ctx = { profile: data.profile, job, settings: auto, tracker: data.tracker }
  const actions = []
  const needs = []
  const left = []
  const need = (n) => needs.push({ askable: !NOT_ASKABLE.test(n.why ?? ''), ...n, text: `${short(n.label)} — ${n.why}` })

  for (const c of s.controls) {
    if (c.done || c.wq !== null) continue
    if (c.action === 'fill' && c.key) {
      const value = FM.valueFor(c.key, data.profile, { coverLetter })
      if (value) actions.push({ c, d: { value }, source: 'your profile' })
      else if (c.required) need({ c, label: c.label, kind: c.kind, options: [], why: 'Not in your profile' })
      continue
    }
    const options = c.kind === 'combobox' ? await readOptions(page, c) : c.options
    const cc = { ...c, options }
    const saved = recall(memory, c.label, job.company)
    const fromMemory = saved ? answerToAction(cc, saved.answer) : null
    if (fromMemory) { actions.push({ c: cc, d: fromMemory, source: 'your earlier answer' }); continue }
    const d = AQ.decide({ label: c.label, kind: c.kind === 'yesno' ? 'radio' : c.kind === 'checkgroup' ? 'checkbox' : c.kind, options, required: c.required }, ctx)
    if (d.action === 'leave') left.push(short(c.label))
    else if (d.action === 'needs_you') need({ c: cc, label: c.label, kind: c.kind, options, why: d.why })
    else if (c.kind === 'checkgroup') need({ c: cc, label: c.label, kind: c.kind, options, why: 'Pick yourself: several boxes can apply' })
    else actions.push({ c: cc, d, source: 'your profile rules' })
  }

  for (const w of s.written) {
    const saved = recall(memory, w.text, job.company)
    if (saved) { actions.push({ written: w, d: { value: saved.answer }, source: 'your earlier answer' }); continue }
    let draft = null
    try {
      draft = await draftAnswer(w.text, { profile: data.profile, job, match: job.match ?? null, settings: useAi ? aiSettingsFromEnv() : {}, preferAi: Boolean(useAi), Anthropic, maxLength: w.maxLength })
    } catch { /* no draft */ }
    const clear = draft?.text?.trim() && !(draft.issues ?? []).some((i) => i.blocking) && draft.kind !== 'sensitive' && !/\[[^\]]+\]/.test(draft.text)
    if (clear) actions.push({ written: w, d: { value: draft.text }, source: draft.source === 'ai' ? 'AI draft (check it)' : 'drafted from your profile and this posting' })
    else if (w.required || draft?.text) need({ written: w, label: w.text, kind: 'written', options: [], draft: draft?.text ?? '', why: draft?.note ?? 'Needs your own words' })
  }
  return { actions, needs, left }
}

const stats = (s, pl) => ({
  controls: s.controls.length,
  required: s.controls.filter((c) => c.required && !c.done).length + s.written.filter((w) => w.required).length,
  answerable: pl.actions.filter((a) => a.c?.required || a.written?.required).length,
  needs: pl.needs.length,
})

async function shot(page, name) {
  ensureOut()
  const dir = path.join(OUT_DIR, 'shots')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${name.replace(/[^a-z0-9._-]+/gi, '_')}.png`)
  await page.screenshot({ path: file, fullPage: true }).catch(() => {})
  return path.relative(OUT_DIR, file)
}

/** Green outline = filled for you; orange = still needs you. Makes the review quick. */
async function highlight(page, doneIdx, todoIdx) {
  await page.evaluate(({ doneIdx, todoIdx }) => {
    const paint = (i, color, title) => {
      const el = document.querySelector(`[data-ja="${i}"]`)
      const box = el?.closest('.select__control, fieldset') ?? el
      if (box) { box.style.outline = `2px solid ${color}`; box.style.outlineOffset = '2px'; box.title = title }
    }
    doneIdx.forEach((i) => paint(i, '#10b981', 'Filled by the assistant — check it'))
    todoIdx.forEach((i) => paint(i, '#f59e0b', 'Needs you'))
  }, { doneIdx, todoIdx }).catch(() => {})
}

const analysisOf = (m) => m ? ({ verdict: m.verdict, score: m.score, summary: m.summary, matched: (m.matched ?? []).map((x) => `${x.skill} (${x.level === 'professional' ? 'at work' : 'in a project'}: ${x.where})`), gaps: (m.gaps ?? []).map((g) => `${g.skill}${g.required ? '' : ' (nice to have)'}`), warnings: (m.warnings ?? []).map((w) => w.text ?? w), blockers: (m.blockers ?? []).map((b) => b.text ?? b) }) : null

/**
 * o: { mode: 'survey'|'prepare'|'apply', submit?, ask?, memory?, keepOpen?, useAi?, Anthropic? }
 * Returns the result; in prepare mode with keepOpen the page is left open and returned as res.page.
 */
export async function processJob(context, job, data, o = {}) {
  const t0 = Date.now()
  const auto = { ...(data.settings?.autoApply ?? {}) }
  const memory = o.memory ?? {}
  const res = { portal: portalOf(job.applyUrl), company: job.company, title: job.title, url: job.applyUrl, key: job.key, mode: o.mode, status: 'scanned', reasons: [], filled: [], answers: [], notes: [], ms: 0 }
  job.match ??= scoreJob(job, data.profile)
  res.analysis = analysisOf(job.match)
  const page = await context.newPage()
  let keep = false
  try {
    await page.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1500)
    await dismissBanners(page)
    let s = await waitForForm(page, 12000)
    if ((!s || s.error || !s.controls.some((c) => c.action === 'fill')) && (await revealForm(page))) s = await waitForForm(page, 15000)
    if (!s || s.error || !s.controls.some((c) => c.action === 'fill')) {
      res.status = (await wallKind(page)) ?? 'no_form'
      res.reasons.push(res.status === 'no_form' ? `No application form found on “${short(await page.title(), 60)}” (some sites need a click or sign-in first)` : res.status === 'login_required' ? 'Needs an account / sign-in' : 'The posting is closed')
      if (o.mode === 'prepare' && o.keepOpen) { keep = true; res.page = page }
      return res
    }
    res.captcha = s.captcha

    // The resume that fits this posting, and a cover letter only when the form has a box for one.
    const pick = chooseResume(data.resumes, job)
    res.resume = pick.resume ? { label: pick.resume.label, reason: pick.reason } : null
    let coverLetter = null
    if (o.mode !== 'survey' && auto.autoCoverLetter !== false) {
      const letter = templateCoverLetter(data.profile, job, job.match)
      if (!checkLetter(letter, data.profile).length) coverLetter = letter
    }

    const popts = { auto, coverLetter, memory, useAi: o.useAi, Anthropic: o.Anthropic }
    let pl = await plan(page, s, job, data, popts)
    res.stats = stats(s, pl)
    res.widgets = [...new Set(s.controls.map((c) => c.kind))]
    res.hasResumeField = s.files.some((f) => f.key === 'resume_file')

    if (o.mode === 'survey') {
      res.plan = pl.actions.map((a) => ({ q: short(a.c?.label ?? a.written?.text), kind: a.c?.kind ?? 'written', answer: short(a.d.option ?? a.d.value ?? (a.d.checked ? 'ticked' : ''), 50), source: a.source }))
      res.needs = pl.needs.map((n) => n.text)
      res.status = pl.needs.length ? 'needs_you' : 'would_apply'
      res.reasons = res.needs
      return res
    }

    // ── ask you about anything uncertain (prepare mode); apply mode never asks ──
    if (o.mode === 'prepare' && o.ask) {
      const still = []
      for (const n of pl.needs) {
        if (!n.askable) { still.push(n); continue }
        const got = await o.ask(n, { company: job.company })
        if (!got) { still.push(n); continue }
        remember(memory, n.label, job.company, got.answer, got.scope)
        const act1 = n.written ? { written: n.written, d: { value: got.answer }, source: 'you, just now' } : (() => { const d = answerToAction(n.c, got.answer); return d ? { c: n.c, d, source: 'you, just now' } : null })()
        if (act1) pl.actions.push(act1)
        else still.push({ ...n, why: `${n.why}; “${short(got.answer, 30)}” is not one of this form's options` })
      }
      pl.needs = still
    }

    if (o.mode === 'apply' && pl.needs.length) {
      res.status = 'needs_you'
      res.reasons = pl.needs.map((n) => n.text)
      res.screenshot = await shot(page, `${res.portal}-${job.company}-needs`)
      return res
    }

    // ── act with real input, then re-scan for questions that appeared as a result ──
    const doneIdx = new Set()
    for (let pass = 0; pass < 3; pass++) {
      for (const a of pl.actions) {
        const label = short(a.c?.label ?? a.written?.text)
        try {
          if (a.written) await page.locator(`[data-job-assist-q="${a.written.id}"]`).fill(a.d.value)
          else if (!(await act(page, a.c, a.d))) { pl.needs.push({ label, why: 'could not set the answer on this form', text: `${label} — could not set the answer on this form`, askable: false }); continue }
          if (a.c) doneIdx.add(a.c.i)
          res.filled.push(label)
          res.answers.push({ question: label, answer: short(a.d.option ?? a.d.value ?? (a.d.checked ? 'ticked' : ''), 400), source: a.source })
        } catch (err) {
          pl.needs.push({ label, why: short(err.message, 80), text: `${label} — ${short(err.message, 80)}`, askable: false })
        }
      }
      for (const f of s.files) {
        if (f.key !== 'resume_file') continue
        if (!pick.resume) pl.needs.push({ label: 'Resume', why: 'No resume in your export (Profile → Resumes)', text: 'Resume — none stored', askable: false })
        else await attachResume(page, f.i, pick.resume).then(() => res.answers.push({ question: 'Resume', answer: pick.resume.label, source: pick.reason })).catch((err) => pl.needs.push({ label: 'Resume', why: `upload failed: ${short(err.message, 60)}`, text: `Resume upload failed — attach it yourself`, askable: false }))
      }
      s = await scan(page)
      const fresh = s.controls.filter((c) => c.required && !c.done && c.wq === null && c.action !== 'fill')
      if (!fresh.length || pass === 2) break
      pl = { ...(await plan(page, s, job, data, popts)), needs: pl.needs }
      if (!pl.actions.length) break
    }
    const todo = s.controls.filter((c) => c.required && !c.done && c.wq === null)
    const writtenTodo = s.written.filter((w) => w.required)
    const remaining = [...new Set([...pl.needs.map((n) => n.text), ...todo.map((c) => `Still empty: ${short(c.label)}`)])]
    if (s.captcha?.challenge) remaining.push('A CAPTCHA challenge is showing — complete it yourself')
    await highlight(page, [...doneIdx], todo.map((c) => c.i))

    if (o.mode === 'prepare') {
      res.status = 'ready_for_review'
      res.reasons = remaining
      res.writtenLeft = writtenTodo.length
      res.screenshot = await shot(page, `${res.portal}-${job.company}-review`)
      if (o.keepOpen) { keep = true; res.page = page }
      return res
    }

    // apply
    if (remaining.length) {
      res.status = 'needs_you'
      res.reasons = remaining
      res.screenshot = await shot(page, `${res.portal}-${job.company}-needs`)
      return res
    }
    if (!o.submit) {
      res.status = 'dry_run'
      res.screenshot = await shot(page, `${res.portal}-${job.company}-filled`)
      return res
    }
    const submit = await findSubmit(page)
    if (!submit) {
      res.status = 'needs_you'
      res.reasons = ['Could not find an enabled Submit button']
      res.screenshot = await shot(page, `${res.portal}-${job.company}-nosubmit`)
      return res
    }
    await shot(page, `${res.portal}-${job.company}-before`)
    await submit.click()
    const c = await waitForConfirmation(page)
    res.screenshot = await shot(page, `${res.portal}-${job.company}-after`)
    if (c.confirmed) res.status = 'applied'
    else if (c.errors?.length) { res.status = 'failed'; res.reasons = [`The site reported a problem: ${c.errors.join(' | ')}`] }
    else { res.status = 'unconfirmed'; res.reasons = ['Clicked Submit but saw no confirmation — check the screenshot'] }
    return res
  } catch (err) {
    res.status = 'error'
    res.reasons = [short(err.message, 200)]
    res.screenshot = await shot(page, `${res.portal}-${job.company}-error`)
    return res
  } finally {
    res.ms = Date.now() - t0
    if (!keep) await page.close().catch(() => {})
  }
}

export function record(res) {
  ensureOut()
  const { page, ...plain } = res
  fs.appendFileSync(path.join(OUT_DIR, 'results.jsonl'), `${JSON.stringify({ ...plain, at: new Date().toISOString() })}\n`)
}

/** What you submitted, in the extension's tracker shape, so nothing is lost or invented. */
export function recordApplication(res) {
  ensureOut()
  const file = path.join(OUT_DIR, 'tracker.json')
  let t = {}
  try { t = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { /* first one */ }
  const now = new Date().toISOString()
  t[res.key ?? res.url] = {
    key: res.key ?? res.url, company: res.company, title: res.title, url: res.url, applyUrl: res.url, portal: res.portal,
    status: 'applied', appliedAt: now, via: 'runner (you pressed Submit)', score: res.analysis?.score ?? null, verdict: res.analysis?.verdict ?? null,
    resumeVersion: res.resume?.label ?? null, answers: res.answers.map((a) => ({ question: a.question, answer: a.answer, source: a.source })), history: [{ status: 'applied', at: now }], notes: '',
  }
  fs.writeFileSync(file, JSON.stringify(t, null, 1))
  return t[res.key ?? res.url]
}
