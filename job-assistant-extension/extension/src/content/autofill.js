// Runs on Greenhouse, Lever and Ashby job pages. When the page has an application form it shows a small panel:
//   "Fill from my profile" — fills plain facts only, highlights everything else; it NEVER submits.
//   "I submitted it"       — after YOU press the site's own Submit button, records the application.
// Nothing is sent anywhere by this script; it reads and writes chrome.storage.local only.

;(function () {
  if (window.__jobAssistLoaded) return
  window.__jobAssistLoaded = true
  // LinkedIn, Indeed and Wellfound forbid automation in their terms (and can restrict accounts): never run there.
  if (/(^|\.)(linkedin\.com|indeed\.[a-z.]+|wellfound\.com|angel\.co|glassdoor\.[a-z.]+)$/.test(location.hostname)) return
  const FM = globalThis.JobAssistFieldMap

  const portalOf = (url) => {
    const host = new URL(url).hostname
    const known = [[/greenhouse\.io$/, 'Greenhouse'], [/lever\.co$/, 'Lever'], [/ashbyhq\.com$/, 'Ashby'], [/myworkdayjobs\.com$/, 'Workday'], [/workable\.com$/, 'Workable'], [/smartrecruiters\.com$/, 'SmartRecruiters']]
    return known.find(([re]) => re.test(host))?.[1] ?? `Company site (${host.replace(/^www\./, '')})`
  }
  const COLORS = { filled: '#10b981', sensitive: '#f59e0b', todo: '#3b82f6' }

  // ── Reading the form ───────────────────────────────────────────────────────

  const visible = (el) => {
    if (el.type === 'file') return true // file inputs are usually hidden behind an "Attach" button
    const r = el.getBoundingClientRect()
    const st = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'
  }

  const textOf = (n) => (n ? n.innerText ?? n.textContent ?? '' : '')

  function describe(el) {
    const parts = []
    if (el.id) {
      const lab = [...document.getElementsByTagName('label')].find((l) => l.htmlFor === el.id)
      if (lab) parts.push(textOf(lab))
    }
    if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label'))
    const lb = el.getAttribute('aria-labelledby')
    if (lb) for (const id of lb.split(/\s+/)) parts.push(textOf(document.getElementById(id)))
    if (!parts.join('').trim()) {
      // The nearest wrapper with its own label/legend that holds only a few controls.
      let p = el.parentElement
      for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
        const label = p.querySelector('label, legend')
        if (label && p.querySelectorAll('input:not([type=hidden]), textarea, select').length <= 3 && textOf(label).trim()) {
          parts.push(textOf(label))
          break
        }
      }
    }
    if (!parts.join('').trim()) parts.push(el.placeholder || el.name || el.id || '')
    // A label and an aria-label often say the same thing: keep each wording once.
    const d = [...new Set(parts.map(FM.clean).filter(Boolean))].join(' ')
    // Context for file inputs: Ashby's "Autofill from resume" box must not be mistaken for the resume field.
    if (el.type === 'file') return FM.clean(`${d} ${el.id} ${el.name} ${textOf(el.closest('div')).slice(0, 80)}`)
    return d
  }

  function fields() {
    return [...document.querySelectorAll('input, textarea, select')]
      .filter((el) => !['hidden', 'submit', 'button', 'image', 'reset', 'search'].includes(el.type) && !el.disabled && !el.readOnly && visible(el))
      .filter((el) => !/recaptcha|hcaptcha|cf-turnstile/i.test(`${el.id} ${el.name}`))
      // Hidden helper inputs of dropdown widgets (no id/name, not focusable) are not questions of their own.
      .filter((el) => !(el.type === 'text' && !el.id && !el.name && (el.tabIndex < 0 || /requiredInput/i.test(el.className) || el.getAttribute('aria-hidden') === 'true')))
      .map((el) => {
        const combobox = el.getAttribute('role') === 'combobox' || /select__input|typeahead|autocomplete/i.test(el.className) || el.getAttribute('aria-autocomplete') === 'list' || /start typing|pick date/i.test(el.placeholder ?? '')
        const desc = describe(el)
        const required = el.required || el.getAttribute('aria-required') === 'true' || /\*/.test(desc)
        return { el, desc, required, verdict: FM.classify(desc, { tag: el.tagName, type: el.type, combobox }) }
      })
  }

  const hasForm = () => fields().filter((f) => f.verdict.action === 'fill').length >= 2

  function captcha() {
    const challenge = [...document.querySelectorAll('iframe[src*="recaptcha/api2/bframe"], iframe[src*="recaptcha/api2/anchor"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare"]')].some((f) => {
      const r = f.getBoundingClientRect()
      return r.width > 30 && r.height > 30
    })
    const invisible = !!document.querySelector('.g-recaptcha, [data-sitekey], textarea[name="g-recaptcha-response"], script[src*="recaptcha"], script[src*="hcaptcha"], script[src*="turnstile"]')
    return { challenge, present: challenge || invisible }
  }

  // ── Filling ────────────────────────────────────────────────────────────────

  function setValue(el, value) {
    // React/Vue keep their own copy of the value: use the native setter, then fire the events they listen to.
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('blur', { bubbles: true }))
  }

  const resumeFile = (resume) => new File([Uint8Array.from(atob(resume.dataB64), (c) => c.charCodeAt(0))], resume.fileName || 'resume.pdf', { type: resume.mime || 'application/pdf' })

  /**
   * Puts the resume in the site's upload field, then checks that the SITE took it: its uploader either
   * replaces the field with the attached file (Greenhouse) or shows the file name. Like attaching it
   * yourself, the site uploads the file to its own storage at this point — before anything is submitted.
   */
  async function attachFile(el, resume) {
    const dt = new DataTransfer()
    dt.items.add(resumeFile(resume))
    el.files = dt.files
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    const name = (resume.fileName || '').toLowerCase()
    for (let i = 0; i < 27; i++) {
      await new Promise((r) => setTimeout(r, 300))
      if (!el.isConnected || (name && textOf(document.body).toLowerCase().includes(name))) return true
    }
    return false // not confirmed: the field is left as it is for you to check (an upload may still be running)
  }

  function saveResume(resume) {
    const url = URL.createObjectURL(resumeFile(resume))
    const a = document.createElement('a')
    a.href = url
    a.download = resume.fileName || 'resume.pdf'
    document.documentElement.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const mark = (el, color, title) => {
    el.dataset.jobAssistOutline = el.style.outline
    el.style.outline = `2px solid ${color}`
    el.style.outlineOffset = '2px'
    if (title) el.title = title
  }
  const unmarkAll = () => {
    for (const el of document.querySelectorAll('[data-job-assist-outline]')) {
      el.style.outline = el.dataset.jobAssistOutline
      delete el.dataset.jobAssistOutline
    }
  }

  async function context() {
    const { profile, resumes = [], pendingApply = {}, tracker = {} } = await chrome.storage.local.get(['profile', 'resumes', 'pendingApply', 'tracker'])
    const here = location.href
    // The job this page belongs to: the one you opened from the dashboard (matched by its id in the URL).
    const pending = Object.values(pendingApply).find((p) => p.jobId && here.includes(p.jobId)) ?? null
    const resume = resumes.find((r) => r.id === pending?.resumeId) ?? resumes.find((r) => r.isDefault) ?? resumes[0] ?? null
    return { profile, resume, pending, tracker }
  }

  async function fill() {
    const { profile, resume, pending } = await context()
    if (!profile) return { error: 'Open the assistant’s Profile page once first, so it has your details.' }
    unmarkAll()
    const report = { filled: [], left: [], sensitive: [], missing: [] }
    for (const f of fields()) {
      const { action, key, note } = f.verdict
      if (action === 'fill' && key === 'resume_file') {
        if (!resume) {
          report.missing.push('Resume (add one in Profile → Resumes)')
          mark(f.el.closest('div') ?? f.el, COLORS.todo)
        } else if (f.el.files?.length) report.left.push('Resume (a file is already attached)')
        else if (await attachFile(f.el, resume)) report.filled.push(`Resume: ${resume.label} (the site uploads it now, as when you attach it yourself)`)
        else {
          report.left.push(`Resume — could not confirm the site took “${resume.fileName}”. Check the resume field; if it is empty, use its Attach button (“Save resume file” below saves the file)`)
          mark(f.el.closest('div') ?? f.el, COLORS.todo, 'Attach your resume here')
          report.needsManualResume = true
        }
        continue
      }
      if (action === 'fill') {
        const value = FM.valueFor(key, profile, { coverLetter: pending?.coverLetter })
        if (value === null) {
          report.missing.push(f.desc || key)
          mark(f.el, COLORS.todo, 'Your profile does not have this yet')
        } else if (f.el.value && f.el.value.trim() !== '') {
          report.left.push(`${f.desc} (already filled — left as it is)`)
        } else {
          setValue(f.el, value)
          mark(f.el, COLORS.filled, 'Filled by Job Assistant — check it')
          report.filled.push(f.desc)
        }
      } else if (action === 'sensitive') {
        report.sensitive.push(f.desc)
        mark(f.el, COLORS.sensitive, 'Answer this yourself')
      } else if (f.required || action === 'skip') {
        report.left.push(`${f.desc}${note ? ` — ${note}` : ''}`)
        mark(f.el, COLORS.todo, note ?? 'Fill this yourself')
      }
    }
    const uniq = (xs) => [...new Set(xs.filter(Boolean))]
    return { filled: uniq(report.filled), left: uniq(report.left), sensitive: uniq(report.sensitive), missing: uniq(report.missing), resume, needsManualResume: Boolean(report.needsManualResume) }
  }

  // ── Written questions ("Why us?", "Tell us about yourself" …) ──────────────

  /** Long-answer questions on this page that the assistant can draft for you to review. */
  function writtenQuestions() {
    return fields()
      .filter((f) => f.el.tagName === 'TEXTAREA' || (f.el.type === 'text' && f.desc.length > 35 && /\?$/.test(f.desc)))
      .filter((f) => f.verdict.action !== 'sensitive' && f.verdict.key !== 'cover_letter' && f.verdict.action !== 'fill')
      .map((f, i) => {
        f.el.dataset.jobAssistQ = String(i)
        return { id: String(i), el: f.el, text: f.desc, maxLength: f.el.maxLength > 0 ? f.el.maxLength : null }
      })
  }

  /** What the page says about the job, for answers when it was not opened from the dashboard. */
  function pageJob(pending) {
    const title = pending?.title ?? document.title.replace(/^Job Application for /, '').split(/ at | @ | - | \| /)[0].trim()
    const company = pending?.company ?? document.title.split(/ at | @ /).slice(1).join(' ').split(/ - | \| /)[0].trim()
    const main = document.querySelector('main, [role=main], #content, .content') ?? document.body
    return { title, company, description: textOf(main).slice(0, 15000) }
  }

  const inserted = new Map() // question → the answer you approved and put in the form

  async function draftWritten(questions, { preferAi = false } = {}) {
    const { pending } = await context()
    const res = await chrome.runtime.sendMessage({ type: 'draftAnswers', jobKey: pending?.jobKey ?? null, page: pageJob(pending), approved: pending?.answers ?? [], preferAi, questions: questions.map(({ id, text, maxLength }) => ({ id, text, maxLength })) })
    if (!res?.ok) throw new Error(res?.error ?? 'The assistant did not answer.')
    return res.drafts
  }

  async function markApplied() {
    const { pending, tracker, resume } = await context()
    const now = new Date().toISOString()
    const key = pending?.jobKey ?? `page:${location.origin}${location.pathname}`
    const rec = tracker[key] ?? {
      key,
      company: pending?.company ?? document.title.split(/ at | @ /).pop()?.trim() ?? location.hostname,
      title: pending?.title ?? document.title.replace(/^Job Application for /, '').split(/ at | @ /)[0].trim(),
      url: location.href,
      applyUrl: location.href,
      status: 'shortlisted',
      history: [],
      notes: '',
    }
    const answers = [...inserted].map(([question, answer]) => ({ question, answer }))
    tracker[key] = {
      ...rec,
      status: 'applied',
      appliedAt: rec.appliedAt ?? now,
      portal: rec.portal ?? portalOf(location.href),
      applyUrl: rec.applyUrl ?? location.href,
      resumeVersion: pending?.resumeLabel ?? resume?.label ?? rec.resumeVersion ?? null,
      coverLetterUsed: Boolean(pending?.coverLetter),
      // The answers you approved and put in this form (what the company received, unless you edited them after).
      answers: answers.length ? answers : rec.answers ?? [],
      history: [...(rec.history ?? []), { status: 'applied', at: now, via: 'application page' }],
    }
    const { pendingApply = {} } = await chrome.storage.local.get('pendingApply')
    if (pending) delete pendingApply[pending.jobKey]
    await chrome.storage.local.set({ tracker, pendingApply })
    return tracker[key]
  }

  // ── The panel (Shadow DOM, so the site's CSS cannot change it and it cannot change the site) ───────────

  function panel() {
    const host = document.createElement('div')
    host.id = 'job-assist-panel'
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647'
    // Open (not closed) so it can be tested; the site could read the fields we fill anyway.
    const sh = host.attachShadow({ mode: 'open' })
    sh.innerHTML = `
      <style>
        :host{all:initial}
        .box{font:13px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#f1f5f9;background:#0f172a;border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.45);width:360px;max-height:80vh;overflow:auto}
        .card{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px;display:grid;gap:6px;background:#111c33}
        .q{font-weight:700}
        .src{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px}
        textarea,input[type=text]{font:inherit;color:#f1f5f9;background:#0f172a;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:6px;width:100%;box-sizing:border-box}
        textarea{min-height:110px;resize:vertical}
        label{display:flex;gap:6px;align-items:flex-start;font-size:12px}
        button:disabled{opacity:.45;cursor:not-allowed}
        .ok{color:#34d399;font-size:12px}
        header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700}
        header small{color:#94a3b8;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:10px}
        .body{padding:10px 12px;display:grid;gap:8px}
        button{font:inherit;font-weight:700;border:0;border-radius:6px;padding:8px 10px;cursor:pointer}
        .primary{background:#3b82f6;color:#fff}.primary:hover{background:#2563eb}
        .ghost{background:#1e293b;color:#f1f5f9;border:1px solid rgba(255,255,255,.12)}
        .x{background:none;color:#94a3b8;padding:2px 6px}
        .note{color:#94a3b8;font-size:12px}
        .warn{color:#fbbf24;font-size:12px}
        ul{margin:2px 0 0 16px;padding:0}
        li{margin:1px 0}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
      </style>
      <div class="box">
        <header><span>Job Assistant <small>never submits</small></span><button class="x" title="Close">✕</button></header>
        <div class="body">
          <div class="note" id="ctx"></div>
          <button class="primary" id="fill">Fill from my profile</button>
          <div id="out"></div>
          <div id="written"></div>
          <button class="ghost" id="applied">I submitted it — record as applied</button>
          <div class="note">Review every field, answer the highlighted questions yourself, then press the site’s own Submit button.</div>
        </div>
      </div>`
    const $ = (s) => sh.querySelector(s)
    const out = $('#out')
    const list = (title, color, items) => {
      if (!items.length) return null
      const d = document.createElement('div')
      const h = document.createElement('div')
      h.innerHTML = `<span class="dot" style="background:${color}"></span>`
      h.append(document.createTextNode(`${title} (${items.length})`))
      const ul = document.createElement('ul')
      for (const it of items.slice(0, 12)) {
        const li = document.createElement('li')
        li.textContent = it
        ul.append(li)
      }
      d.append(h, ul)
      return d
    }
    context().then(({ pending, profile }) => {
      const c = captcha()
      $('#ctx').textContent = pending ? `${pending.title} · ${pending.company}${pending.score != null ? ` · match ${pending.score}/100` : ''}` : profile ? 'This page was not opened from your dashboard; it will be recorded from the page title.' : 'Open the assistant’s Profile page once first.'
      if (/(^|\.)ashbyhq\.com$/.test(location.hostname)) {
        // Seen in testing: Ashby sends each answer (and an attached resume) to the company as it is filled.
        const w = document.createElement('div')
        w.className = 'warn'
        w.textContent = 'This site saves each answer to the company as you fill it, before you submit. Fill only when you mean to apply.'
        $('#ctx').after(w)
      }
      if (c.challenge) {
        const w = document.createElement('div')
        w.className = 'warn'
        w.textContent = 'A CAPTCHA challenge is on this page — complete it yourself.'
        $('#ctx').after(w)
      } else if (c.present) {
        const w = document.createElement('div')
        w.className = 'note'
        w.textContent = 'This site uses a CAPTCHA check. If a challenge appears when you submit, complete it yourself.'
        $('#ctx').after(w)
      }
    })
    $('.x').onclick = () => {
      unmarkAll()
      host.remove()
    }
    $('#fill').onclick = async () => {
      out.textContent = 'Filling…'
      const r = await fill()
      out.textContent = ''
      if (r.error) {
        out.className = 'warn'
        out.textContent = r.error
        return
      }
      out.className = ''
      for (const n of [list('Filled — check them', COLORS.filled, r.filled), list('Answer yourself (sensitive)', COLORS.sensitive, r.sensitive), list('Left for you', COLORS.todo, r.left), list('Not in your profile yet', COLORS.todo, r.missing)]) if (n) out.append(n)
      if (r.needsManualResume && r.resume) {
        const b = document.createElement('button')
        b.className = 'ghost'
        b.textContent = `Save resume file (${r.resume.label})`
        b.onclick = () => saveResume(r.resume)
        out.append(b)
      }
      showWrittenButton()
    }

    // Written answers: drafted from your verified profile, shown here, put in the form only after you approve.
    const el = (tag, cls, text) => {
      const n = document.createElement(tag)
      if (cls) n.className = cls
      if (text !== undefined) n.textContent = text
      return n
    }
    const SOURCE = { template: 'Draft from your profile', ai: 'AI draft — check every claim', dashboard: 'Approved on your dashboard', profile: 'From your profile', none: 'Needs your answer' }
    function showWrittenButton() {
      const box = $('#written')
      box.replaceChildren()
      const qs = writtenQuestions()
      if (!qs.length) return
      const b = el('button', 'ghost', `Draft written answers (${qs.length})`)
      b.onclick = async () => {
        b.disabled = true
        b.textContent = 'Drafting…'
        try {
          const drafts = await draftWritten(qs)
          box.replaceChildren(el('div', 'note', 'Edit each answer until it sounds like you. Nothing goes into the form until you tick it and press “Put in the form”.'))
          for (const d of drafts) box.append(answerCard(qs.find((q) => q.id === d.id), d))
        } catch (err) {
          box.replaceChildren(el('div', 'warn', `Could not draft answers: ${err.message}`))
        }
      }
      box.append(b)
    }

    function answerCard(q, d) {
      const card = el('div', 'card')
      card.append(el('div', 'q', q.text), el('div', 'src', SOURCE[d.source] ?? d.source))
      if (d.note) card.append(el('div', d.source === 'none' ? 'warn' : 'note', d.note))
      if (d.kind === 'sensitive') return card
      const ta = el('textarea')
      ta.value = d.text ?? ''
      if (q.maxLength) ta.maxLength = q.maxLength
      const issues = el('div')
      const tick = el('input')
      tick.type = 'checkbox'
      const save = el('input')
      save.type = 'checkbox'
      const go = el('button', 'primary', 'Put in the form')
      let blocking = false
      const showIssues = (list) => {
        blocking = list.some((i) => i.blocking)
        issues.replaceChildren(...list.map((i) => el('div', i.blocking ? 'warn' : 'note', `• ${i.text}`)))
        go.disabled = !tick.checked || blocking || !ta.value.trim()
      }
      showIssues(d.issues ?? [])
      let t
      ta.oninput = () => {
        tick.checked = false
        go.disabled = true
        clearTimeout(t)
        t = setTimeout(async () => {
          const r = await chrome.runtime.sendMessage({ type: 'checkAnswer', text: ta.value, maxLength: q.maxLength })
          showIssues(r?.issues ?? [])
        }, 400)
      }
      tick.onchange = () => (go.disabled = !tick.checked || blocking || !ta.value.trim())
      const l1 = el('label')
      l1.append(tick, el('span', '', 'I read this; it is true and in my own words'))
      card.append(ta, issues, l1)
      const factField = d.kind === 'fact' ? (/notice/i.test(q.text) ? 'noticePeriod' : /start/i.test(q.text) ? 'earliestStart' : /salary|compensation|pay|ctc/i.test(q.text) ? 'salaryExpectation' : null) : null
      if (factField && d.source === 'none') {
        const l2 = el('label')
        l2.append(save, el('span', '', 'Also save this to my profile'))
        card.append(l2)
      }
      go.onclick = async () => {
        setValue(q.el, ta.value)
        mark(q.el, COLORS.filled, 'Your approved answer — check it')
        inserted.set(q.text, ta.value)
        if (save.checked && factField) await chrome.runtime.sendMessage({ type: 'saveFact', field: factField, value: ta.value })
        go.textContent = 'In the form ✓'
        go.disabled = true
      }
      card.append(go)
      return card
    }
    $('#applied').onclick = async () => {
      if (!confirm('Record this application as submitted? Only do this after you pressed the site’s Submit button and saw its confirmation.')) return
      const rec = await markApplied()
      out.className = 'note'
      out.textContent = `Recorded: ${rec.title} at ${rec.company}, applied ${new Date(rec.appliedAt).toLocaleDateString()}${rec.resumeVersion ? `, resume “${rec.resumeVersion}”` : ''}.`
    }
    document.documentElement.append(host)
  }

  // "Fill this page" from the popup shows the panel at once (top frame); otherwise it waits for a form.
  const show = () => {
    if (!document.getElementById('job-assist-panel')) panel()
  }
  window.__jobAssistShow = () => {
    if (window === window.top || hasForm()) show()
  }
  if (window.__jobAssistForce && window === window.top) show()

  // Forms on these sites are often rendered after load: look for one for a short while.
  let tries = 0
  const timer = setInterval(() => {
    if (document.getElementById('job-assist-panel')) return clearInterval(timer)
    if (hasForm()) {
      clearInterval(timer)
      show()
    } else if (++tries > 40) clearInterval(timer)
  }, 500)

  // For tests: the pure parts.
  globalThis.__jobAssist = { fields, fill, describe, captcha, setValue, writtenQuestions, pageJob, inserted, markApplied, context, draftWritten, textOf, visible }
})()
