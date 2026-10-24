// "Questions for you": answers you give once, reused on every later form. Factual answers apply to all companies;
// written answers ("Why this company?") are kept per company. The keys match src/content/autorun.js exactly.

export const normQ = (s) => String(s ?? '').toLowerCase().replace(/[*✱]/g, ' ').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
export const normCo = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
export const bankKey = (label, company, scope) => (scope === 'company' ? `${normCo(company)}|${normQ(label)}` : normQ(label))

/** Adds a run's unanswered questions to the pending list, once each, remembering which jobs asked them. */
export function mergePending(pending, questions, jobKey) {
  const next = { ...(pending ?? {}) }
  for (const q of questions ?? []) {
    const prev = next[q.key]
    next[q.key] = { ...q, jobs: [...new Set([...(prev?.jobs ?? []), jobKey])], askedAt: prev?.askedAt ?? new Date().toISOString() }
  }
  return next
}

/** Saves your answer and removes the question from the pending list. */
export function answerQuestion({ bank, pending }, key, answer) {
  const q = pending?.[key]
  const nextBank = { ...(bank ?? {}), [key]: { answer: String(answer).trim(), label: q?.label ?? key, company: q?.scope === 'company' ? q.company : null, savedAt: new Date().toISOString() } }
  const nextPending = { ...(pending ?? {}) }
  delete nextPending[key]
  return { bank: nextBank, pending: nextPending }
}
