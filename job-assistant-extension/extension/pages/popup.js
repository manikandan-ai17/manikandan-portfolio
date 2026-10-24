import { h, fmtDate } from './ui.js'
import { get, loadProfile, loadSettings } from '../src/lib/store.js'
import { loadAuto } from '../src/lib/autoapply.js'
import { missingInfo } from '../src/lib/profile.js'

const open = (page) => {
  chrome.tabs.create({ url: chrome.runtime.getURL(`pages/${page}`) })
  window.close()
}
document.getElementById('dash').onclick = () => open('dashboard.html')
document.getElementById('profile').onclick = () => open('profile.html')

// "Fill this page": the panel on the application form open in this tab, on any careers site. Runs only when you
// click (activeTab), never in the background. LinkedIn, Indeed and Wellfound forbid automation in their terms.
const BLOCKED = /(^|\.)(linkedin\.com|indeed\.[a-z.]+|wellfound\.com|angel\.co|glassdoor\.[a-z.]+)$/
document.getElementById('here').onclick = async () => {
  const msg = document.getElementById('hereMsg')
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let host = ''
  try {
    host = new URL(tab?.url ?? '').hostname
  } catch {
    /* not a web page */
  }
  if (!/^https?:/.test(tab?.url ?? '')) return msg.replaceChildren(h('div', { class: 'banner small' }, 'Open the job’s application form in this tab first.'))
  if (BLOCKED.test(host)) {
    return msg.replaceChildren(
      h('div', { class: 'banner small' }, h('b', {}, `${host.replace(/^www\./, '')} does not allow automation`), ' — its terms forbid extensions that read or fill its pages, and accounts can be restricted. Instead: ', h('a', { href: '#', onclick: (e) => (e.preventDefault(), open('dashboard.html#add')) }, 'add the job to your dashboard'), ' (paste its link and description) to score it, track it and draft answers you copy in yourself — or use “Apply on company site” if the posting has it; the assistant works there.'),
    )
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: () => (window.__jobAssistForce = true) })
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ['src/content/fieldmap.js', 'src/content/autofill.js'] })
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: () => window.__jobAssistShow?.() })
    window.close()
  } catch (err) {
    msg.replaceChildren(h('div', { class: 'banner bad small' }, `Could not open the panel on this page: ${err.message}`))
  }
}

const profile = await loadProfile()
const meta = await get('runMeta')
const tracker = await get('tracker', {})
document.getElementById('who').textContent = `${profile.fullName} · ${profile.headline}`

const missing = missingInfo(profile)
if (missing.length) {
  document.getElementById('missing').append(
    h('div', { class: 'banner small' }, `${missing.length} profile answer${missing.length > 1 ? 's' : ''} missing (${missing.map((m) => m.label.toLowerCase()).slice(0, 2).join(', ')}${missing.length > 2 ? ' …' : ''}). `, h('a', { href: '#', onclick: (e) => (e.preventDefault(), open('profile.html')) }, 'Add them')),
  )
}

const auto = loadAuto(await loadSettings())
const runBtn = document.getElementById('run')
runBtn.textContent = auto.enabled ? `▶ Run — find jobs and ${auto.dryRun ? 'dry-run' : 'apply to'} up to ${auto.targetPerRun}` : '▶ Run — find matching jobs'
runBtn.onclick = () => open(auto.enabled ? 'dashboard.html#autorun' : 'dashboard.html#run')
const lastRun = await get('lastRun')

const recs = Object.values(tracker)
const c = meta?.counts ?? {}
document.getElementById('stats').append(
  h('span', { class: 'muted' }, 'Last run'), h('b', {}, meta ? fmtDate(meta.at) : 'never'),
  h('span', { class: 'muted' }, 'Strong / good matches'), h('b', {}, meta ? `${c.strong ?? 0} / ${c.good ?? 0}` : '—'),
  h('span', { class: 'muted' }, 'Applied'), h('b', {}, recs.filter((r) => ['applied', 'interviewing', 'offer'].includes(r.status)).length),
  h('span', { class: 'muted' }, 'Being prepared'), h('b', {}, recs.filter((r) => ['shortlisted', 'preparing'].includes(r.status)).length),
  h('span', { class: 'muted' }, 'Auto-apply'), h('b', {}, auto.enabled ? (auto.dryRun ? 'DRY RUN' : 'LIVE') : 'OFF'),
  ...(lastRun ? [h('span', { class: 'muted' }, `Last Run (${fmtDate(lastRun.at)})`), h('b', {}, `${lastRun.applied.length} ${lastRun.dryRun ? 'filled' : 'applied'} · ${lastRun.needsYou.length} need you`)] : []),
)
const pendingQs = Object.keys(await get('pendingQuestions', {})).length
if (pendingQs) document.getElementById('missing').append(h('div', { class: 'banner small' }, `${pendingQs} question${pendingQs === 1 ? '' : 's'} from application forms need your answer. `, h('a', { href: '#', onclick: (e) => (e.preventDefault(), open('dashboard.html#auto')) }, 'Answer them')))
