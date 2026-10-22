// Public data you already publish: your GitHub repositories and the resume PDF on your portfolio.

export async function fetchGitHubRepos(profileUrl, fetchFn = fetch) {
  const user = /github\.com\/([^/?#]+)/i.exec(profileUrl ?? '')?.[1]
  if (!user) throw new Error('No GitHub profile link in your profile.')
  const res = await fetchFn(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub answered HTTP ${res.status}`)
  const repos = await res.json()
  return {
    fetchedAt: new Date().toISOString(),
    user,
    repos: repos
      .filter((r) => !r.fork && !r.archived)
      .map((r) => ({ name: r.name, description: r.description ?? '', language: r.language ?? null, topics: r.topics ?? [], url: r.html_url, updatedAt: r.pushed_at ?? r.updated_at })),
  }
}

export function bytesToBase64(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function base64ToBytes(b64) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

/** The resume PDF published on your portfolio, as a stored resume version. */
export async function fetchPortfolioResume(url, fetchFn = fetch) {
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`The portfolio resume answered HTTP ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== '%PDF') throw new Error('The portfolio resume link did not return a PDF.')
  return { id: `portfolio-${Date.now()}`, label: 'General (portfolio resume)', fileName: url.split('/').pop(), mime: 'application/pdf', dataB64: bytesToBase64(bytes), addedAt: new Date().toISOString(), source: url }
}
