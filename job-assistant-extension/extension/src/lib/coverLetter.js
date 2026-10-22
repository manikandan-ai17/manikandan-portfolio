// Cover letters from verified facts only. Two ways:
//   template — assembled from your profile and the match (no AI, no key)
//   AI draft — Claude writes it from the same facts, with your own API key; then checked like the template
// Every letter is checked for skills your profile does not show and numbers it does not contain, and you
// edit and approve it before it is used anywhere.

import { SKILLS, skillEvidence } from './profile.js'

const firstSentence = (s) => String(s ?? '').split(/(?<=[.!?])\s/)[0].trim()
// Lowercase the first letter for use mid-sentence — but not acronyms ("AI-assisted", "LLM", "CAD").
const lc = (s) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)
// Finished work you can show first; partial or reassigned work after it (it is still described as such).
const statusRank = (status) => (/partial|reassigned/i.test(status ?? '') ? 1 : 0)

/** Experience and project items ranked by how many of the job's matched skills they show. */
function relevantItems(profile, match) {
  const skills = (match?.matched ?? []).map((m) => SKILLS.find((s) => s.name === m.skill)).filter(Boolean)
  const items = [
    ...(profile.experience ?? []).map((e) => ({ kind: 'role', label: `${e.title} at ${e.company}`, text: [e.summary, ...(e.bullets ?? []), ...(e.tech ?? [])].join(' '), line: firstSentence(e.summary) })),
    ...(profile.projects ?? []).map((p) => ({ kind: 'project', label: p.name, rank: statusRank(p.status), text: [p.summary, ...(p.bullets ?? []), ...(p.tech ?? [])].join(' '), line: `${p.name} (${p.status}): ${lc(firstSentence(p.summary))}` })),
  ]
  for (const it of items) it.hits = skills.filter((s) => (s.own ?? s.re).test(it.text)).length
  return items.filter((i) => i.hits > 0).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || b.hits - a.hits)
}

export function templateCoverLetter(profile, job, match) {
  const edu = profile.education?.[0]
  const current = profile.experience?.[0]
  const items = relevantItems(profile, match).filter((i) => i.kind === 'project').slice(0, 3)
  const pro = (match?.matched ?? []).filter((m) => m.level === 'professional').map((m) => m.skill)
  const proj = (match?.matched ?? []).filter((m) => m.level === 'project').map((m) => m.skill)
  const lines = [
    `Dear ${job.company} hiring team,`,
    '',
    `I am applying for the ${job.title} role. I am an early-career software engineer${edu ? ` with a ${edu.degree} from ${edu.school} (${edu.end})` : ''}${current ? `, currently working as a ${current.title} at ${current.company}` : ''}.${current?.summary ? ` My work there: ${lc(firstSentence(current.summary)).replace(new RegExp(`\\s+at ${current.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\.?$)`), '')}` : ''}`.trim(),
  ]
  if (items.length) {
    lines.push('', 'Work most relevant to this role:')
    for (const it of items) lines.push(`• ${it.line}`)
  }
  if (pro.length || proj.length) {
    lines.push('', [pro.length ? `In my work I use ${pro.slice(0, 6).join(', ')}` : '', proj.length ? `${pro.length ? '; in my projects, ' : 'In my projects I have used '}${proj.slice(0, 4).join(', ')}` : ''].join('') + '.')
  }
  lines.push('', `My portfolio (${profile.links?.portfolio}) and GitHub (${profile.links?.github}) show each project with its real status and limitations.`, '', 'Thank you for considering my application.', '', profile.fullName, [profile.email, profile.phone].filter(Boolean).join(' · '))
  return lines.join('\n')
}

/** Skills a letter mentions that your profile does not show, and numbers your profile does not contain. */
export function checkLetter(letter, profile) {
  const evidence = skillEvidence(profile)
  const issues = []
  for (const s of SKILLS) {
    if (!s.re.test(letter)) continue
    const ev = evidence.get(s.name)
    if (!ev) issues.push(`Mentions ${s.name}, which your profile does not show`)
    else if (ev.level === 'education' || ev.level === 'linkedin') issues.push(`Mentions ${s.name}; your profile shows it only from ${ev.level === 'education' ? 'coursework' : 'your LinkedIn skills list'} — do not present it as work experience`)
  }
  const profileText = JSON.stringify(profile)
  for (const n of new Set(letter.match(/\b\d[\d,.]*\+?%?/g) ?? [])) {
    const bare = n.replace(/[+%]$/, '').replace(/[.,]+$/, '')
    if (!bare || profileText.includes(bare)) continue
    issues.push(`Contains the number "${n}", which is not in your profile`)
  }
  return issues
}

// ── AI draft (optional) ─────────────────────────────────────────────────────

const SYSTEM = `You write cover letters for one applicant from facts they have verified.
Rules — they are strict:
- Use only facts in PROFILE. Do not invent employers, titles, dates, metrics, numbers, technologies, achievements or project details.
- Say a technology was used at work only if it appears in an EXPERIENCE entry; technologies that appear only in projects are "in a project".
- Courses (EDUCATION notes) are not work experience.
- If the job asks for something PROFILE does not show, do not claim it. You may say the applicant is keen to learn it, at most once.
- Projects marked private, partial or reassigned must be described with that status, as PROFILE states it.
- Plain text, no markdown, at most 300 words. Start with "Dear <Company> hiring team," and end with the applicant's name and email.`

function factsFor(profile) {
  return {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone || null,
    links: profile.links,
    EDUCATION: profile.education,
    EXPERIENCE: profile.experience,
    PROJECTS: profile.projects,
    SKILL_GROUPS: profile.skillGroups,
    years_of_experience: profile.eligibility?.yearsExperience,
  }
}

/**
 * Asks Claude for a draft. `apiKey` is yours and stays in this browser (chrome.storage.local); requests go
 * straight to api.anthropic.com. Returns { text, model, issues } or throws an Error with a readable message.
 */
export async function aiCoverLetter({ profile, job, match, apiKey, model = 'claude-opus-5-5' }) {
  if (!apiKey) throw new Error('Add your Anthropic API key in Profile → AI drafting first.')
  const { Anthropic } = await import('../vendor/anthropic-sdk.js')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const user = [
    `PROFILE:\n${JSON.stringify(factsFor(profile), null, 1)}`,
    `JOB: ${job.title} at ${job.company} (${(job.locations ?? []).join(' · ')})`,
    `WHAT MATCHES (from the assistant's check): ${(match?.matched ?? []).map((m) => `${m.skill} [${m.level}: ${m.where}]`).join('; ') || 'nothing specific'}`,
    `GAPS (do not claim these): ${(match?.gaps ?? []).map((g) => g.skill).join(', ') || 'none found'}`,
    `JOB DESCRIPTION:\n${job.description}`,
    'Write the cover letter now.',
  ].join('\n\n')
  let res
  try {
    res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // If Claude declines, the API retries on Anthropic's recommended fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('The Anthropic API key was refused. Check it in Profile → AI drafting.')
    if (err instanceof Anthropic.RateLimitError) throw new Error('Anthropic rate limit reached — try again in a minute.')
    if (err instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${err.status ?? ''}: ${err.message}`)
    throw new Error(`Could not reach the Anthropic API: ${err?.message ?? err}`)
  }
  if (res.stop_reason === 'refusal') throw new Error('Claude declined to write this letter. Use the template instead.')
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  if (!text) throw new Error('The answer had no text. Try again or use the template.')
  return { text, model: res.model, truncated: res.stop_reason === 'max_tokens', issues: checkLetter(text, profile) }
}
