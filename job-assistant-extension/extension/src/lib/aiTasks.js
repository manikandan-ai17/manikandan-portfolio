// Context-aware decisions with Gemini, each with a guard the code checks itself:
//   aiFit     — should you apply to this job at all? (judged only on your profile facts and the posting)
//   aiChoice  — an unusual multiple-choice question, answered ONLY when the model quotes the profile text that
//               supports the answer and that quote really is in your profile. Otherwise: ask you.

import { aiConfig, geminiGenerate } from './ai.js'

const FIT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    decision: { type: 'STRING', enum: ['apply', 'skip'] },
    fit: { type: 'STRING', enum: ['strong', 'good', 'weak'] },
    reasons: { type: 'ARRAY', items: { type: 'STRING' } },
    blockers: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['decision', 'fit', 'reasons', 'blockers'],
}

const FIT_SYSTEM = `You decide whether ONE early-career applicant should apply to ONE job. Be strict and honest; a wasted application hurts them.
Use only the PROFILE facts and the JOB text. Never assume skills, years, degrees or permissions the PROFILE does not state.
Say "skip" when any hard requirement is clearly not met, for example:
- more years of experience required than the applicant has (they have the years stated in PROFILE);
- a degree level they do not hold (e.g. PhD, Master's) stated as required;
- a language they do not speak stated as required;
- on-site work in a country where they are not authorized, when the posting does not offer visa sponsorship or relocation help — or the posting is US/EU-only remote and they live elsewhere;
- a senior, staff, lead or manager role; a non-engineering role; a role unrelated to their goals in MY_GOALS.
Say "apply" only when the core requirements are backed by PROFILE facts. "weak" fit means apply is not worth it.
reasons: at most 3 short points, each naming the PROFILE fact and the JOB requirement it meets.
blockers: the unmet hard requirements, quoting the JOB text briefly. Empty when none.`

function facts(profile) {
  return {
    years_of_professional_experience: profile.eligibility?.yearsExperience,
    graduation_year: profile.eligibility?.graduationYear,
    lives_in: [profile.city, profile.country].filter(Boolean).join(', ') || null,
    authorized_to_work_in: profile.eligibility?.authorizedCountries ?? [],
    needs_visa_sponsorship_elsewhere: profile.eligibility?.needsSponsorshipElsewhere,
    open_to_relocate: profile.eligibility?.openToRelocate,
    languages: (profile.eligibility?.languages ?? []).map((l) => l.name),
    education: profile.education,
    experience: profile.experience,
    projects: profile.projects,
    skill_groups: profile.skillGroups,
  }
}

/** { decision, fit, reasons, blockers, model } — or null when no Gemini key is set (the rule-based match then stands). */
export async function aiFit({ job, profile, match, settings, fetchFn }) {
  const cfg = aiConfig(settings)
  if (!cfg || cfg.provider !== 'gemini') return null
  const user = [
    `PROFILE:\n${JSON.stringify(facts(profile), null, 1)}`,
    `MY_GOALS: ${profile.myWords?.lookingFor || '(not stated) — early-career software / AI engineering roles'}`,
    `RULE-BASED CHECK: ${match?.verdict ?? '?'} ${match?.score ?? ''}/100. Skills shown: ${(match?.matched ?? []).map((m) => m.skill).join(', ') || 'none'}. Gaps: ${(match?.gaps ?? []).map((g) => g.skill).join(', ') || 'none'}. Warnings: ${(match?.warnings ?? []).map((w) => w.text ?? w).join('; ') || 'none'}.`,
    `JOB: ${job.title} at ${job.company}. Location: ${(job.locations ?? []).join('; ') || 'not stated'}${job.remote ? ' (remote)' : ''}. Type: ${job.employmentType ?? 'not stated'}.`,
    `JOB TEXT:\n${String(job.description ?? '').slice(0, 9000)}`,
  ].join('\n\n')
  const out = await geminiGenerate({ apiKey: cfg.apiKey, model: cfg.model, system: FIT_SYSTEM, user, schema: FIT_SCHEMA, temperature: 0.1, maxOutputTokens: 8192, fetchFn })
  let r
  try { r = JSON.parse(out.text) } catch { return { decision: 'error', fit: 'weak', reasons: [], blockers: ['The AI fit check returned an unreadable answer; will retry next run'], model: out.model } }
  return { decision: r.decision, fit: r.fit, reasons: (r.reasons ?? []).slice(0, 3), blockers: (r.blockers ?? []).slice(0, 4), model: out.model }
}

export const fitAllowsApply = (r) => !r || (r.decision === 'apply' && r.fit !== 'weak')

// ── multiple-choice questions ───────────────────────────────────────────────

const CHOICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING', nullable: true },
    evidence: { type: 'STRING', nullable: true },
  },
  required: ['answer', 'evidence'],
}

const CHOICE_SYSTEM = `You answer ONE multiple-choice question on a job application for an applicant, ONLY when their PROFILE explicitly establishes the answer.
- "answer" must be exactly one of OPTIONS, copied character for character, or null.
- "evidence" must be a short exact quote (copied verbatim) from PROFILE that proves the answer, or null.
- If PROFILE does not explicitly establish the answer, return null for both. Do not infer from absence, do not guess, do not be generous.
- Never answer questions about legal agreements, background checks, demographics, disability, veteran status, security clearance, or criminal history: return null.`

const SKIP_TOPICS = /arbitrat|agreement|consent|background check|criminal|convict|gender|race|ethnic|hispanic|veteran|disab|clearance|citizenship|sexual|religio|pronoun/i
// Compare as plain words: JSON quotes, brackets and commas are not part of what the model is quoting.
const flat = (s) => String(s ?? '').toLowerCase().replace(/["'\[\]{}:,]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * { answer, evidence } when the answer is backed by a verbatim quote that really is in the profile;
 * null otherwise (the question then goes to "Questions for you").
 */
export async function aiChoice({ question, options, profile, job, settings, fetchFn }) {
  const cfg = aiConfig(settings)
  if (!cfg || cfg.provider !== 'gemini' || !options?.length || SKIP_TOPICS.test(question)) return null
  const profileText = JSON.stringify(facts(profile))
  const user = [`QUESTION: ${question}`, `OPTIONS: ${JSON.stringify(options)}`, `JOB: ${job?.title ?? ''} at ${job?.company ?? ''}`, `PROFILE:\n${profileText}`].join('\n\n')
  const out = await geminiGenerate({ apiKey: cfg.apiKey, model: cfg.model, system: CHOICE_SYSTEM, user, schema: CHOICE_SCHEMA, temperature: 0, maxOutputTokens: 4096, fetchFn })
  let r
  try { r = JSON.parse(out.text) } catch { return null }
  if (!r?.answer || !r?.evidence) return null
  if (!options.includes(r.answer)) return null
  const quote = flat(r.evidence)
  if (quote.length < 3 || !flat(profileText).includes(quote)) return null // the quote must really be in the profile
  // "3+ years of X" style questions: a yes needs the number itself in the evidence.
  const need = /(\d+)\s*\+?\s*(years|yrs)/i.exec(question)
  if (need && /^yes/i.test(r.answer) && !r.evidence.includes(need[1])) return null
  return { answer: r.answer, evidence: r.evidence }
}
