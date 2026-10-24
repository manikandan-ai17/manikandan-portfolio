// End-to-end check of the one-click Run in a real Chromium with the real extension loaded.
// Every network call is intercepted: the job boards, the application forms and Gemini are local fakes, so this
// never contacts a real company or submits a real application.
//   node scripts/e2e-run.mjs          (needs: npx playwright-core install chromium)

import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../extension')
const TINY_PDF_B64 = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64')

const DESC = '<p>You will build LLM-powered features with Python, TypeScript, FastAPI and React, and work with PostgreSQL. 0-2 years of experience. You will integrate LLM APIs into production applications.</p>'
// MongoDB and Okta list jobs on their own careers sites (as they really do), so their form is Greenhouse's embedded page.
const OWN_SITE = new Set(['mongodb', 'okta'])
const gh = (token, id, title, location) => ({ id, title, absolute_url: OWN_SITE.has(token) ? `https://www.${token}.com/careers/job/?gh_jid=${id}` : `https://job-boards.greenhouse.io/${token}/jobs/${id}`, location: { name: location }, content: DESC, updated_at: '2026-10-20T00:00:00Z' })
// What the fake boards list. Expected outcome in the comments.
const BOARDS = {
  mongodb: [gh('mongodb', 101, 'AI Engineer', 'Bengaluru, India'), gh('mongodb', 102, 'Software Engineer, AI', 'Bengaluru, India')], // one of the two
  okta: [gh('okta', 201, 'AI Engineer', 'Bengaluru, India')], // applied
  hackerrank: [gh('hackerrank', 301, 'Software Engineer - AI', 'Remote - India')], // applied
  stripe: [gh('stripe', 401, 'AI Engineer', 'Bengaluru, India')], // skipped: you applied to Stripe before (tracker)
  twilio: [gh('twilio', 501, 'AI Engineer', 'Remote - US')], // skipped: location
  elastic: [gh('elastic', 601, 'AI Engineer', 'Bengaluru, India')], // skipped: the (fake) AI says poor fit
}

const FORM = (token, id) => `<!doctype html><html><head><title>Job Application for AI Engineer at ${token}</title></head><body>
<h1>AI Engineer</h1>
<form id="application-form" method="post" action="/${token}/jobs/${id}/confirmation" enctype="multipart/form-data">
  <label for="first_name">First Name*</label><input id="first_name" name="first_name" required><br>
  <label for="last_name">Last Name*</label><input id="last_name" name="last_name" required><br>
  <label for="email">Email*</label><input id="email" name="email" type="email" required><br>
  <label for="phone">Phone*</label><input id="phone" name="phone" type="tel" required><br>
  <label for="resume">Resume/CV*</label><input id="resume" name="resume" type="file" required><br>
  <label for="sp">Will you now or in the future require visa sponsorship? *</label>
  <select id="sp" name="sp" required><option value="">Select...</option><option>Yes</option><option>No</option></select><br>
  <fieldset><legend>Are you legally authorized to work in India? *</legend>
    <label><input type="radio" name="auth" value="yes" required> Yes</label>
    <label><input type="radio" name="auth" value="no"> No</label></fieldset>
  <label><input type="checkbox" id="priv" name="priv" required> I acknowledge the Privacy Policy*</label><br>
  <label for="why">Why do you want to work here?*</label><textarea id="why" name="why" required></textarea><br>
  <button type="submit">Submit application</button>
</form></body></html>`
const THANKS = '<!doctype html><title>Thank you</title><h1>Thank you for applying</h1><p>Your application has been submitted.</p>'

// Branded Chrome no longer loads unpacked extensions from the command line, so this uses Playwright's Chromium:
// the build playwright-core expects if present, otherwise the newest one already downloaded.
function installedChromium() {
  if (fs.existsSync(chromium.executablePath())) return undefined
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(os.homedir(), process.platform === 'win32' ? 'AppData/Local/ms-playwright' : '.cache/ms-playwright')
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1])) : []
  const exe = (d) => path.join(root, d, process.platform === 'win32' ? 'chrome-win64/chrome.exe' : 'chrome-linux/chrome')
  const found = dirs.map(exe).find((p) => fs.existsSync(p))
  if (!found) throw new Error('No Chromium found. Run: npx playwright-core install chromium')
  return found
}

const seen = []
const aiDrafts = []
const posted = []
const opened = []

// The application pages. Tabs the extension opens make their first request before Playwright can intercept it,
// so job-boards.greenhouse.io is resolved to this local HTTPS server instead (self-signed, made with openssl).
function startFormServer(dir) {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=job-boards.greenhouse.io', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' })
  const server = https.createServer({ key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')) }, (req, res) => {
    const u = new URL(req.url, 'https://job-boards.greenhouse.io')
    const parts = u.pathname.split('/')
    // /embed/job_app?for=<token>&token=<id>  or  /<token>/jobs/<id>[/confirmation]
    const [token, id] = u.pathname.startsWith('/embed/') ? [u.searchParams.get('for'), u.searchParams.get('token')] : [parts[1], parts[3]]
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (d) => (body += d)).on('end', () => {
        posted.push({ token, id, body })
        res.writeHead(200, { 'content-type': 'text/html' }).end(THANKS)
      })
      return
    }
    opened.push(`${token}/${id}${u.pathname.startsWith('/embed/') ? ' (embedded form)' : ''}`)
    res.writeHead(200, { 'content-type': 'text/html' }).end(FORM(token, id))
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobassist-e2e-'))
  const server = await startFormServer(dir)
  const context = await chromium.launchPersistentContext(path.join(dir, 'profile'), {
    channel: 'chromium',
    executablePath: installedChromium(),
    headless: true,
    ignoreHTTPSErrors: true,
    args: [
      // --load-extension hangs Chromium on some Windows setups; loading over the DevTools protocol works everywhere.
      '--enable-unsafe-extension-debugging',
      // The form host goes to the local server; every other host that is not intercepted below cannot resolve.
      `--host-resolver-rules=MAP job-boards.greenhouse.io 127.0.0.1:${server.address().port}, MAP * ~NOTFOUND, EXCLUDE 127.0.0.1`,
      '--ignore-certificate-errors',
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
  })
  try {
    await context.route('**/*', async (route) => {
      const req = route.request()
      const u = new URL(req.url())
      if (u.protocol === 'chrome-extension:') return route.continue()
      if (!/boards-api|ashbyhq|lever/.test(u.host)) seen.push(`${req.method()} ${u.host}${u.pathname}`)
      if (u.host === 'boards-api.greenhouse.io') {
        const token = u.pathname.split('/')[3]
        return route.fulfill({ json: { jobs: BOARDS[token] ?? [] } })
      }
      if (u.host === 'api.ashbyhq.com') return route.fulfill({ json: { jobs: [] } })
      if (u.host === 'api.lever.co') return route.fulfill({ json: [] })
      if (u.host === 'generativelanguage.googleapis.com') {
        const body = JSON.parse(req.postData())
        const prompt = body.contents[0].parts[0].text
        if (!body.generationConfig?.responseSchema) {
          // A written-answer draft (asked from the background worker, if its requests reach this route)
          aiDrafts.push(prompt.slice(0, 80))
          return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: 'I build LLM-backed features in Python at work, which is what this posting asks for.' }] }, finishReason: 'STOP' }], modelVersion: 'fake-gemini' } })
        }
        const poor = /at Elastic/.test(prompt)
        const verdict = poor ? { decision: 'skip', fit: 'weak', reasons: [], blockers: ['(test) the posting needs 5+ years'] } : { decision: 'apply', fit: 'good', reasons: ['(test) Python and LLM APIs at work'], blockers: [] }
        return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(verdict) }] }, finishReason: 'STOP' }], modelVersion: 'fake-gemini' } })
      }
      if (u.host === 'job-boards.greenhouse.io') return route.continue() // the local form server
      return route.abort() // everything else (other boards, fonts …) is cut off
    })

    const { id: extId } = await (await context.browser().newBrowserCDPSession()).send('Extensions.loadUnpacked', { path: EXT })
    const sw = context.serviceWorkers().find((w) => w.url().includes(extId)) ?? (await context.waitForEvent('serviceworker'))
    await sw.evaluate(async (pdf) => {
      await chrome.storage.local.clear()
      await chrome.storage.local.set({
        profileUser: {
          phone: '+91 90000 00000', city: 'Coimbatore',
          eligibility: { authorizedCountries: ['India'], needsSponsorshipElsewhere: false, openToRelocate: true, noticePeriod: '30 days', earliestStart: 'Immediately', languages: [{ name: 'English', level: 'Professional' }] },
          myWords: { lookingFor: 'I want to keep building LLM-backed products that real people use, alongside engineers I can learn from.' },
        },
        resumes: [{ id: 'r1', label: 'Main', fileName: 'resume.pdf', dataB64: pdf, isDefault: true }],
        settings: { geminiKey: 'fake-key-for-test', aiProvider: 'gemini', autoApply: { enabled: true, dryRun: false, pauseSeconds: 1, targetPerRun: 5, watchHours: 0 } },
        tracker: { old: { key: 'old', company: 'Stripe', title: 'Backend Engineer', status: 'applied', history: [] } },
      })
    }, TINY_PDF_B64)

    const runOnce = async (label) => {
      await sw.evaluate(() => chrome.storage.local.remove('lastRun'))
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(`page error: ${e.message}`))
      page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
      await page.goto(`chrome-extension://${extId}/pages/dashboard.html#autorun`)
      const end = Date.now() + 4 * 60 * 1000
      let last
      while (Date.now() < end && !(last = await sw.evaluate(() => chrome.storage.local.get('lastRun').then((r) => r.lastRun)))) await new Promise((r) => setTimeout(r, 1000))
      if (!last) {
        const run = await sw.evaluate(() => chrome.storage.local.get(['autoApplyRun', 'processedJobs', 'autoApplyLog']))
        console.error(JSON.stringify({ pages: context.pages().map((p) => p.url()), requests: seen.slice(-15), errors, opened, posted: posted.map((p) => p.token), status: await page.locator('#auto').innerText().catch(() => '?'), run }, null, 1).slice(0, 6000))
      }
      await page.close()
      if (!last) throw new Error(`${label}: the run did not finish in 4 minutes`)
      return last
    }

    const s1 = await runOnce('Run 1')
    const st = await sw.evaluate(() => chrome.storage.local.get(['processedJobs', 'tracker', 'jobs']))
    const verdicts = Object.values(st.jobs ?? {}).map((j) => `${j.company} · ${j.title} · ${j.locations.join('/')} → ${j.match?.verdict} ${j.match?.score}`)
    const openedRun1 = [...opened]
    const postedRun1 = posted.length
    opened.length = 0
    const s2 = await runOnce('Run 2')

    const companies = posted.map((p) => p.token)
    const checks = [
      ['the boards were searched and scored', verdicts.length === 7],
      ['run 1 applied to the 3 suitable companies (fewer than 5 qualify, so no more)', s1.applied.length === 3 && postedRun1 === 3],
      ['one application per company (MongoDB had two matching jobs)', new Set(companies).size === companies.length && companies.filter((c) => c === 'mongodb').length === 1],
      ['Stripe skipped: applied before', !openedRun1.some((o) => o.startsWith('stripe'))],
      ['US-only remote role skipped: location', !openedRun1.some((o) => o.startsWith('twilio'))],
      ['Elastic skipped: the AI fit check said poor fit, reason recorded', s1.skippedFit.length === 1 && Object.values(st.processedJobs).some((p) => p.company === 'Elastic' && p.status === 'skipped_fit' && /5\+ years/.test(p.reasons.join(' ')))],
      ['each form was really filled and POSTed with the resume and a written answer', posted.length > 0 && posted.every((p) => /Manikandan/.test(p.body) && /resume\.pdf/.test(p.body) && /LLM-backed (products|features)/.test(p.body))],
      ['applications recorded in the tracker as applied', Object.values(st.tracker).filter((r) => r.status === 'applied').length === 4],
      ['history marks the 3 jobs applied', Object.values(st.processedJobs).filter((p) => p.status === 'applied').length === 3],
      ['run 2 applies to nobody: no new suitable company left', s2.applied.length === 0 && opened.length === 0 && posted.length === 3],
    ]
    console.log(verdicts.map((v) => `  job: ${v}`).join('\n'))
    for (const p of Object.values(st.processedJobs)) console.log(`  history: ${p.company} · ${p.title} → ${p.status}${p.reasons?.length ? ` (${p.reasons.join('; ')})` : ''}`)
    console.log(`  AI drafts requested through the intercepted network: ${aiDrafts.length}`)
    console.log(`  run 1: ${JSON.stringify({ applied: s1.applied, needsYou: s1.needsYou, failed: s1.failed, skippedFit: s1.skippedFit, skipped: s1.skipped })}`)
    console.log(`  run 2: ${JSON.stringify({ applied: s2.applied, candidates: s2.candidates, skipped: s2.skipped })}`)
    for (const [name, ok] of checks) console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}`)
    if (checks.some(([, ok]) => !ok)) process.exitCode = 1
    else console.log('\nAll end-to-end checks passed')
  } finally {
    await context.close()
    server.close()
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
