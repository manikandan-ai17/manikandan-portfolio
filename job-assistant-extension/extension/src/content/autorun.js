// AUTO-apply engine. It only runs on a tab that the dashboard opened for a queued job (a matching `autoApplyRun`
// record in storage), and only when you turned auto-apply on. For that job it:
//   1. fills the form from your profile (autofill.js),
//   2. answers the other required questions from what your profile states (autoquestions.js),
//   3. refuses to go on if anything required is still unanswered, a CAPTCHA is showing, or an answer is unsafe,
//   4. in dry-run mode stops here; otherwise clicks the site's own Submit button and waits for its confirmation.
// Anything it is unsure about is reported as "needs you" — it never guesses and never submits then.

;(function () {
  const A = globalThis.__jobAssist
  const AQ = globalThis.JobAssistAuto
  if (!A || !AQ || window.__jobAssistAutoLoaded) return
  window.__jobAssistAutoLoaded = true
  if (/(^|\.)(linkedin\.com|indeed\.[a-z.]+|wellfound\.com|angel\.co|glassdoor\.[a-z.]+)$/.test(location.hostname)) return

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const clean = (s) => String(s ?? '').replace(/[_*]+/g, ' ').replace(/\s+/g, ' ').trim()
  const textOf = (n) => (n ? n.innerText ?? n.textContent ?? '' : '')
  const CONFIRM_RE = /thank you for (applying|your application|your interest in)|application (has been |was )?(successfully )?(submitted|received|sent)|we('ve| have) received your application|successfully submitted|your application (was|has been) (sent|submitted|received)/i
  const CONFIRM_URL = /\/(confirmation|thanks?|thank-you|submitted|success|complete)(\/|\?|$)/i

  let run = null
  const store = chrome.storage.local

  async function patchRun(p) {
    run = { ...run, ...p }
    await store.set({ autoApplyRun: run })
  }

  async function report(result) {
    const entry = { ...result, jobKey: run.jobKey, company: run.company, title: run.title, at: new Date().toISOString(), dryRun: Boolean(run.dryRun) }
    const { autoApplyLog = [] } = await store.get('autoApplyLog')
    await store.set({ autoApplyLog: [entry, ...autoApplyLog].slice(0, 300) })
    await patchRun({ active: false, stage: result.status })
    try { chrome.runtime.sendMessage({ type: 'autoApplyResult', jobKey: run.jobKey, result: entry }) } catch { /* the dashboard may be closed; the log has it */ }
    return entry
  }

  // ── Reading the controls ───────────────────────────────────────────────────

  const optionLabel = (el) => {
    if (el.id) {
      const l = [...document.getElementsByTagName('label')].find((x) => x.htmlFor === el.id)
      if (l) return clean(textOf(l))
    }
    const wrap = el.closest('label')
    if (wrap) return clean(textOf(wrap))
    return clean(el.getAttribute('aria-label') || el.value || textOf(el.parentElement))
  }

  function groupLabel(el, optionTexts = []) {
    const fs = el.closest('fieldset')
    const lg = fs?.querySelector('legend')
    if (lg && clean(textOf(lg))) return clean(textOf(lg))
    const rg = el.closest('[role=radiogroup],[role=group]')
    if (rg) {
      const by = rg.getAttribute('aria-labelledby')
      const t = by ? by.split(/\s+/).map((id) => textOf(document.getElementById(id))).join(' ') : rg.getAttribute('aria-label')
      if (clean(t)) return clean(t)
    }
    const skip = new Set(optionTexts.map((t) => t.toLowerCase()))
    let p = el.parentElement
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      const cand = [...p.querySelectorAll('label, legend, [class*="label" i], h3, h4')].find((c) => {
        const t = clean(textOf(c))
        return t.length >= 6 && !c.contains(el) && !skip.has(t.toLowerCase()) && !c.querySelector('input')
      })
      if (cand) return clean(textOf(cand))
    }
    return ''
  }

  const isCombobox = (el) => el.getAttribute('role') === 'combobox' || /select__input|typeahead|autocomplete/i.test(el.className) || el.getAttribute('aria-autocomplete') === 'list' || /start typing/i.test(el.placeholder ?? '')
  const isRequired = (el, label) => el.required || el.getAttribute('aria-required') === 'true' || /\*/.test(label ?? '')

  /** Every question on the page as one control (a radio group is one control). */
  function collect() {
    const out = []
    const radioDone = new Set()
    for (const f of A.fields()) {
      const el = f.el
      if (el.type === 'file') continue
      if (el.type === 'radio') {
        const key = el.name || el.closest('fieldset')?.id || el.id
        if (radioDone.has(key)) continue
        radioDone.add(key)
        const radios = [...document.querySelectorAll('input[type=radio]')].filter((r) => (el.name ? r.name === el.name : r === el))
        const options = radios.map(optionLabel)
        const label = groupLabel(el, options)
        out.push({ kind: 'radio', el, els: radios, label, options, required: radios.some((r) => r.required) || /\*/.test(label), done: radios.some((r) => r.checked), f })
      } else if (el.type === 'checkbox') {
        const same = el.name ? [...document.querySelectorAll('input[type=checkbox]')].filter((c) => c.name === el.name) : [el]
        const own = optionLabel(el)
        if (same.length > 1) {
          if (radioDone.has(`cb:${el.name}`)) continue
          radioDone.add(`cb:${el.name}`)
          out.push({ kind: 'checkgroup', el, label: groupLabel(el, same.map(optionLabel)), options: same.map(optionLabel), required: same.some((c) => c.required), done: same.some((c) => c.checked), f })
        } else {
          const label = [own, groupLabel(el, [own])].filter(Boolean).join(' ')
          out.push({ kind: 'checkbox', el, label, options: [], required: isRequired(el, label), done: el.checked, f })
        }
      } else if (el.tagName === 'SELECT') {
        const options = [...el.options].map((o) => clean(o.text)).filter((t) => t && !/^(select|choose|please|--|—)/i.test(t))
        out.push({ kind: 'select', el, label: f.desc, options, required: f.required, done: Boolean(el.value) && !/^(select|choose|please|--|—)/i.test(clean(el.selectedOptions[0]?.text ?? '')), f })
      } else if (isCombobox(el)) {
        out.push({ kind: 'combobox', el, label: f.desc, options: [], required: f.required, done: Boolean(el.value) || Boolean(el.closest('div')?.parentElement?.querySelector('[class*="singleValue" i], [class*="single-value" i]')), f })
      } else {
        out.push({ kind: el.tagName === 'TEXTAREA' ? 'textarea' : 'text', el, label: f.desc, options: [], required: f.required, done: Boolean(el.value?.trim()), f })
      }
    }
    // Ashby renders Yes/No questions as a pair of buttons, not inputs.
    for (const grp of document.querySelectorAll('[class*="yesno" i]')) {
      const btns = [...grp.querySelectorAll('button')].filter((b) => /^(yes|no)$/i.test(clean(textOf(b))))
      if (btns.length !== 2 || !isShown(grp)) continue
      let label = ''
      for (let p = grp.parentElement, i = 0; i < 4 && p && !label; i++, p = p.parentElement) {
        const l = [...p.querySelectorAll('label, legend')].find((x) => !grp.contains(x) && clean(textOf(x)).length >= 6)
        if (l) label = clean(textOf(l))
      }
      const entry = grp.closest('[class*="fieldEntry" i], [class*="field" i]') ?? grp.parentElement
      const required = /\*/.test(label) || Boolean(entry?.querySelector('[class*="required" i]')) || btns.some((b) => b.getAttribute('aria-required') === 'true')
      const picked = btns.some((b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true' || /(^|[\s_-])(active|selected|checked)([\s_-]|$)/i.test(b.className))
      out.push({ kind: 'yesno', el: btns[0], els: btns, label, options: ['Yes', 'No'], required, done: picked, f: { verdict: { action: 'unknown' }, desc: label, required } })
    }
    return out
  }

  // ── Setting values ─────────────────────────────────────────────────────────

  const fire = (el, type, init = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, ...init }))

  const isShown = (o) => {
    const r = o.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  /** The options of one dropdown. react-select numbers them `${inputId}-option-N`; other widgets use role=option. */
  function optionsOf(el) {
    const own = el.id ? [...document.querySelectorAll(`[id*="${CSS.escape(el.id)}-option-"]`)] : []
    return (own.length ? own : [...document.querySelectorAll('[role=option], [class*="select__option" i]')]).filter(isShown)
  }

  // Dropdown widgets ignore a lone synthetic click: they need the whole pointer sequence, in order.
  const SEQUENCE = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']
  function press(target) {
    for (const type of SEQUENCE) {
      const Ev = type.startsWith('pointer') ? PointerEvent : MouseEvent
      target.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true, view: window, button: 0, buttons: type.endsWith('down') ? 1 : 0, isPrimary: true }))
    }
  }

  async function openCombobox(el) {
    const control = el.closest('.select__control, [class*="-control"]') ?? el
    el.focus()
    press(control)
    for (let i = 0; i < 10; i++) {
      await sleep(150)
      if (optionsOf(el).length) break
    }
    return optionsOf(el)
  }

  function closeCombobox(el) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
    el.blur()
  }

  /** Opens a dropdown only to read its options (nothing is selected), then closes it again. */
  async function readComboOptions(el) {
    const texts = (await openCombobox(el)).map((o) => clean(textOf(o)))
    closeCombobox(el)
    await sleep(150)
    return texts
  }

  async function chooseInCombobox(el, { value, option }) {
    if (value) {
      el.focus()
      A.setValue(el, value)
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
    } else {
      await openCombobox(el)
    }
    let opts = []
    for (let i = 0; i < 12; i++) {
      await sleep(200)
      opts = optionsOf(el)
      if (opts.length) break
    }
    if (!opts.length) opts = await openCombobox(el)
    const want = (option ?? value ?? '').toLowerCase()
    const hit = opts.find((o) => clean(textOf(o)).toLowerCase() === want) ?? opts.find((o) => clean(textOf(o)).toLowerCase().includes(want)) ?? (option ? null : opts[0])
    if (!hit) {
      closeCombobox(el)
      return false
    }
    press(hit)
    await sleep(250)
    return true
  }

  async function apply(control, d) {
    const { el, kind } = control
    if (kind === 'text' || kind === 'textarea') {
      A.setValue(el, d.value)
      return true
    }
    if (kind === 'select') {
      const o = [...el.options].find((x) => clean(x.text) === d.option) ?? [...el.options].find((x) => clean(x.text).toLowerCase().includes(String(d.option).toLowerCase()))
      if (!o) return false
      el.value = o.value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    if (kind === 'yesno') {
      const b = control.els.find((x) => clean(textOf(x)).toLowerCase() === String(d.option).toLowerCase())
      if (!b) return false
      b.click()
      await sleep(150)
      return true
    }
    if (kind === 'radio') {
      const i = control.options.findIndex((t) => t === d.option)
      if (i < 0) return false
      control.els[i].click()
      return control.els[i].checked
    }
    if (kind === 'checkbox') {
      if (el.checked !== d.checked) el.click()
      return el.checked === d.checked
    }
    if (kind === 'combobox') return chooseInCombobox(el, { value: d.value, option: d.option })
    return false
  }

  // ── The form ───────────────────────────────────────────────────────────────

  async function waitForForm(ms = 40000) {
    const end = Date.now() + ms
    while (Date.now() < end) {
      if (A.fields().filter((f) => f.verdict.action === 'fill').length >= 2) return true
      await sleep(500)
    }
    return false
  }

  function findSubmit() {
    const GOOD = /^(submit( my)?( application)?|send( my)?( application)?|apply( now)?|submit)$/i
    const BAD = /autofill|save|cancel|back|upload|attach|add |remove|clear|share|linkedin|google|apple/i
    const cands = [...document.querySelectorAll('button, input[type=submit], [role=button]')].filter((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const labelOf = (b) => clean(b.tagName === 'INPUT' ? b.value : textOf(b))
    const scored = cands
      .map((b) => ({ b, t: labelOf(b), score: (GOOD.test(labelOf(b)) ? 3 : /submit/i.test(labelOf(b)) ? 2 : 0) + (b.type === 'submit' ? 1 : 0) }))
      .filter((x) => x.score > 0 && !BAD.test(x.t))
      .sort((a, b) => b.score - a.score)
    return scored[0]?.b ?? null
  }

  const visibleErrors = () => {
    const nodes = [...document.querySelectorAll('[aria-invalid="true"], [role=alert], .error, .errors, .field-error, .validation-error, [class*="error" i]')]
    return [...new Set(nodes.filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).map((n) => clean(textOf(n)) || clean(n.getAttribute('aria-label') ?? n.name ?? '')).filter(Boolean))].slice(0, 6)
  }

  const confirmed = () => CONFIRM_URL.test(location.pathname) || CONFIRM_RE.test(textOf(document.body).slice(0, 20000))

  // ── Phase 1: fill and decide ───────────────────────────────────────────────

  async function fillPhase() {
    await patchRun({ stage: 'filling' })
    if (!(await waitForForm())) return report({ status: 'failed', reason: 'No application form appeared on the page.' })

    const { profile, pending, tracker } = await A.context()
    if (!profile) return report({ status: 'failed', reason: 'The assistant has no profile yet. Open Profile once.' })
    const settings = (await store.get('settings')).settings ?? {}
    const auto = { ...(settings.autoApply ?? {}) }
    const job = run.job ?? { company: run.company, title: run.title, locations: [], remote: null }
    const needs = []
    const notes = []

    const filled = await A.fill()
    if (filled.error) return report({ status: 'failed', reason: filled.error })
    for (const m of filled.missing) needs.push(`Not in your profile: ${m}`)

    // Questions the profile can answer (visa, relocation, consent, demographics …)
    const handled = new Set()
    const written = new Set(A.writtenQuestions().map((q) => q.el))
    for (const c of collect()) {
      if (c.done || written.has(c.el) || c.f.verdict.action === 'fill') continue
      let options = c.options
      if (c.kind === 'combobox') options = await readComboOptions(c.el)
      const d = AQ.decide({ label: c.label, kind: c.kind === 'checkgroup' ? 'checkbox' : c.kind === 'yesno' ? 'radio' : c.kind, options, required: c.required }, { profile, job, settings: auto, tracker })
      if (c.kind === 'checkgroup' && d.action === 'set') { needs.push(`Pick yourself: ${c.label}`); continue }
      if (d.action === 'leave') continue
      if (d.action === 'needs_you') { needs.push(`${clean(c.label).slice(0, 90)} — ${d.why}`); continue }
      if (await apply(c, d)) {
        handled.add(c.el)
        notes.push(`${clean(c.label).slice(0, 70)} → ${d.option ?? d.value ?? (d.checked ? 'ticked' : 'unticked')}`)
      } else needs.push(`${clean(c.label).slice(0, 90)} — could not set the answer on this form`)
    }

    // Written questions: only answers that came from your profile, your approved answers, or (if allowed) a checked AI draft.
    const qs = A.writtenQuestions()
    if (qs.length) {
      try {
        const drafts = await A.draftWritten(qs, { preferAi: Boolean(auto.allowAi) })
        for (const q of qs) {
          const d = drafts.find((x) => x.id === q.id)
          const required = isRequired(q.el, q.text)
          const blocking = (d?.issues ?? []).some((i) => i.blocking)
          const okSource = d && (['template', 'dashboard', 'profile'].includes(d.source) || (d.source === 'ai' && auto.allowAi && !(d.issues ?? []).length))
          if (d?.text?.trim() && okSource && !blocking && d.kind !== 'sensitive') {
            A.setValue(q.el, d.text)
            A.inserted.set(q.text, d.text)
            handled.add(q.el)
            notes.push(`${clean(q.text).slice(0, 70)} → written answer (${d.source})`)
          } else if (required) needs.push(`${clean(q.text).slice(0, 90)} — ${d?.note ?? 'needs your own answer'}`)
        }
      } catch (err) {
        for (const q of qs) if (isRequired(q.el, q.text)) needs.push(`${clean(q.text).slice(0, 90)} — drafting failed: ${err.message}`)
      }
    }

    // Anything required that is still empty
    for (const c of collect()) {
      if (c.required && !c.done && !handled.has(c.el) && !(c.kind === 'combobox' && handled.has(c.el))) {
        if (c.el.type === 'file') continue
        needs.push(`Still empty: ${clean(c.label).slice(0, 90)}`)
      }
    }
    // A required resume upload that did not take
    if (filled.needsManualResume) needs.push('The resume did not attach — attach it yourself')
    if (!filled.resume) needs.push('No resume stored (Profile → Resumes)')

    const unique = [...new Set(needs)]
    const cap = A.captcha()
    if (cap.challenge) unique.push('A CAPTCHA challenge is showing — complete it yourself')
    if (unique.length) return report({ status: 'needs_you', reasons: unique.slice(0, 12), filled: filled.filled, notes })

    if (run.dryRun) return report({ status: 'dry_run', filled: filled.filled, notes })

    const submit = findSubmit()
    if (!submit || submit.disabled || submit.getAttribute('aria-disabled') === 'true') return report({ status: 'needs_you', reasons: ['Could not find an enabled Submit button'], filled: filled.filled, notes })
    const answers = [...A.inserted].map(([question, answer]) => ({ question, answer }))
    await patchRun({ stage: 'submitted', submitClickedAt: Date.now(), answers, filledNotes: notes })
    submit.click()
    await confirmPhase()
  }

  // ── Phase 2: after clicking Submit (this page, or the page it navigated to) ─

  async function recordApplied() {
    for (const a of run.answers ?? []) A.inserted.set(a.question, a.answer)
    const rec = await A.markApplied()
    const { tracker = {} } = await store.get('tracker')
    const t = tracker[rec.key]
    if (t) {
      t.history = t.history.map((h, i) => (i === t.history.length - 1 && h.status === 'applied' ? { ...h, via: 'auto-apply' } : h))
      await store.set({ tracker: { ...tracker, [rec.key]: t } })
    }
    return rec
  }

  async function confirmPhase() {
    const end = (run.submitClickedAt ?? Date.now()) + 50000
    while (Date.now() < end) {
      if (confirmed()) {
        await recordApplied()
        return report({ status: 'applied', notes: run.filledNotes ?? [] })
      }
      if (A.captcha().challenge) return report({ status: 'needs_you', reasons: ['A CAPTCHA challenge appeared after Submit — complete it in the tab'] })
      const errs = visibleErrors()
      if (errs.length && Date.now() - (run.submitClickedAt ?? 0) > 6000) return report({ status: 'failed', reason: `The site reported a problem: ${errs.join(' | ')}` })
      await sleep(700)
    }
    return report({ status: 'unconfirmed', reason: 'Submit was clicked but no confirmation appeared — check the tab before trying again.' })
  }

  // ── Entry ──────────────────────────────────────────────────────────────────

  async function main() {
    if (window !== window.top) return
    run = (await store.get('autoApplyRun')).autoApplyRun
    if (!run?.active) return
    const sameJob = run.jobId ? location.href.includes(run.jobId) : run.applyUrl && location.href.startsWith(run.applyUrl)
    const sameSite = run.applyUrl && new URL(run.applyUrl).hostname === location.hostname
    if (run.stage === 'submitted') {
      if (!sameSite) return
      return confirmPhase()
    }
    if (run.stage !== 'queued' || !sameJob) return
    try {
      await fillPhase()
    } catch (err) {
      await report({ status: 'failed', reason: `Unexpected error: ${err?.message ?? err}` })
    }
  }

  globalThis.__jobAssistAuto = { collect, apply, readComboOptions, findSubmit, confirmed, visibleErrors, fillPhase, confirmPhase, main, getRun: () => run, setRun: (r) => { run = r } }
  main()
})()
