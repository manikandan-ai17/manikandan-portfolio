// Answers to written application questions ("Tell us about yourself", "Why us?", …), from verified facts only.
//
//   classifyQuestion(text) → what kind of question it is, and whether the assistant may draft it at all
//   templateAnswer(...)    → a draft built from your profile and the job (no AI, no key)
//   aiAnswer(...)          → Claude drafts it from the same facts, with your own key (optional)
//   checkAnswer(...)       → skills your profile does not show, numbers it does not contain, [asks] left open
//
// Anything only you can say (why you personally want this company, salary, a weakness …) is never invented:
// the draft contains a [bracketed ask] and cannot be approved until you replace it.

import { SKILLS } from './profile.js'
import { checkLetter } from './coverLetter.js'
import { aiConfig, geminiGenerate } from './ai.js'

// ── What kind of question is it? ────────────────────────────────────────────

export const KINDS = {
  about_you: 'Tell us about yourself',
  why_company: 'Why this company',
  why_role: 'Why this role / why you are a good fit',
  impactful_project: 'Most impactful project',
  technical_example: 'A technical problem you solved',
  ai_usage: 'How you use AI tools',
  personal: 'Personal — only you can answer',
  fact: 'A fact about you',
  sensitive: 'Sensitive — answer yourself',
  open: 'Other written question',
}

const SENSITIVE = /authori[sz]|sponsor|visa\b|citizen|immigra|gender|race\b|ethnic|veteran|disab|pronoun|sexual|criminal|convict|arbitrat|agreement|acknowledg|consent|declar|signature|clearance/i

export function classifyQuestion(q) {
  const s = String(q ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return 'open'
  if (SENSITIVE.test(s)) return 'sensitive'
  if (/salary|compensation|pay expectation|expected (pay|ctc)|\bctc\b|notice period|start date|earliest .*start|when can you start|relocat|willing to (travel|work)|hours|availability|referr|how did you hear|phone|address/i.test(s)) return 'fact'
  if (/weakness|failure|mistake|conflict|disagree|hobb|outside of work|fun fact|personal|values? (matter|important)|five years|5 years|where do you see/i.test(s)) return 'personal'
  if (/tell (us|me) (a bit |a little )?about (yourself|you)\b|introduce yourself|^about (you|yourself)|your background|describe yourself|who are you/i.test(s)) return 'about_you'
  if (/(most |a )?(impactful|proud|significant|meaningful|interesting|favou?rite|best) (project|work|thing you('ve| have) built)|project (you are|you're) (most )?proud|tell us about (a|one) project|something you('ve| have) built/i.test(s)) return 'impactful_project'
  if (/(good|great|strong|right) fit|why (should we|would we) hire|what makes you (qualified|a good|the right)|why (this|the) role|why are you (interested in|applying (for|to)) (this|the) (role|position)|relevant experience|qualif/i.test(s)) return 'why_role'
  if (/why .*(join|work (at|for|with|here)|interested in|excite|apply(ing)? (to|at))|why (us|[A-Z][\w.&-]+\??$)|what (draws|attracts|excites) you|motivat/i.test(s)) return 'why_company'
  if (/technical (problem|challenge)|hard(est)? (bug|problem)|difficult (problem|technical)|debug|challenge you (faced|solved)/i.test(s)) return 'technical_example'
  if (/ai tools?|llm|copilot|chatgpt|claude|cursor|how do you use ai|ai workflow/i.test(s)) return 'ai_usage'
  return 'open'
}

/** Kinds the template can draft fully from your profile (the rest need AI drafting or you). */
export const TEMPLATE_KINDS = new Set(['about_you', 'why_company', 'why_role', 'impactful_project', 'technical_example'])

// ── Pieces of your verified profile ─────────────────────────────────────────

const lcFirst = (s) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)
const firstSentence = (s) => String(s ?? '').split(/(?<=[.!?])\s/)[0].trim().replace(/\.$/, '')
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
const partial = (p) => /partial|reassigned/i.test(p.status ?? '')
const article = (w) => (/^(?:[aeiou]|AI\b|LLM)/i.test(w) ? 'an' : 'a')
/** "Analyses PDFs …" → "It analyses PDFs …"; "Web tool that …" → "It's a web tool that …". */
const itIs = (summary) => {
  const s = firstSentence(summary)
  return /^[A-Z][a-z]+s\b/.test(s) && !/^(Analysis|Tools)\b/.test(s) ? `It ${lcFirst(s)}.` : `It's ${article(s)} ${lcFirst(s)}.`
}
/** A short description for mid-sentence use: "which analyses …" or "a web tool that …", cut at a word boundary. */
const short = (summary) => {
  let s = firstSentence(summary).split(/:|\s[—–]\s/)[0]
  if (s.length > 100) {
    const cut = Math.max(...[', ', ' and ', ' by ', ' with '].map((sep) => s.lastIndexOf(sep, 100)))
    s = cut > 40 ? s.slice(0, cut) : s.slice(0, s.lastIndexOf(' ', 100))
  }
  return /^[A-Z][a-z]+s\b/.test(s) ? `which ${lcFirst(s)}` : `${article(s)} ${lcFirst(s)}`
}
/** "Designing, building … at Acme." → "I'm designing, building …" (the company is said separately). */
const doing = (e) => {
  const s = firstSentence(e.summary).replace(new RegExp(`\\s+at ${e.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
  return /^[A-Z][a-z]+ing\b/.test(s) ? `I'm ${lcFirst(s)}` : `I work on ${lcFirst(s)}`
}

/** Your projects ranked for this job: most matched skills first, finished work before partial work. */
function rankedProjects(profile, match) {
  const skills = (match?.matched ?? []).map((m) => SKILLS.find((s) => s.name === m.skill)).filter(Boolean)
  return (profile.projects ?? [])
    .map((p) => ({ p, hits: skills.filter((s) => (s.own ?? s.re).test([p.summary, ...(p.bullets ?? []), ...(p.tech ?? [])].join(' '))).length }))
    .sort((a, b) => Number(partial(a.p)) - Number(partial(b.p)) || b.hits - a.hits)
    .map((x) => x.p)
}

/** One or two duties from the posting that match work you have done (quoted, shortened). */
function matchingDuties(job, match, n = 2) {
  const skills = (match?.matched ?? []).filter((m) => m.required).map((m) => SKILLS.find((s) => s.name === m.skill)).filter(Boolean)
  const lines = String(job?.description ?? '')
    .split(/\n|•/)
    .map((l) => l.replace(/^[\s\-–•*]+/, '').trim())
    .filter((l) => l.length > 25 && l.length < 220 && !/years|degree|equal opportunity|salary|benefit|visa|apply/i.test(l))
  return lines
    .map((l) => ({ l, hits: skills.filter((s) => s.re.test(l)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, n)
    .map((x) => lcFirst(x.l.replace(/[.;:]$/, '')))
}

const ASK = (what) => `[${what}]`

// ── Template drafts ─────────────────────────────────────────────────────────

/**
 * A first draft for one question from verified facts. Returns { text, kind, source: 'template' } or null when
 * the question is not one the template can answer (then use AI drafting, or write it yourself).
 */
export function templateAnswer(question, { profile, job, match }) {
  const kind = classifyQuestion(question)
  const mine = profile.myWords ?? {}
  const edu = profile.education?.[0]
  const [current, ...earlier] = profile.experience ?? []
  const projects = rankedProjects(profile, match)
  const proSkills = (match?.matched ?? []).filter((m) => m.level === 'professional' && m.required).map((m) => m.skill)
  const company = job?.company ?? 'your company'
  const role = job?.title ?? 'this role'
  let text = null

  if (kind === 'about_you') {
    // Oldest first, as people tell it: "I started as …, then …, and now I'm …".
    const role = (e) => e.title.replace(/\s*·\s*Internship/i, ' intern')
    const chrono = [...earlier].reverse() // oldest first
    const steps = chrono.map((e, i) => {
      const sameCompany = i > 0 && chrono[i - 1].company === e.company
      return `${i === 0 ? 'I started as' : 'then joined as'} ${article(role(e))} ${role(e)}${sameCompany ? '' : ` at ${e.company}`} (${e.dates})`
    })
    const sameAsLast = chrono.at(-1)?.company === current?.company
    const path = current ? (steps.length ? `${steps.join(', ')}, and now I'm ${article(current.title)} ${current.title}${sameAsLast ? ' there' : ` at ${current.company}`}.` : `I work as ${article(current.title)} ${current.title} at ${current.company}.`) : ''
    const top = projects.slice(0, 2)
    text = [
      `I'm a software engineer early in my career${profile.city ? `, based in ${profile.city}` : ''}. I finished my ${edu?.degree ?? 'degree'} at ${edu?.school ?? ''} in ${edu?.end ?? ''}.`.replace(/ at  in /, ' in '),
      path.replace(/^then/, 'Then'),
      top.length ? `Most of what I build is LLM-integrated software in Python and TypeScript, for example ${top.map((p) => `the ${p.name}, ${short(p.summary)}`).join('; and ')}.` : '',
      mine.aboutMe ? mine.aboutMe.trim() : '',
    ].filter(Boolean).join(' ')
  }

  if (kind === 'impactful_project') {
    const p = projects[0]
    if (p) {
      text = [
        `The project I'm proudest of is the ${p.name}.`,
        itIs(p.summary),
        (p.bullets ?? []).length ? `Some details: ${p.bullets.slice(0, 3).map(lcFirst).join('; ')}.` : '',
        partial(p) ? `To be clear about my part: ${lcFirst(p.status)}.` : /private/i.test(p.status ?? '') ? `It's company code, so I can walk through the design but not share the source.` : p.github ? `The code is public: ${p.github}.` : '',
        mine.proudestWhy ? mine.proudestWhy.trim() : ASK('one or two sentences on why it mattered to you or what you learned'),
      ].filter(Boolean).join(' ')
    }
  }

  if (kind === 'why_role') {
    const duties = matchingDuties(job, match)
    const p = projects[0]
    text = [
      duties.length ? `The parts of this role I'd be strongest at are the ones I already do: ${duties.map((d) => `“${d}”`).join(' and ')}.` : `This ${role} role lines up with the work I do now.`,
      current ? `At ${current.company} ${doing(current)}${proSkills.length ? `, mostly with ${list(proSkills.slice(0, 4))}` : ''}.` : '',
      p ? `The closest example is the ${p.name}. ${itIs(p.summary)}` : '',
      `I have about ${profile.eligibility?.yearsExperience ?? 1} year of professional experience, so I'd still be growing into parts of the job, but the core of it is work I've shipped.`,
    ].filter(Boolean).join(' ')
  }

  if (kind === 'why_company') {
    const duties = matchingDuties(job, match, 1)
    // With your own words about what you want, the answer connects them to this posting's own text — no invented
    // admiration for the company. Without them, it asks you.
    text = [
      mine.lookingFor ? mine.lookingFor.trim() : '',
      mine.lookingFor && duties.length ? `That is why this ${role} role at ${company} stands out to me: the posting asks for “${duties[0]}”, which is close to my work on the ${projects[0]?.name ?? 'projects in my portfolio'}.` : '',
      mine.lookingFor && !duties.length ? `This ${role} role at ${company} is the kind of work I want to grow in.` : '',
      mine.lookingFor ? '' : ASK(`your own reason for wanting to work at ${company} — something specific you know or care about`),
      !mine.lookingFor && duties.length ? `The role also matches what I've been doing: “${duties[0]}” is close to my work on the ${projects[0]?.name ?? 'projects in my portfolio'}.` : '',
    ].filter(Boolean).join(' ')
  }

  if (kind === 'technical_example') {
    const cad = (profile.projects ?? []).find((p) => /cad/i.test(p.name)) ?? projects[0]
    if (cad) {
      text = [
        `One problem I spent a lot of time on was in the ${cad.name}. ${itIs(cad.summary)}`,
        (cad.bullets ?? []).length ? `How I approached it: ${cad.bullets.slice(0, 3).map(lcFirst).join('; ')}.` : '',
        ASK('the specific problem you hit, what you tried, and what you would do differently'),
      ].filter(Boolean).join(' ')
    }
  }

  return text ? { kind, source: 'template', text: text.replace(/\s+/g, ' ').trim() } : null
}

// ── Checks ──────────────────────────────────────────────────────────────────

const OUTCOME_CLAIM = /\b(directly )?(impact(s|ed|ing)?|improv(e|es|ed|ing)|reduc(e|es|ed|ing)|increas(e|es|ed|ing)|boost(s|ed|ing)?|sav(e|es|ed|ing))\b[^.]{0,50}\b(clients?|customers?|users?|business|revenue|efficiency|productivity|data quality|cost|time)\b|\b(unique|innovative|world-class|state-of-the-art|best-in-class)\b|\bensures? (accuracy|quality|reliability)\b/i
const STOCK_PHRASES =/\b(passionate about|leverag(e|ing)|synerg|cutting[- ]edge|thrive in fast-paced|dynamic environment|i am excited to apply|results-driven|go-getter|team player|think outside the box|deep dive|spearhead)/i

/** Problems a human should look at before approving an answer. `blocking` ones prevent approval. */
export function checkAnswer(text, profile, { maxLength } = {}) {
  const issues = checkLetter(text, profile).map((t) => ({ text: t, blocking: false }))
  const asks = [...String(text).matchAll(/\[[^\]]{3,}\]/g)].map((m) => m[0])
  if (asks.length) issues.unshift({ text: `Replace ${asks.length === 1 ? 'the bracketed part' : `${asks.length} bracketed parts`} with your own words: ${asks.join(' ')}`, blocking: true })
  const stock = STOCK_PHRASES.exec(text)
  if (stock) issues.push({ text: `“${stock[0]}” sounds generic — say it in your own words`, blocking: false })
  // Outcomes and superlatives are the claims a model most often adds on its own. Only keep them if your profile says so.
  const outcome = OUTCOME_CLAIM.exec(text)
  if (outcome) issues.push({ text: `“${outcome[0].slice(0, 60)}” claims an outcome or impact your profile does not state — remove it unless it is true and you can back it up`, blocking: false })
  if (maxLength && text.length > maxLength) issues.push({ text: `${text.length} characters; this field allows ${maxLength}`, blocking: true })
  return issues
}

// ── AI drafts (optional, your own key) ──────────────────────────────────────

const SYSTEM = `You draft answers to job-application questions for one applicant, from facts they have verified.
Strict rules:
- Use only facts in PROFILE and the applicant's own words in MY_WORDS. Never invent employers, titles, dates, numbers, metrics, technologies, achievements, opinions or motivations.
- Say a technology was used at work only if it appears in an EXPERIENCE entry; project-only technologies are "in a project"; EDUCATION notes are coursework.
- Projects marked private, partial or reassigned must be described with that status.
- Describe what was built and what it does, not what it achieved. Never claim impact, results, savings, improvements or benefits to clients, users or the business unless PROFILE states that exact outcome. Do not call anything "unique", "innovative" or "best".
- "Why this company / role" questions: when MY_WORDS.lookingFor is set, use it as the reason and connect it to concrete items quoted from the JOB DESCRIPTION and matching PROFILE facts. Do not claim knowledge of, or admiration for, the company beyond what the JOB DESCRIPTION says.
- If the question needs something PROFILE and MY_WORDS do not contain (a personal reason, an opinion, a story, a number), write it as a short ask in square brackets, e.g. [what drew you to this company], instead of making it up.
- Sound like a person: first person, plain words, specific details from PROFILE, varied sentences. No buzzwords ("passionate", "leverage", "synergy", "cutting-edge", "fast-paced"), no flattery of the company, no restating the question, no sign-off.
- Plain text only. Stay within the word limit.`

/** The chosen AI (Gemini or Claude) drafts one answer; returns { text, kind, source: 'ai', model }. Errors are readable. */
export async function aiAnswer({ question, profile, job, match, apiKey, model, provider = 'anthropic', maxWords = 150, Anthropic, fetchFn }) {
  if (!apiKey) throw new Error('Add an AI key (Gemini or Anthropic) in Profile → AI drafting to draft this one.')
  const kind = classifyQuestion(question)
  const facts = {
    name: profile.fullName,
    city: profile.city || null,
    years_of_experience: profile.eligibility?.yearsExperience,
    EDUCATION: profile.education,
    EXPERIENCE: profile.experience,
    PROJECTS: profile.projects,
    SKILL_GROUPS: profile.skillGroups,
    GITHUB: profile.github?.repos ?? [],
    LINKEDIN_POSITIONS: profile.linkedin?.positions ?? [],
  }
  const user = [
    `QUESTION (${KINDS[kind]}): ${question}`,
    `WORD LIMIT: ${maxWords}`,
    `JOB: ${job?.title ?? 'unknown'} at ${job?.company ?? 'unknown'}`,
    `MATCHES (from the assistant's check): ${(match?.matched ?? []).map((m) => `${m.skill} [${m.level}: ${m.where}]`).join('; ') || 'nothing specific'}`,
    `GAPS (do not claim these): ${(match?.gaps ?? []).map((g) => g.skill).join(', ') || 'none found'}`,
    `MY_WORDS: ${JSON.stringify(profile.myWords ?? {})}`,
    `PROFILE:\n${JSON.stringify(facts, null, 1)}`,
    `JOB DESCRIPTION:\n${job?.description ?? '(not available)'}`,
  ].join('\n\n')
  if (provider === 'gemini') {
    const out = await geminiGenerate({ apiKey, model, system: SYSTEM, user, fetchFn })
    return { kind, source: 'ai', model: out.model, text: out.text }
  }
  const SDK = Anthropic ?? (await import('../vendor/anthropic-sdk.js')).Anthropic
  const client = new SDK({ apiKey, dangerouslyAllowBrowser: true })
  let res
  try {
    res = await client.beta.messages.create({
      model: model || 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: user }],
    })
  } catch (err) {
    if (err instanceof SDK.AuthenticationError) throw new Error('The Anthropic API key was refused. Check it in Profile → AI drafting.')
    if (err instanceof SDK.RateLimitError) throw new Error('Anthropic rate limit reached — try again in a minute.')
    if (err instanceof SDK.APIError) throw new Error(`Anthropic API error ${err.status ?? ''}: ${err.message}`)
    throw new Error(`Could not reach the Anthropic API: ${err?.message ?? err}`)
  }
  if (res.stop_reason === 'refusal') throw new Error('Claude declined to draft this answer. Write it yourself or rephrase the question.')
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  if (!text) throw new Error('The answer had no text. Try again.')
  return { kind, source: 'ai', model: res.model, text }
}

/**
 * The best draft for a question: personal/fact/sensitive questions are never drafted; the template is used
 * when it covers the question (or no key is set); otherwise Claude drafts it. Always returns issues.
 */
export async function draftAnswer(question, ctx) {
  const kind = classifyQuestion(question)
  const base = { question, kind }
  if (kind === 'sensitive') return { ...base, text: '', source: 'none', note: 'Answer this yourself — the assistant never answers authorization, legal or demographic questions.', issues: [] }
  if (kind === 'fact') {
    const e = ctx.profile.eligibility ?? {}
    const known = /notice/i.test(question) ? e.noticePeriod : /start/i.test(question) ? e.earliestStart : /salary|compensation|pay|ctc/i.test(question) ? ctx.profile.myWords?.salaryExpectation : null
    return known ? { ...base, text: known, source: 'profile', issues: [] } : { ...base, text: '', source: 'none', note: 'Your profile does not have this — type your answer (you can save it to your profile).', needs: true, issues: [] }
  }
  const ai = aiConfig(ctx.settings)
  if (kind === 'personal' && !ai) return { ...base, text: '', source: 'none', note: 'Only you can answer this one.', needs: true, issues: [] }
  const useAi = ai && (ctx.settings.aiAnswers !== false) && (!TEMPLATE_KINDS.has(kind) || ctx.preferAi)
  let draft = !useAi ? templateAnswer(question, ctx) : null
  if (!draft && ai) {
    try {
      draft = await aiAnswer({ question, ...ctx, apiKey: ai.apiKey, model: ai.model, provider: ai.provider, maxWords: ctx.maxWords })
    } catch (err) {
      // The AI is unreachable or refused (rate limit, outage): the answer built from your profile still stands.
      draft = TEMPLATE_KINDS.has(kind) ? templateAnswer(question, ctx) : null
      if (!draft) throw err
    }
  }
  if (!draft) return { ...base, text: '', source: 'none', note: 'Write this in your own words (or add a Gemini or Anthropic key in Profile for AI drafts).', needs: true, issues: [] }
  return { ...base, ...draft, issues: checkAnswer(draft.text, ctx.profile, { maxLength: ctx.maxLength }) }
}

/** The standard questions prepared on the dashboard for every role. */
export const COMMON_QUESTIONS = ['Tell us about yourself.', 'Why do you want to join {company}?', 'What is your most impactful project?', 'Why are you a good fit for this role?']
