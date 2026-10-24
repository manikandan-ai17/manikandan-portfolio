// Decides how to answer the "sensitive" application questions during AUTO-apply, using only what you typed into
// your profile. A classic script (content scripts cannot be modules); it puts one object on globalThis.
//
// Rule: an answer is given only when your profile states the fact. If it does not, or the question is a legal
// agreement, the answer is "needs_you" and the application is NOT submitted.

;(function (root) {
  const clean = (s) => String(s ?? '').replace(/[_*]+/g, ' ').replace(/\s+/g, ' ').trim()
  const lc = (s) => clean(s).toLowerCase()

  // ── Countries ──────────────────────────────────────────────────────────────
  const COUNTRY_WORDS = {
    india: ['india', 'indian', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi', 'gurgaon', 'gurugram', 'hyderabad', 'pune', 'chennai', 'noida', 'kolkata', 'coimbatore', 'ahmedabad'],
    'united states': ['united states', 'usa', 'u.s.', 'u.s.a', 'america', 'san francisco', 'new york', 'seattle', 'austin', 'boston', 'los angeles', 'chicago', 'denver', 'palo alto', 'mountain view', 'menlo park', 'sunnyvale', 'washington, dc', 'atlanta'],
    'united kingdom': ['united kingdom', 'u.k.', 'england', 'britain', 'london', 'cambridge, uk', 'manchester', 'edinburgh'],
    canada: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'waterloo'],
    germany: ['germany', 'berlin', 'munich', 'münchen', 'hamburg'],
    france: ['france', 'paris'],
    ireland: ['ireland', 'dublin'],
    singapore: ['singapore'],
    japan: ['japan', 'tokyo'],
    australia: ['australia', 'sydney', 'melbourne'],
    netherlands: ['netherlands', 'amsterdam'],
    switzerland: ['switzerland', 'zurich', 'zürich'],
    'united arab emirates': ['united arab emirates', 'uae', 'dubai', 'abu dhabi'],
  }
  const US_STATE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const SHORT = { 'united states': ['us'], 'united kingdom': ['uk'] }

  /** The countries named in a piece of text (a question or a job location), in canonical lower-case form. */
  function countriesIn(text) {
    const t = ` ${lc(text)} `
    const found = new Set()
    for (const [country, words] of Object.entries(COUNTRY_WORDS)) {
      const all = [...words, ...(SHORT[country] ?? [])]
      if (all.some((w) => new RegExp(`(^|[^a-z])${escapeRe(w)}([^a-z]|$)`).test(t))) found.add(country)
    }
    if (US_STATE.test(String(text))) found.add('united states')
    return [...found]
  }

  const jobCountries = (job) => [...new Set((job?.locations ?? []).flatMap(countriesIn))]
  const isRemoteOnly = (job) => Boolean(job?.remote) && !(job?.locations ?? []).length

  /** Canonical countries the profile says you may work in. */
  const authorizedIn = (profile) => [...new Set((profile?.eligibility?.authorizedCountries ?? []).flatMap((c) => { const f = countriesIn(c); return f.length ? f : [lc(c)] }))]

  // ── Options ────────────────────────────────────────────────────────────────
  const YES = /^(yes|y|i do|i am|i have|true)\b/i
  const NO = /^(no|n|i do not|i don.t|i am not|i have not|i haven.t|false)\b/i

  /** The option that means yes / no, or null. */
  function yesNoOption(options, wantYes) {
    const re = wantYes ? YES : NO
    const opts = options.map((o) => ({ o, t: clean(o) }))
    return opts.find((x) => re.test(x.t))?.o ?? null
  }

  function matchOption(options, regexes) {
    for (const re of regexes) {
      const hit = options.find((o) => re.test(clean(o)))
      if (hit) return hit
    }
    return null
  }

  const DECLINE = /decline|prefer not|do not wish|don.t wish|do not want|not to (say|answer|disclose|identify|specify)|rather not|choose not|i do not|not disclose|no answer/i

  // ── The decision ───────────────────────────────────────────────────────────

  /**
   * q: { label, kind: 'text'|'textarea'|'select'|'radio'|'checkbox'|'combobox', options: string[], required }
   * ctx: { profile, job, settings, tracker }
   * → { action: 'set', value?, option?, checked? } | { action: 'leave' } | { action: 'needs_you', why }
   */
  function decide(q, ctx) {
    const label = lc(q.label)
    const profile = ctx.profile ?? {}
    const e = profile.eligibility ?? {}
    const settings = ctx.settings ?? {}
    const job = ctx.job ?? {}
    const options = q.options ?? []
    const choice = q.kind === 'select' || q.kind === 'radio' || q.kind === 'combobox'
    const yesNo = choice && Boolean(yesNoOption(options, true) && yesNoOption(options, false))
    const need = (why) => (q.required ? { action: 'needs_you', why } : { action: 'leave' })
    const answerYesNo = (yes, why) => {
      if (q.kind === 'checkbox') return { action: 'set', checked: yes }
      const option = yesNoOption(options, yes)
      return option ? { action: 'set', option } : need(`${why}: no ${yes ? 'Yes' : 'No'} option to pick`)
    }

    // Binding legal agreements are never accepted for you.
    if (/arbitrat|non-?compete|non-?disclosure|\bnda\b|intellectual property|invention assignment|ip assignment|waive|jury trial/.test(label)) return { action: 'needs_you', why: 'Legal agreement — read and accept it yourself' }

    // Work authorization
    if (/authori[sz]ed to work|legally (authori[sz]ed|eligible|able|permitted)|right to work|eligible to work|work permit|permission to work/.test(label) && !/sponsor/.test(label)) {
      const auth = authorizedIn(profile)
      const where = countriesIn(q.label).length ? countriesIn(q.label) : jobCountries(job)
      if (!auth.length) return need('Add the countries you may work in (Profile)')
      if (!where.length) return need('Could not tell which country this asks about')
      const ok = where.every((c) => auth.includes(c))
      return answerYesNo(ok, 'Work authorization')
    }

    // Visa sponsorship
    if (/sponsor|\bvisa\b/.test(label)) {
      const auth = authorizedIn(profile)
      const where = countriesIn(q.label).length ? countriesIn(q.label) : jobCountries(job)
      let needs
      if (where.length && auth.length && where.every((c) => auth.includes(c))) needs = false
      else if (e.needsSponsorshipElsewhere === true || e.needsSponsorshipElsewhere === false) needs = e.needsSponsorshipElsewhere
      else return need('Answer the visa-sponsorship question in Profile')
      // "Are you able to work WITHOUT sponsorship?" is the opposite question.
      const inverted = /without (visa )?sponsorship|not (require|need)|no sponsorship|able to work/.test(label)
      return answerYesNo(inverted ? !needs : needs, 'Visa sponsorship')
    }

    // Relocation
    if (/relocat/.test(label)) {
      if (!choice && q.kind !== 'checkbox') return need('Relocation question needs a written answer')
      if (e.openToRelocate !== true && e.openToRelocate !== false) return need('Answer the relocation question in Profile')
      return answerYesNo(e.openToRelocate, 'Relocation')
    }

    // Demographic and diversity questions: choose the "decline to answer" option; never guess.
    if (/gender|\bsex\b|\brace\b|racial|ethnic|hispanic|latin[oa]|veteran|disab|pronoun|sexual orientation|transgender|lgbtq|protected class|caste|religio/.test(label)) {
      if (choice) {
        const decline = options.find((o) => DECLINE.test(clean(o)))
        if (decline) return { action: 'set', option: decline }
      }
      if (q.kind === 'checkbox' && DECLINE.test(label)) return { action: 'set', checked: true }
      return need('Diversity question has no “prefer not to say” option')
    }

    // Consent, acknowledgements, privacy, terms
    if (/consent|acknowledg|privacy|terms|\bagree\b|i understand|certify|attest|declar|accurate|truthful|read and|gdpr|data (processing|protection)|ai policy|policy/.test(label)) {
      if (!settings.acceptConsent) return need('Consent checkbox — tick it yourself (or allow it in Auto-apply settings)')
      if (q.kind === 'checkbox') return { action: 'set', checked: true }
      if (choice) {
        const option = matchOption(options, [/^(yes|i agree|agree|i acknowledge|acknowledge|i understand|i consent|accept)/i])
        return option ? { action: 'set', option } : need('Consent question has no “Yes / I agree” option')
      }
      return need('Consent question needs a written answer')
    }

    // Notice period / start date / salary: your own words, or ask you
    if (/notice period/.test(label)) return e.noticePeriod ? (choice ? need('Notice period is a list — pick it yourself') : { action: 'set', value: e.noticePeriod }) : need('Add your notice period (Profile)')
    if (/earliest.*start|start date|when can you start|available to start|availability/.test(label) && !choice) return e.earliestStart ? { action: 'set', value: e.earliestStart } : need('Add your earliest start date (Profile)')
    if (/salary|compensation|pay expectation|expected pay|desired pay|\bctc\b/.test(label)) {
      const s = profile.myWords?.salaryExpectation
      return s && !choice ? { action: 'set', value: s } : need('Add your salary expectation in Profile → In your own words')
    }

    // Employment history with this company
    if (/(previously|ever|formerly|currently) (worked|employed)|former employee|current employee|worked (at|for|with) /.test(label)) {
      const company = lc(job.company)
      const worked = (profile.experience ?? []).some((x) => company && lc(x.company).includes(company))
      return worked ? { action: 'needs_you', why: 'Your profile shows you worked here — answer yourself' } : yesNo || q.kind === 'checkbox' ? answerYesNo(false, 'Worked here before') : need('Employment-history question needs a written answer')
    }
    if (/(previously|ever|before) (applied|interviewed)|interviewed (at|with|for)|applied (to|for|at|with) .* before|prior application/.test(label)) {
      const company = lc(job.company)
      const hit = Object.values(ctx.tracker ?? {}).some((r) => lc(r.company) === company && ['applied', 'interviewing', 'offer', 'rejected'].includes(r.status))
      if (hit) return yesNo ? answerYesNo(true, 'Applied before') : need('Applied-before question needs a written answer')
      if (settings.neverAppliedBefore) return yesNo || q.kind === 'checkbox' ? answerYesNo(false, 'Applied before') : need('Applied-before question needs a written answer')
      return need('Say in Auto-apply settings whether you have applied to these companies before')
    }

    // Referral: assumes none. Turn auto-apply off for a job you were referred to.
    if (/referr/.test(label)) {
      if (yesNo) return answerYesNo(false, 'Referral')
      return { action: 'leave' }
    }

    // How you heard about the job
    if (/how did you (hear|find|learn)|where did you (hear|find|learn)|source of (your )?application/.test(label)) {
      if (choice) {
        const hit = matchOption(options, [/company (web)?site|career|corporate site|official/i, /job board|job site|online|internet|website/i, /linkedin/i, /other/i])
        if (hit) return { action: 'set', option: hit }
        return need('Could not pick “how did you hear” from the list')
      }
      return { action: 'set', value: 'Company careers page' }
    }

    // Age
    if (/(at least|over|above|older than) (18|eighteen)|18 years|legal (working )?age/.test(label)) return answerYesNo(true, 'Age 18+')

    // Student status
    if (/currently (a )?(student|enrolled)|enrolled (in|at)/.test(label)) {
      if (e.currentlyEnrolled === true || e.currentlyEnrolled === false) return answerYesNo(e.currentlyEnrolled, 'Enrolled')
      return need('Enrollment status unknown')
    }

    // Country of residence
    if (/^country\b|country (of residence|you (reside|live|are (located|based)))|which country|residen/.test(label) && (choice || q.kind === 'text')) {
      const c = profile.country
      if (!c) return need('Add your country (Profile)')
      if (!choice) return { action: 'set', value: c }
      // Exact match only (ignoring a dial code like "+91"): "India" must never match "British Indian Ocean Territory".
      const base = (o) => lc(o).replace(/\s*\(?\+\d+\)?\s*$/, '').trim()
      const hit = options.find((o) => base(o) === lc(c))
      return hit ? { action: 'set', option: hit } : need(`“${c}” is not in the country list`)
    }

    // Free-text location typeahead
    if (/location|city|where are you (based|located)|address from which|where do you (live|reside)/.test(label) && q.kind === 'combobox') {
      return profile.city ? { action: 'set', value: [profile.city, profile.country].filter(Boolean).join(', '), pick: 'first' } : need('Add your city (Profile)')
    }

    // Anything else about personal circumstances: ask you rather than guess.
    return need(`No rule for “${clean(q.label).slice(0, 80)}” — answer it yourself`)
  }

  root.JobAssistAuto = { decide, countriesIn, jobCountries, authorizedIn, yesNoOption, matchOption, isRemoteOnly, DECLINE }
})(typeof globalThis !== 'undefined' ? globalThis : window)
