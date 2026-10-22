// Picks the stored resume that best fits a job, and says why. With one resume the choice is trivial; with several
// (e.g. "AI engineer — LLM focus", "Backend / full-stack") the labels are compared with the posting.

const words = (s) => String(s ?? '').toLowerCase().match(/[a-z][a-z+#.]{1,}/g) ?? []
const STOP = new Set(['the', 'and', 'for', 'with', 'resume', 'cv', 'version', 'engineer', 'developer', 'software', 'pdf'])

export function chooseResume(resumes, job) {
  if (!resumes?.length) return { resume: null, reason: 'No resume stored' }
  if (resumes.length === 1) return { resume: resumes[0], reason: 'Your only resume' }
  const jd = new Set(words(`${job.title} ${job.description ?? ''}`.slice(0, 6000)))
  const scored = resumes.map((r) => {
    const hits = [...new Set(words(`${r.label} ${r.fileName}`).filter((w) => !STOP.has(w) && jd.has(w)))]
    return { r, hits, score: hits.length + (r.isDefault ? 0.5 : 0) }
  }).sort((a, b) => b.score - a.score)
  const best = scored[0]
  return { resume: best.r, reason: best.hits.length ? `“${best.r.label}” matches the posting (${best.hits.slice(0, 4).join(', ')})` : `No version stands out for this posting; using your default “${best.r.label}”` }
}
