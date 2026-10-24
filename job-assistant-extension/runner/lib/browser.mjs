// Playwright side: launch a real browser, inject the extension's field-detection scripts, and act with TRUSTED
// input (real clicks and typing), which is what dropdown widgets such as react-select need.

import { chromium } from 'playwright-core'
import { readContent } from './shared.mjs'

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The helpers run in the page with a stub for the extension APIs they never need here. */
function initScript() {
  const stub = `window.__jobAssistNoPanel = true;
    window.chrome = Object.assign(window.chrome || {}, { storage: { local: { get: async () => ({}), set: async () => {} } }, runtime: { sendMessage: async () => ({ ok: true, drafts: [] }) } });`
  return [stub, ...['fieldmap.js', 'autofill.js', 'autoquestions.js', 'autorun.js'].map(readContent)].join('\n;\n')
}

export async function launch({ headed = false, channel = 'chrome', userDataDir = null } = {}) {
  const opts = { channel, headless: !headed, viewport: { width: 1280, height: 900 }, locale: 'en-US' }
  let browser = null
  let context
  if (userDataDir) context = await chromium.launchPersistentContext(userDataDir, opts)
  else {
    browser = await chromium.launch({ channel, headless: !headed })
    context = await browser.newContext({ viewport: opts.viewport, locale: opts.locale })
  }
  await context.addInitScript({ content: initScript() })
  return { context, close: async () => { await context.close().catch(() => {}); await browser?.close().catch(() => {}) } }
}

/** Cookie banners can cover the form. Reject if the banner allows it, otherwise accept (this is not a legal agreement). */
export async function dismissBanners(page) {
  for (const re of [/^(reject all|reject|decline( all)?|only (necessary|essential)|necessary only)$/i, /^(accept( all)?( cookies)?|allow all|i agree|got it|ok)$/i]) {
    const b = page.getByRole('button', { name: re }).filter({ visible: true }).first()
    if (await b.count().catch(() => 0)) {
      await b.click({ timeout: 2000 }).catch(() => {})
      return true
    }
  }
  return false
}

/** Some portals show the posting first and the form only after a click ("I'm interested", "Apply"). */
export async function revealForm(page) {
  const re = /^(i'?m interested|apply( now| for this job| to this job)?|start (your )?application)$/i
  for (const role of ['button', 'link']) {
    const b = page.getByRole(role, { name: re }).filter({ visible: true }).first()
    if (await b.count().catch(() => 0)) {
      await b.click({ timeout: 4000 }).catch(() => {})
      await page.waitForTimeout(3500)
      return true
    }
  }
  return false
}

/** Every question on the page, marked with data-ja so Playwright can find it again. */
export async function scan(page) {
  return page.evaluate(() => {
    const A = globalThis.__jobAssistAuto
    const B = globalThis.__jobAssist
    if (!A || !B) return { error: 'helpers not loaded' }
    // writtenQuestions() tags long-answer fields (data-job-assist-q) so they are not treated as plain controls
    const written = B.writtenQuestions().map((q) => ({ id: q.id, text: q.text, maxLength: q.maxLength, required: q.el.required || q.el.getAttribute('aria-required') === 'true' || /\*/.test(q.text) }))
    const controls = A.collect().map((c, i) => {
      c.el.setAttribute('data-ja', String(i))
      ;(c.els ?? []).forEach((e, j) => e.setAttribute('data-ja-opt', `${i}-${j}`))
      return { i, kind: c.kind, label: c.label, options: c.options, required: c.required, done: c.done, action: c.f.verdict.action, key: c.f.verdict.key ?? null, id: c.el.id || null, wq: c.el.getAttribute('data-job-assist-q') }
    })
    const files = B.fields().filter((f) => f.el.type === 'file').map((f, i) => {
      f.el.setAttribute('data-ja-file', String(i))
      return { i, desc: f.desc, key: f.verdict.key ?? null, action: f.verdict.action, required: f.required }
    })
    return { controls, files, written, captcha: B.captcha(), url: location.href, title: document.title, head: (document.body.innerText ?? '').slice(0, 400) }
  })
}

export async function waitForForm(page, ms = 25000) {
  const end = Date.now() + ms
  let last = null
  while (Date.now() < end) {
    last = await scan(page).catch(() => null)
    if (last && !last.error && last.controls.filter((c) => c.action === 'fill').length >= 2) return last
    await page.waitForTimeout(700)
  }
  return last
}

/** Opens a dropdown only to read its options, then closes it (nothing is selected). */
export async function readOptions(page, c) {
  const input = page.locator(`[data-ja="${c.i}"]`)
  const control = input.locator('xpath=ancestor::*[contains(@class,"select__control")][1]')
  const target = (await control.count()) ? control : input
  await target.click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(300)
  const sel = c.id ? `[id*="${c.id}-option-"]` : '[role=option]'
  const texts = (await page.locator(sel).allInnerTexts().catch(() => [])).map(clean).filter(Boolean)
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(120)
  return texts
}

/** Performs one decided answer with real input. Returns true when the page shows it. */
export async function act(page, c, d) {
  const loc = page.locator(`[data-ja="${c.i}"]`)
  const opt = (j) => page.locator(`[data-ja-opt="${c.i}-${j}"]`)
  switch (c.kind) {
    case 'text':
    case 'textarea':
      await loc.fill(String(d.value))
      return true
    case 'select':
      await loc.selectOption({ label: d.option })
      return true
    case 'radio': {
      const j = c.options.indexOf(d.option)
      if (j < 0) return false
      await opt(j).check({ force: true, timeout: 4000 }).catch(async () => opt(j).click({ force: true }))
      return true
    }
    case 'yesno': {
      const j = c.options.indexOf(d.option)
      if (j < 0) return false
      await opt(j).click({ timeout: 4000 })
      return true
    }
    case 'checkbox':
      if (d.checked) await loc.check({ force: true, timeout: 4000 })
      else await loc.uncheck({ force: true, timeout: 4000 })
      return true
    case 'combobox': {
      const control = loc.locator('xpath=ancestor::*[contains(@class,"select__control")][1]')
      const sel = c.id ? `[id*="${c.id}-option-"]` : '[role=option]'
      if (d.value) {
        await loc.click({ timeout: 4000 })
        await loc.fill(String(d.value))
        await page.waitForTimeout(900)
        const first = page.locator(sel).first()
        if (!(await first.count())) return false
        await first.click({ timeout: 4000 })
        return true
      }
      await ((await control.count()) ? control : loc).click({ timeout: 4000 })
      await page.waitForTimeout(250)
      const hit = page.locator(sel).filter({ hasText: new RegExp(`^\\s*${esc(d.option)}\\s*$`) }).first()
      if (!(await hit.count())) {
        await page.keyboard.press('Escape').catch(() => {})
        return false
      }
      await hit.click({ timeout: 4000 })
      const shown = await page.evaluate((i) => document.querySelector(`[data-ja="${i}"]`)?.closest('.select__control')?.querySelector('[class*="single-value"]')?.textContent ?? null, c.i)
      return shown === null || clean(shown).toLowerCase().includes(String(d.option).toLowerCase().slice(0, 12))
    }
    default:
      return false
  }
}

export async function attachResume(page, fileIdx, resume) {
  const input = page.locator(`[data-ja-file="${fileIdx}"]`)
  await input.setInputFiles({ name: resume.fileName || 'resume.pdf', mimeType: resume.mime || 'application/pdf', buffer: Buffer.from(resume.dataB64, 'base64') })
  const name = String(resume.fileName || '').toLowerCase()
  if (name) await page.waitForFunction((n) => (document.body.innerText ?? '').toLowerCase().includes(n), name, { timeout: 20000 }).catch(() => {})
  return true
}

const SUBMIT = /^(submit( my)?( application)?|send( my)?( application)?|apply( now)?)$/i
export async function findSubmit(page) {
  const buttons = page.getByRole('button', { name: SUBMIT }).filter({ visible: true })
  const n = await buttons.count()
  for (let i = 0; i < n; i++) if (await buttons.nth(i).isEnabled()) return buttons.nth(i)
  return null
}

const CONFIRM_SRC = String.raw`thank you for (applying|your application|your interest in)|application (has been |was )?(successfully )?(submitted|received|sent)|we('ve| have) received your application|successfully submitted|your application (was|has been) (sent|submitted|received)`
export async function waitForConfirmation(page, ms = 45000) {
  const ok = await page.waitForFunction(({ src }) => new RegExp(src, 'i').test((document.body.innerText ?? '').slice(0, 20000)) || /\/(confirmation|thanks?|thank-you|submitted|success|complete)(\/|\?|$)/i.test(location.pathname), { src: CONFIRM_SRC }, { timeout: ms }).then(() => true).catch(() => false)
  if (ok) return { confirmed: true }
  const errors = await page.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"], [role=alert], [class*="error" i]')].filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 }).map((n) => (n.innerText ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 5)).catch(() => [])
  return { confirmed: false, errors }
}
