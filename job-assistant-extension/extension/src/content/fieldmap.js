// Which form fields the assistant may fill, and with what. A classic script (content scripts cannot be
// modules); it puts one object on globalThis so autofill.js and the tests can use it.
//
// The rule: only plain facts from your profile go in. Anything about work authorization, visas, demographics,
// legal declarations, agreements, salary, relocation or "why us" is NEVER filled — it is highlighted for you.

;(function (root) {
  // "first_name" / "first-name" read like "first name"; required-field stars are dropped.
  const clean = (s) => String(s ?? '').replace(/[_*]+/g, ' ').replace(/(?<=[a-z])-(?=[a-z])/gi, ' ').replace(/\s+/g, ' ').trim()

  // Order matters: the first rule whose pattern matches the field's description wins.
  const SENSITIVE = /authori[sz]|sponsor|visa\b|citizen|immigra|work permit|right to work|gender|\bsex\b|race\b|racial|ethnic|hispanic|latin[oa]|veteran|disab|pronoun|sexual|transgender|criminal|convict|background check|arbitrat|agreement|acknowledg|certif(y|ication that)|attest|consent|\bagree\b|declar|privacy|terms|signature|salary|compensation|pay expectation|expected pay|relocat|in[- ]person|office|onsite|on-site|interviewed|previously (worked|employed|applied)|referr|how did you hear|ai policy|date of birth|\bage\b|nationality|clearance|export control|itar|non-?compete|notice period|government|military|union|family member|related to|conflict of interest/i

  const RULES = [
    { key: 'cover_letter', re: /cover letter/i, textarea: true },
    { key: 'first_name', re: /^(legal )?first name|given name|forename/i },
    { key: 'last_name', re: /^(legal )?last name|surname|family name/i },
    { key: 'preferred_name', re: /preferred (first )?name|nickname/i, skip: 'Optional — fill it yourself if you use a different name' },
    { key: 'full_name', re: /^(full |legal |your )?name$|^(full|legal) name/i },
    { key: 'email', re: /e-?mail/i },
    { key: 'phone', re: /phone|mobile|telephone|\btel\b/i },
    { key: 'linkedin', re: /linked\s*in/i },
    { key: 'github', re: /github/i },
    { key: 'portfolio', re: /portfolio|personal (web)?site|^website$|^web ?site|other website|personal url|blog/i },
    { key: 'earliest_start', re: /earliest .*start|when can you start|start date|available to start|availability/i },
    { key: 'current_company', re: /current (company|employer)|^company$|^employer$|most recent (company|employer)/i },
    { key: 'current_title', re: /current (job )?(title|role|position)|^title$|^job title$/i },
    { key: 'school', re: /school|university|college|institution/i },
    { key: 'degree', re: /^degree|degree (type|level)|highest (level of )?education/i },
    { key: 'discipline', re: /discipline|major|field of study|area of study/i },
    { key: 'graduation_year', re: /graduation|grad(uation)? (year|date)|year of graduation|end (year|date)/i },
    { key: 'location', re: /^location$|^city$|current(ly)? (location|city)|where (are you|do you) (currently )?(located|based|live)|city of residence|address from which/i },
    { key: 'years_experience', re: /years of (professional |relevant |work )?experience/i },
  ]

  /** What the assistant does with one field: { action: 'fill'|'sensitive'|'skip'|'unknown', key?, note? }. */
  function classify(desc, { tag = 'INPUT', type = 'text', combobox = false } = {}) {
    const d = clean(desc)
    if (!d) return { action: 'unknown' }
    if (type === 'file') {
      if (/autofill|parse|import/i.test(d)) return { action: 'skip', note: 'Resume auto-import of the site — not used' }
      if (/resume|\bcv\b|curriculum/i.test(d)) return { action: 'fill', key: 'resume_file' }
      if (/cover letter/i.test(d)) return { action: 'skip', note: 'Cover letter file — attach yourself if you want one' }
      return { action: 'unknown' }
    }
    if (SENSITIVE.test(d)) return { action: 'sensitive', note: 'Answer this yourself' }
    if (/^why\b|why (do you want|are you interested|this company)|tell us|describe|what (excites|interests)|motivation/i.test(d)) return { action: 'skip', note: 'Write this in your own words' }
    if (type === 'checkbox' || type === 'radio') return { action: 'sensitive', note: 'Choose this yourself' }
    for (const r of RULES) {
      if (!r.re.test(d)) continue
      if (r.skip) return { action: 'skip', note: r.skip }
      if (r.textarea && tag !== 'TEXTAREA') continue
      if (combobox || tag === 'SELECT') return { action: 'skip', key: r.key, note: 'Pick from the list yourself' }
      return { action: 'fill', key: r.key }
    }
    return { action: 'unknown' }
  }

  /** The value for a key, from your profile only; null when the profile does not have it. */
  function valueFor(key, profile, extra = {}) {
    const p = profile ?? {}
    const edu = p.education?.[0] ?? {}
    const job = p.experience?.[0] ?? {}
    const v = {
      first_name: p.firstName,
      last_name: p.lastName,
      full_name: p.fullName,
      email: p.email,
      phone: p.phone,
      linkedin: p.links?.linkedin,
      github: p.links?.github,
      portfolio: p.links?.portfolio,
      earliest_start: p.eligibility?.earliestStart || null,
      current_company: job.company,
      current_title: job.title,
      school: edu.school,
      degree: edu.degree,
      discipline: /\bin (.+)$/.exec(edu.degree ?? '')?.[1] ?? null,
      graduation_year: edu.end,
      location: p.city ? [p.city, p.country].filter(Boolean).join(', ') : null,
      years_experience: p.eligibility?.yearsExperience != null ? String(p.eligibility.yearsExperience) : null,
      cover_letter: extra.coverLetter ?? null,
    }[key]
    return v === undefined || v === null || v === '' ? null : String(v)
  }

  root.JobAssistFieldMap = { classify, valueFor, SENSITIVE, RULES, clean }
})(typeof globalThis !== 'undefined' ? globalThis : window)
