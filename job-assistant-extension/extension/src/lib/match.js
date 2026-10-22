// How well a job fits your verified background — and what blocks it. Deterministic and explainable: every
// point and every blocker comes with the reason (and, where it is in the text, the words that triggered it).
//
//   score  = role fit (0-35) + skills (0-35) + level (0-20) + location (0-10)
//   verdict: 'blocked' if any blocker, else strong >= 70, good >= 55, stretch >= 40, low below.

import { SKILLS, skillEvidence } from './profile.js'
import { snippetAround, unique } from './text.js'

// ── Role fit from the title ──────────────────────────────────────────────────

const ROLE_PATTERNS = [
  { re: /\b(applied ai|ai|genai|llm|ai\/ml|ml\/ai) (application |product |solutions |platform |automation )?(engineer|developer)\b/i, points: 35, label: 'AI / LLM engineering role' },
  { re: /\bai automation\b|\bautomation engineer\b/i, points: 33, label: 'AI automation role' },
  { re: /\bpython (developer|engineer)\b/i, points: 33, label: 'Python developer role' },
  { re: /\b(software|swe|ai|ml|machine learning|research|engineering|llm|data|computer vision)\b.*\bintern(ship)?\b|\bintern(ship)?\b.*\b(software|engineer|engineering|ai|ml|machine learning|research|developer)\b/i, points: 33, label: 'Technical internship' },
  { re: /\b(new grad|new college grad|university grad|early career|entry[- ]level|junior|graduate|associate)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(new grad|new college grad|university|early career|entry[- ]level|graduate)\b/i, points: 33, label: 'Entry-level engineering role' },
  { re: /\bforward[- ]deployed (ai |software )?engineer\b/i, points: 28, label: 'Forward deployed engineer (customer-facing engineering)' },
  { re: /\bcomputer vision (engineer|developer|scientist)\b|\bvision (engineer|ml engineer)\b/i, points: 27, label: 'Computer vision role' },
  { re: /\b(machine learning|ml) engineer\b/i, points: 26, label: 'Machine learning engineer' },
  { re: /\b(backend|back-end|full[- ]?stack|platform|product|software|application|integrations?|solutions) (software )?(engineer|developer)\b/i, points: 25, label: 'Software engineering role' },
  { re: /\bsoftware engineer(ing)?\b|\bmember of technical staff\b/i, points: 25, label: 'Software engineering role' },
  { re: /\bresearch engineer\b/i, points: 18, label: 'Research engineering (often expects research experience)' },
  { re: /\b(developer|engineer)\b/i, points: 12, label: 'Other engineering role' },
]

// Titles that are clearly not engineering work you are looking for.
const NOT_ENGINEERING = /\b(sales|account (executive|manager)|recruit\w*|talent|sourcer|marketing|communications?|legal|counsel|attorney|finance|accounting|payroll|tax|people (ops|partner)|hr\b|human resources|customer success|support specialist|office|executive assistant|designer|policy|operations manager|program manager|product manager|strategist|partnerships?|business development|community|writer|editor|security officer|paralegal|controller|procurement|facilities|workplace)\b/i

const SENIOR_TITLE = /\b(senior|sr\.?|staff|principal|lead|leader|manager|director|head|vp|vice president|chief|architect|distinguished|fellow)\b|\b(engineer|developer|scientist)\s+(iii|iv|v|3|4|5)\b/i
const MID_TITLE = /\b(engineer|developer|scientist)\s+(ii|2)\b/i

// Engineering, but not the software/AI work in your background (hardware, chips, AV, IT support …).
const OTHER_ENGINEERING = /\b(av|audio[- ]visual|it support|it systems|help ?desk|desktop support|technician|support engineer|network(ing)? engineer|facilities|mechanical|electrical|firmware|silicon|asic|soc|fpga|verification|physical design|analog|rtl|pcb|thermal|manufacturing|hardware|datacenter|data center|validation engineer|test engineer|power engineer|optical|photonics)\b/i

export function roleFit(title) {
  if (OTHER_ENGINEERING.test(title)) return null
  if (NOT_ENGINEERING.test(title) && !/\bengineer|developer\b/i.test(title.replace(NOT_ENGINEERING, ''))) return null
  for (const p of ROLE_PATTERNS) if (p.re.test(title)) return { points: p.points, label: p.label }
  return null
}

/** Cheap first pass (title only), so thousands of postings never get a full read. */
export function isRelevantTitle(title) {
  return roleFit(title) !== null
}

/** For boards that need one call per job (Workday): skip senior titles, which would only be blocked. */
export function isWorthDetail(title) {
  return isRelevantTitle(title) && !SENIOR_TITLE.test(title)
}

// ── Description analysis ─────────────────────────────────────────────────────

const NICE_TO_HAVE = /(nice[- ]to[- ]haves?|preferred qualifications|bonus points|bonus if|it'?s a plus|is a plus|strong candidates (may|will) also|you might also have|extra credit|preferred:|ideal candidates? (may|might) also)/i

/** Splits a description into the "requirements" part and the "nice to have" part (heuristic). */
export function splitRequirements(text) {
  const m = NICE_TO_HAVE.exec(text)
  return m ? { required: text.slice(0, m.index), preferred: text.slice(m.index) } : { required: text, preferred: '' }
}

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
const YEARS_RE = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?\+?\s*(?:years?|yrs?)\b(?:\s+of)?(?=[^.\n]{0,80}\b(experience|industry|professional|working|engineering|building|developing|software|in\b))/gi

/** The smallest "N+ years of experience" the requirements ask for, with the words, or null. */
export function yearsRequired(text) {
  let best = null
  for (const m of text.matchAll(YEARS_RE)) {
    const n = NUMBER_WORDS[m[1].toLowerCase()] ?? Number(m[1])
    if (!Number.isFinite(n) || n > 25) continue
    if (!best || n < best.years) best = { years: n, evidence: snippetAround(text, m.index) }
  }
  return best
}

// "junior" only counts in the title: descriptions of senior roles often say "mentor junior engineers".
const ENTRY_SIGNALS = /\b(new grads?|new college grad(uate)?s?|recent grad(uate)?s?|early[- ]career|entry[- ]level|0\s*[-–]\s*[12] years|graduate program|university grad(uate)?s?|no (prior )?experience required)\b/i
const ENTRY_TITLE = /\b(junior|jr\.?|associate|graduate|new grad|entry[- ]level|early career)\b/i
const PHD_REQUIRED = /(ph\.?d\.?|doctorate)[^.\n]{0,60}\b(required|must|is necessary)|\b(required|must have|must hold)[^.\n]{0,60}(ph\.?d|doctorate)/i
const PHD_MENTION = /\bph\.?d\.?\b|\bdoctorate\b/i
const MASTERS_REQUIRED = /(master'?s|\bms\b|\bm\.s\.)[^.\n]{0,40}\b(required|must)|\b(required|must have)[^.\n]{0,40}(master'?s|\bms\b|\bm\.s\.)/i
const ENROLLMENT = /(currently (enrolled|pursuing|studying)|enrolled (in|as) (a|an)? ?(full-time )?(bachelor|master|ph\.?d|degree|university|undergraduate|graduate)|returning to (school|university|your studies)|must be (a )?(current )?(student|enrolled)|pursuing (a |an |your )?(bachelor'?s?|master'?s?|\bbs\b|\bms\b|b\.s\.|m\.s\.|ph\.?d|undergraduate|graduate|degree)|expected graduation (date )?(in|between|of)? ?20(2[6-9]|3\d)|graduat(e|ing) (in|between|by) 20(2[6-9]|3\d)|graduation (date )?(in|of|between|by)? ?((spring|summer|fall|autumn|winter|december|may|june) )?20(2[6-9]|3\d))/i
const NO_SPONSOR = /(unable|not able|cannot|can'?t|do not|don'?t|will not|won'?t|are not able) (to )?(provide |offer )?(visa |immigration )?sponsor|no (visa |immigration )?sponsorship|sponsorship (is )?not (available|provided|offered)|without (the need for )?(current or future )?(visa )?sponsorship|must (already )?(be|have) (legally )?(authori[sz]ed|eligible|the right) to work|must have (the )?right to work/i
const SPONSOR_OK = /we (do |can |will )?sponsor|visa sponsorship (is )?(available|offered|provided|possible)|sponsorship (is )?available|relocation (support|assistance|package)/i
const LANGUAGE_RE = /\b(fluent|fluency|native|bilingual|professional (working )?proficiency|proficien\w*|business[- ]level|full professional)\b[^.\n]{0,40}\b(french|german|spanish|italian|dutch|portuguese|japanese|korean|mandarin|chinese|cantonese|hebrew|arabic|hindi|polish|swedish|turkish)\b|\b(french|german|spanish|italian|dutch|portuguese|japanese|korean|mandarin|chinese|cantonese|hebrew|arabic|hindi|polish|swedish|turkish)\b[^.\n]{0,25}\b(is |are )?(required|mandatory|essential|fluency|speaking|native)\b/gi

// ── Locations ────────────────────────────────────────────────────────────────

const PLACES = [
  ['India', /\bindia\b|bengaluru|bangalore|hyderabad|\bpune\b|chennai|mumbai|delhi|gurgaon|gurugram|noida|coimbatore|kolkata/i],
  ['United States', /\b(usa|u\.s\.a?\.?|united states|us)\b|san francisco|\bsf\b|new york|\bnyc\b|seattle|palo alto|mountain view|menlo park|sunnyvale|santa clara|san jose|austin|boston|los angeles|chicago|washington,? d\.?c|denver|atlanta|redmond|bellevue/i],
  // State codes, case-sensitive ("Seattle, WA"), so "or"/"co" in other text never count.
  ['United States', /,\s*(CA|WA|NY|TX|MA|CO|IL|GA|VA|NC|OR|AZ|PA|NJ|MD|MN|UT|FL)\b/],
  ['United Kingdom', /\buk\b|united kingdom|london|cambridge,? uk|edinburgh|manchester/i],
  ['France', /\bfrance\b|paris|lyon/i],
  ['Germany', /\bgermany\b|berlin|munich|münchen|hamburg/i],
  ['Switzerland', /switzerland|zurich|zürich|geneva/i],
  ['Ireland', /ireland|dublin/i],
  ['Netherlands', /netherlands|amsterdam/i],
  ['Poland', /poland|warsaw|krak[oó]w/i],
  ['Canada', /canada|toronto|montreal|montréal|vancouver|ottawa/i],
  ['Japan', /japan|tokyo/i],
  ['South Korea', /korea|seoul/i],
  ['Singapore', /singapore/i],
  ['Israel', /israel|tel aviv|yokneam|haifa/i],
  ['Taiwan', /taiwan|taipei/i],
  ['China', /\bchina\b|shanghai|beijing|shenzhen/i],
  ['Australia', /australia|sydney|melbourne/i],
  ['Spain', /\bspain\b|madrid|barcelona/i],
  ['Italy', /\bitaly\b|milan|rome/i],
  ['Sweden', /sweden|stockholm/i],
  ['Denmark', /denmark|copenhagen/i],
  ['United Arab Emirates', /\buae\b|dubai|abu dhabi/i],
  ['Brazil', /brazil|são paulo|sao paulo/i],
  ['Qatar', /qatar|doha/i],
  ['Saudi Arabia', /saudi|riyadh/i],
  ['Hungary', /hungary|budapest/i],
  ['Portugal', /portugal|lisbon/i],
  ['Belgium', /belgium|brussels/i],
  ['Austria', /austria|vienna/i],
  ['Finland', /finland|helsinki/i],
  ['Norway', /norway|oslo/i],
  ['Czech Republic', /czech|prague/i],
  ['Romania', /romania|bucharest/i],
  ['Serbia', /serbia|belgrade/i],
  ['Mexico', /mexico/i],
  ['Argentina', /argentina|buenos aires/i],
  ['Vietnam', /vietnam|hanoi|ho chi minh/i],
  ['Hong Kong', /hong kong/i],
  ['Europe (region)', /\bemea\b|\beurope\b|\beu\b/i],
  ['APAC (region)', /\bapac\b|asia[- ]pacific/i],
]

/** Countries named in a location string ("Remote - US", "San Francisco, CA | Seattle, WA" …). */
export function countriesOf(loc) {
  return unique(PLACES.filter(([, re]) => re.test(loc)).map(([c]) => c))
}

function locationCheck(job, profile, text, out) {
  const el = profile.eligibility ?? {}
  const authorized = (el.authorizedCountries ?? []).map((c) => c.toLowerCase())
  const locs = job.locations?.length ? job.locations : []
  const perLoc = locs.map((l) => ({ l, countries: countriesOf(l), remote: /\bremote\b|anywhere|distributed/i.test(l) }))
  const anyRemote = job.remote === true || perLoc.some((x) => x.remote)
  const remoteAnywhere = anyRemote && perLoc.filter((x) => x.remote).some((x) => x.countries.length === 0 && /anywhere|global|worldwide|^remote$/i.test(x.l.trim()))
  const countries = unique(perLoc.flatMap((x) => x.countries))
  const ok = (c) => authorized.includes(c.toLowerCase())

  if (countries.includes('India') || remoteAnywhere) {
    out.points.location = 10
    out.reasons.push(countries.includes('India') ? 'Located in India' : 'Remote, no country restriction stated')
    return
  }
  if (anyRemote && countries.includes('APAC (region)')) {
    out.points.location = 7
    out.warnings.push('Remote in APAC — check whether India is an eligible country')
    return
  }
  if (!countries.length) {
    out.points.location = 5
    out.warnings.push(`Location not recognised (${locs.join(' · ') || 'not stated'}) — check where the role is based`)
    return
  }
  if (!authorized.length) {
    out.points.location = 4
    out.warnings.push(`Based in ${countries.join(', ')} — set your work authorization in Profile to check visa needs`)
    return
  }
  if (countries.some(ok)) {
    out.points.location = 10
    out.reasons.push(`Based in ${countries.filter(ok).join(', ')}, where you are authorized to work`)
    return
  }
  // Every location needs a visa.
  out.points.location = 0
  if (el.openToRelocate === false && !anyRemote) {
    out.blockers.push({ text: `On-site in ${countries.join(', ')} and you are not open to relocating` })
    return
  }
  const no = NO_SPONSOR.exec(text)
  if (no && el.needsSponsorshipElsewhere !== false) {
    out.blockers.push({ text: `Needs work authorization in ${countries.join(', ')}; the posting says it does not sponsor`, evidence: snippetAround(text, no.index) })
    return
  }
  const yes = SPONSOR_OK.exec(text)
  if (el.needsSponsorshipElsewhere === false) out.reasons.push(`Based in ${countries.join(', ')}; you said you do not need sponsorship`)
  else if (yes) out.warnings.push({ text: `Needs a visa for ${countries.join(', ')}; the posting mentions sponsorship/relocation support`, evidence: snippetAround(text, yes.index) })
  else out.warnings.push(`Needs a visa for ${countries.join(', ')}; the posting does not say whether it sponsors — check before applying`)
}

// ── The score ────────────────────────────────────────────────────────────────

export function scoreJob(job, profile, evidence = skillEvidence(profile)) {
  const title = job.title ?? ''
  const text = job.description ?? ''
  const out = { points: { role: 0, skills: 0, level: 0, location: 0 }, reasons: [], warnings: [], blockers: [], matched: [], gaps: [], partial: [] }
  const el = profile.eligibility ?? {}
  const prefs = profile.preferences ?? {}

  // Role
  const role = roleFit(title)
  if (!role) {
    return { ...finish(out), verdict: 'not_relevant', score: 0, role: null, summary: 'Not an engineering role you are looking for' }
  }
  out.points.role = role.points
  out.reasons.push(role.label)

  // Job type preferences
  const type = job.employmentType
  if (type === 'internship' && prefs.internships === false) out.blockers.push({ text: 'Internship (turned off in your preferences)' })
  if (type === 'full_time' && prefs.fullTime === false) out.blockers.push({ text: 'Full-time (turned off in your preferences)' })
  if ((type === 'contract' || type === 'part_time') && prefs.contract === false) out.warnings.push(`${type === 'contract' ? 'Contract' : 'Part-time'} role`)

  // Seniority and years
  const { required, preferred } = splitRequirements(text)
  if (SENIOR_TITLE.test(title)) out.blockers.push({ text: `Senior-level title ("${title}") — you have about ${el.yearsExperience ?? 1} year of experience` })
  else if (MID_TITLE.test(title)) out.warnings.push('Level II title — usually 2-4 years of experience')
  const yrs = yearsRequired(required)
  const have = el.yearsExperience ?? 1
  // Years under "preferred / nice to have" are a warning, never a blocker.
  const prefYrs = yrs ? null : yearsRequired(preferred)
  if (prefYrs && prefYrs.years > have) out.warnings.push({ text: `Prefers ${prefYrs.years}+ years (listed as preferred, not required)`, evidence: prefYrs.evidence })
  if (yrs) {
    if (yrs.years >= have + 2) out.blockers.push({ text: `Asks for ${yrs.years}+ years of experience; you have about ${have}`, evidence: yrs.evidence })
    else if (yrs.years > have) out.warnings.push({ text: `Asks for ${yrs.years}+ years; you have about ${have} — a stretch`, evidence: yrs.evidence })
    else out.reasons.push(`Experience asked (${yrs.years}+ years) fits yours`)
  }
  const entry = ENTRY_TITLE.exec(title) ?? ENTRY_SIGNALS.exec(text)
  if (type === 'internship' || entry) {
    out.points.level = 20
    out.reasons.push(type === 'internship' ? 'Internship' : `Early-career signal: "${entry[0]}"`)
  } else if (!yrs) {
    out.points.level = 10
  } else if (yrs.years <= have) {
    out.points.level = 16
  } else if (yrs.years === have + 1) {
    out.points.level = 6
  }

  // Education
  const phd = PHD_REQUIRED.exec(required)
  if (phd) out.blockers.push({ text: 'Requires a PhD; you hold a B.Sc.', evidence: snippetAround(required, phd.index) })
  else if (PHD_MENTION.test(text)) out.warnings.push('Mentions a PhD (probably preferred, not required) — check')
  const ms = MASTERS_REQUIRED.exec(required)
  if (!phd && ms) out.blockers.push({ text: "Requires a master's degree; you hold a B.Sc.", evidence: snippetAround(required, ms.index) })

  // Internships that need you to still be a student
  if (type === 'internship') {
    const enr = ENROLLMENT.exec(text)
    if (enr && !el.currentlyEnrolled) {
      const recentGradsOk = /recent(ly)? graduat|recent grads?|graduated within/i.test(text)
      const item = { text: `Internship for current students — you graduated in ${el.graduationYear ?? 2025}`, evidence: snippetAround(text, enr.index) }
      if (recentGradsOk) out.warnings.push({ ...item, text: `${item.text}, but it also mentions recent graduates — check` })
      else out.blockers.push(item)
    }
  }

  // Language
  const spoken = (el.languages ?? []).map((l) => String(l.name ?? l).toLowerCase())
  for (const m of text.matchAll(LANGUAGE_RE)) {
    const lang = (m[2] ?? m[3] ?? '').toLowerCase()
    if (!lang || spoken.includes(lang) || lang === 'english') continue
    const item = { text: `Asks for ${lang[0].toUpperCase()}${lang.slice(1)}`, evidence: snippetAround(text, m.index) }
    if (!spoken.length) out.warnings.push({ ...item, text: `${item.text} — add your languages in Profile` })
    else out.blockers.push({ ...item, text: `${item.text}, which is not in your languages` })
    break
  }

  // Skills: what the posting asks for vs. where your profile shows it
  let skillPoints = 0
  for (const s of SKILLS) {
    const inReq = s.re.test(required)
    const inPref = !inReq && s.re.test(preferred)
    if (!inReq && !inPref) continue
    const ev = evidence.get(s.name)
    if (ev && (ev.level === 'professional' || ev.level === 'project')) {
      out.matched.push({ skill: s.name, level: ev.level, where: ev.where, required: inReq })
      skillPoints += (inReq ? 4 : 2) * (ev.level === 'professional' ? 1 : 0.75)
    } else if (ev) {
      out.partial.push({ skill: s.name, level: ev.level, where: ev.where, required: inReq })
      skillPoints += inReq ? 1 : 0.5
    } else if (s.kind === 'gap-prone' || inReq) {
      out.gaps.push({ skill: s.name, required: inReq })
      skillPoints -= inReq ? 3 : 1
    }
  }
  out.points.skills = Math.max(0, Math.min(35, Math.round(skillPoints)))
  const reqGaps = out.gaps.filter((g) => g.required)
  if (reqGaps.length >= 4) out.warnings.push(`Requires ${reqGaps.length} things your profile does not show: ${reqGaps.map((g) => g.skill).join(', ')}`)

  // Location / work authorization
  locationCheck(job, profile, text, out)

  const res = finish(out)
  const score = Math.max(0, Math.min(100, out.points.role + out.points.skills + out.points.level + out.points.location))
  const verdict = res.blockers.length ? 'blocked' : score >= 70 ? 'strong' : score >= 55 ? 'good' : score >= 40 ? 'stretch' : 'low'
  return { ...res, score, verdict, role: role.label, summary: summaryOf(verdict, res, score) }
}

const asItem = (x) => (typeof x === 'string' ? { text: x } : x)
function finish(out) {
  return { points: out.points, reasons: out.reasons, warnings: out.warnings.map(asItem), blockers: out.blockers.map(asItem), matched: out.matched, partial: out.partial, gaps: out.gaps }
}

function summaryOf(verdict, r, score) {
  if (verdict === 'blocked') return `Blocked: ${r.blockers[0].text}`
  const top = r.matched.filter((m) => m.required).slice(0, 4).map((m) => m.skill)
  return `${score}/100 — ${top.length ? `matches ${top.join(', ')}` : 'few direct skill matches'}${r.gaps.some((g) => g.required) ? `; gaps: ${r.gaps.filter((g) => g.required).slice(0, 3).map((g) => g.skill).join(', ')}` : ''}`
}

export const VERDICT_LABEL = { strong: 'Strong match', good: 'Good match', stretch: 'Stretch', low: 'Low match', blocked: 'Blocked', not_relevant: 'Not relevant' }
