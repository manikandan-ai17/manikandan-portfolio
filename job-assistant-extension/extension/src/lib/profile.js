// The profile the assistant works from. Verified facts come from the portfolio (seedProfile.js), the LinkedIn
// data export and public GitHub repositories. Anything else (phone, work authorization, languages …) is asked
// of you and stays empty until you fill it in: the assistant never guesses it.

import { SEED_PROFILE } from './seedProfile.js'

export function defaultProfile() {
  const graduationYear = Number(SEED_PROFILE.education?.[0]?.end) || null
  return {
    ...structuredClone(SEED_PROFILE),
    phone: '',
    city: '',
    eligibility: {
      // Countries where you may work without a visa, e.g. ["India"]. Empty = not answered yet.
      authorizedCountries: [],
      needsSponsorshipElsewhere: null, // true | false | null (not answered)
      openToRelocate: null,
      languages: [], // e.g. [{ name: 'English', level: 'Professional' }]
      earliestStart: '',
      noticePeriod: '',
      // You stated about one year of experience and a B.Sc. completed in 2025.
      yearsExperience: 1,
      graduationYear,
      currentlyEnrolled: false,
    },
    preferences: { fullTime: true, internships: true, contract: false, minScore: 40 },
    // Your own words, used as written in answers (never rewritten into claims). All optional.
    myWords: { aboutMe: '', lookingFor: '', proudestWhy: '', salaryExpectation: '' },
    linkedin: null,
    github: null,
  }
}

/** The fields you enter yourself; everything else always comes from the portfolio seed (so a re-sync wins). */
export const USER_FIELDS = ['phone', 'city', 'eligibility', 'preferences', 'myWords', 'linkedin', 'github']

/** Your saved answers on top of the current verified profile. */
export function withDefaults(stored) {
  const d = defaultProfile()
  if (!stored) return d
  return {
    ...d,
    phone: stored.phone ?? d.phone,
    city: stored.city ?? d.city,
    eligibility: { ...d.eligibility, ...(stored.eligibility ?? {}) },
    preferences: { ...d.preferences, ...(stored.preferences ?? {}) },
    myWords: { ...d.myWords, ...(stored.myWords ?? {}) },
    linkedin: stored.linkedin ?? null,
    github: stored.github ?? null,
  }
}

/** What is saved: only your own answers and imports. */
export const userPart = (p) => Object.fromEntries(USER_FIELDS.map((k) => [k, p[k] ?? null]))

/** What the assistant still needs from you, and why. */
export function missingInfo(p) {
  const e = p.eligibility ?? {}
  const out = []
  const need = (field, label, why) => out.push({ field, label, why })
  if (!p.phone) need('phone', 'Phone number', 'Most application forms ask for it; it is left empty until you add it.')
  if (!p.city) need('city', 'City you live in', 'Needed for "Location" questions on forms.')
  if (!e.authorizedCountries?.length) need('authorizedCountries', 'Countries you are authorized to work in', 'Used to flag roles that need a visa.')
  if (e.needsSponsorshipElsewhere === null || e.needsSponsorshipElsewhere === undefined) need('needsSponsorshipElsewhere', 'Do you need visa sponsorship outside those countries?', 'Roles that do not sponsor are marked as blocked.')
  if (e.openToRelocate === null || e.openToRelocate === undefined) need('openToRelocate', 'Are you open to relocating?', 'On-site roles abroad need it.')
  if (!e.languages?.length) need('languages', 'Languages you speak (and level)', 'Some roles require French, German, Korean …')
  if (!e.earliestStart && !e.noticePeriod) need('earliestStart', 'Earliest start date or notice period', 'Internships and many forms ask for it.')
  return out
}

// ── Skills and the evidence behind them ─────────────────────────────────────
//
// `re` finds the skill in a job description; `own` (default: re) finds it in your own profile text.
// `kind: 'gap-prone'` marks tech that AI roles often require and that is easy to over-claim.

export const SKILLS = [
  { name: 'Python', re: /\bpython\b/i },
  { name: 'FastAPI', re: /\bfastapi\b/i },
  { name: 'Flask', re: /\bflask\b/i },
  { name: 'TypeScript', re: /\btypescript\b/i },
  { name: 'JavaScript', re: /\bjavascript\b/i },
  { name: 'Node.js', re: /\bnode\.?js\b/i, own: /\bnode(\.?js)?\b/i },
  { name: 'React', re: /\bReact(\.js)?\b/ },
  { name: 'PostgreSQL', re: /\bpostgres(ql)?\b/i },
  { name: 'MongoDB', re: /\bmongo(db)?\b/i },
  { name: 'SQL', re: /\bsql\b/i, own: /\bsql\b|postgres|mysql/i },
  { name: 'LLMs', re: /\bllms?\b|large language models?|language models?|foundation models?|generative ai|\bgenai\b/i, own: /\bllm|gemini|perplexity|gemma/i },
  { name: 'LLM API integration', re: /\b(openai|anthropic|claude|gemini|llm|model) apis?\b|api integrations?|integrat\w+ (llms?|models?|ai)/i, own: /gemini api|perplexity api|llm-integrated|llm api/i },
  { name: 'Prompt engineering', re: /\bprompt(s|ing| engineering| design)?\b/i, own: /prompt/i },
  { name: 'Structured output / extraction', re: /structured (output|data|extraction)|information extraction|\bextraction\b/i, own: /structured json|extract/i },
  { name: 'Document / PDF processing', re: /\bpdfs?\b|document (processing|understanding|parsing|extraction|intelligence|ai)|\bocr\b/i, own: /\bpdf|pymupdf|pdfplumber|tesseract|document/i },
  { name: 'Computer vision', re: /computer vision|\bvision(-| )(model|language|system|transformer)s?|image (processing|understanding|recognition|analysis)|\bvlms?\b|multimodal|\bopencv\b/i, own: /vision|image|geometry/i },
  { name: 'Browser extensions', re: /(chrome|browser) extensions?|manifest v3/i, own: /chrome|extension|manifest v3/i },
  { name: 'Automation', re: /\bautomat(e|es|ed|ion|ing)\b/i, own: /automat|pipeline|workflow/i },
  { name: 'Web scraping', re: /\bscrap(e|ing|er|ers)\b|playwright|puppeteer|selenium|\bcrawl/i, own: /scrap|playwright/i },
  { name: 'REST APIs', re: /\brest(ful)?\b(?! of)|\bapi design|\bapis?\b/i, own: /\brest api|\bapi\b/i },
  { name: 'Backend development', re: /\bback-?end\b|server-side/i, own: /back-?end|express|fastapi|flask|node/i },
  { name: 'Full-stack development', re: /\bfull[- ]?stack\b/i, own: /full-stack|react/i },
  { name: 'pandas', re: /\bpandas\b/i },
  { name: 'AWS', re: /\baws\b|amazon web services/i, own: /\baws\b/i },
  { name: 'Git', re: /\bgit\b|\bgithub\b/i },
  { name: 'Automated testing', re: /\b(pytest|vitest|jest|unit tests?|test-driven|automated tests?)\b/i, own: /pytest|vitest|tests?\b/i },
  { name: 'Job queues', re: /\b(job|message|task) queues?\b|\bsqs\b|\bcelery\b|\bkafka\b/i, own: /queue|sqs|pg-boss/i },
  { name: 'AI agents', re: /\bagents?\b|\bagentic\b/i, own: /\bagent\b/i },
  // Often required by AI roles; none of these appear in your verified profile unless you add evidence.
  { name: 'PyTorch', re: /\bpytorch\b|\btorch\b/i, kind: 'gap-prone' },
  { name: 'TensorFlow', re: /\btensorflow\b|\bkeras\b/i, kind: 'gap-prone' },
  { name: 'JAX', re: /\bjax\b/i, kind: 'gap-prone' },
  { name: 'Model training / fine-tuning', re: /fine-?tun\w*|\b(pre|post)-?training\b|train(ing)? (large |deep |ml |machine learning )?models|model training|\brlhf\b|reinforcement learning/i, kind: 'gap-prone' },
  { name: 'Deep learning / ML research', re: /\bdeep learning\b|\bneural networks?\b|\bml research\b|research publications?|\bneurips\b|\bicml\b|\biclr\b/i, kind: 'gap-prone' },
  { name: 'CUDA / GPU programming', re: /\bcuda\b|\btriton\b|gpu (kernels?|programming)|\bkernels?\b/i, kind: 'gap-prone' },
  { name: 'C++', re: /\bc\+\+/i, kind: 'gap-prone' },
  { name: 'Rust', re: /\brust\b/i, kind: 'gap-prone' },
  // Case-sensitive "Go" only next to a list separator ("Python, Go", "Go or Rust"): plain "go" is an English word.
  { name: 'Go', re: /\b[Gg]olang\b|(?:,|\/|\bor|\band|\bin|\bwith)\s+Go\b|\bGo\s*(?:,|\/|\bor\b|\band\b|\))/, kind: 'gap-prone' },
  { name: 'Java', re: /\bjava\b(?!script)/i, kind: 'gap-prone' },
  { name: 'Kubernetes', re: /\bkubernetes\b|\bk8s\b/i, kind: 'gap-prone' },
  { name: 'Docker', re: /\bdocker\b|\bcontainers?\b/i, kind: 'gap-prone' },
  { name: 'Terraform / IaC', re: /\bterraform\b|infrastructure as code/i, kind: 'gap-prone' },
  { name: 'Distributed systems', re: /distributed systems?|large-scale (distributed )?systems/i, kind: 'gap-prone' },
  { name: 'Spark / big data', re: /\bspark\b|\bhadoop\b|\bbig data\b/i, kind: 'gap-prone' },
  { name: 'RAG / vector search', re: /\brag\b|retrieval[- ]augmented|vector (database|search|store)s?|embeddings?/i, kind: 'gap-prone' },
]

/** Where in your profile a skill is shown: professional > project > education > LinkedIn list. */
export function skillEvidence(p) {
  const places = []
  for (const e of p.experience ?? []) places.push({ level: 'professional', where: `${e.title}, ${e.company}`, text: [e.title, e.summary, ...(e.bullets ?? []), ...(e.tech ?? [])].join(' \n ') })
  for (const pr of p.projects ?? []) places.push({ level: 'project', where: `${pr.name} (${pr.status})`, text: [pr.name, pr.summary, ...(pr.bullets ?? []), ...(pr.tech ?? [])].join(' \n ') })
  for (const g of p.skillGroups ?? []) places.push({ level: 'project', where: `Skills: ${g.domain}`, text: g.items.join(' \n ') })
  for (const r of p.github?.repos ?? []) places.push({ level: 'project', where: `GitHub: ${r.name}`, text: [r.name, r.description, r.language, ...(r.topics ?? [])].filter(Boolean).join(' \n ') })
  for (const ed of p.education ?? []) places.push({ level: 'education', where: ed.school, text: [ed.degree, ...(ed.notes ?? [])].join(' \n ') })
  for (const pos of p.linkedin?.positions ?? []) places.push({ level: 'professional', where: `${pos.title}, ${pos.company} (LinkedIn)`, text: [pos.title, pos.description].filter(Boolean).join(' \n ') })
  if (p.linkedin?.skills?.length) places.push({ level: 'linkedin', where: 'Skills listed on your LinkedIn', text: p.linkedin.skills.join(' \n ') })

  const rank = { professional: 3, project: 2, education: 1, linkedin: 0 }
  const out = new Map()
  for (const s of SKILLS) {
    const re = s.own ?? s.re
    let best = null
    for (const pl of places) {
      if (re.test(pl.text) && (!best || rank[pl.level] > rank[best.level])) best = { level: pl.level, where: pl.where }
    }
    if (best) out.set(s.name, best)
  }
  return out
}
