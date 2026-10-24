// One "Run": read every enabled job board, keep the engineering roles, score each against your profile.

import { fetchSource, sourceId } from './sources.js'
import { isRelevantTitle, isWorthDetail, scoreJob } from './match.js'
import { skillEvidence } from './profile.js'

const KEEP_FULL = new Set(['strong', 'good', 'stretch'])

export async function runSearch({ sources, profile, fetchFn = fetch, onProgress = () => {}, now = new Date() }) {
  const evidence = skillEvidence(profile)
  const enabled = sources.filter((s) => s.enabled !== false)
  const jobs = {}
  const perSource = []
  for (const [i, src] of enabled.entries()) {
    onProgress({ step: i + 1, total: enabled.length, company: src.company })
    const started = Date.now()
    try {
      // keepTitle only matters for Workday (one call per job): senior titles are not fetched there.
      const all = await fetchSource(src, { fetchFn, keepTitle: isWorthDetail })
      let relevant = 0
      for (const job of all) {
        if (!isRelevantTitle(job.title)) continue
        relevant++
        const match = scoreJob(job, profile, evidence)
        // Blocked and low matches keep a short description (enough to show why); good ones keep all of it.
        const description = KEEP_FULL.has(match.verdict) ? job.description : job.description.slice(0, 1500)
        jobs[job.key] = { ...job, description, match, foundAt: now.toISOString() }
      }
      perSource.push({ id: sourceId(src), company: src.company, total: all.length, relevant, ms: Date.now() - started, error: null })
    } catch (err) {
      perSource.push({ id: sourceId(src), company: src.company, total: 0, relevant: 0, ms: Date.now() - started, error: String(err?.message ?? err) })
    }
  }
  const counts = {}
  for (const j of Object.values(jobs)) counts[j.match.verdict] = (counts[j.match.verdict] ?? 0) + 1
  return { jobs, meta: { at: now.toISOString(), perSource, counts } }
}
