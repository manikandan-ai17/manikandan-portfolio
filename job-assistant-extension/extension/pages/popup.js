import { h, fmtDate } from './ui.js'
import { get, loadProfile } from '../src/lib/store.js'
import { missingInfo } from '../src/lib/profile.js'

const open = (page) => {
  chrome.tabs.create({ url: chrome.runtime.getURL(`pages/${page}`) })
  window.close()
}
document.getElementById('run').onclick = () => open('dashboard.html#run')
document.getElementById('dash').onclick = () => open('dashboard.html')
document.getElementById('profile').onclick = () => open('profile.html')

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

const recs = Object.values(tracker)
const c = meta?.counts ?? {}
document.getElementById('stats').append(
  h('span', { class: 'muted' }, 'Last run'), h('b', {}, meta ? fmtDate(meta.at) : 'never'),
  h('span', { class: 'muted' }, 'Strong / good matches'), h('b', {}, meta ? `${c.strong ?? 0} / ${c.good ?? 0}` : '—'),
  h('span', { class: 'muted' }, 'Applied'), h('b', {}, recs.filter((r) => ['applied', 'interviewing', 'offer'].includes(r.status)).length),
  h('span', { class: 'muted' }, 'Being prepared'), h('b', {}, recs.filter((r) => ['shortlisted', 'preparing'].includes(r.status)).length),
)
