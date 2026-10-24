// A tiny DOM helper for the extension pages. Text is always set with textContent: job postings come from
// other sites, so nothing from them is ever inserted as HTML.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'style') el.style.cssText = v
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v)
    else if (k === 'value') el.value = v
    else if (k === 'checked') el.checked = Boolean(v)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
  return el
}

export function toast(message, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, message)
  document.body.append(t)
  setTimeout(() => t.remove(), ms)
}

export function download(fileName, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = h('a', { href: url, download: fileName })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const TYPE_LABEL = { full_time: 'Full-time', internship: 'Internship', contract: 'Contract', part_time: 'Part-time' }
export const STATUS_LABEL = { shortlisted: 'Shortlisted', preparing: 'Preparing', applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn', not_applying: 'Not applying' }
