# Job Application Assistant (Chrome extension)

Finds AI-company roles that genuinely match Manikandan's verified background, explains each match, fills
application forms with verified details, drafts answers to written questions from the real portfolio, and tracks
every application. **By default it never submits anything**: you review every answer and press the site's own Submit
button. **Optionally, Auto-apply** (off by default, dry-run first) can fill and submit applications for Strong/Good
matches on Greenhouse, Lever and Ashby company pages — see below.

It is separate from the portfolio site: nothing under `../src`, `../public` or `../index.html` is changed, and the
site build (`tsc` on `src/` + Vite) does not include this folder.

## Install (once)

1. In Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose
   `job-assistant-extension/extension` (the `extension` sub-folder, not this one). After an update, press the
   reload icon on the extension's card.
2. Pin the extension. Click it → **Profile** and answer what only you can give: phone, city, countries you may
   work in, visa sponsorship, relocation, languages, start date. Click **Load resume from my portfolio**
   and **Load from GitHub**.
3. Optional, but it makes answers sound like you: Profile → **In your own words** (something about you, what
   you are looking for, why your proudest project mattered, salary expectation).
4. Optional: LinkedIn → Settings & Privacy → Data privacy → **Get a copy of your data** → tick Profile,
   Positions, Education, Skills, Languages. When LinkedIn emails the ZIP, select it under Profile → LinkedIn.
5. Optional: a **Gemini** (or Anthropic) API key under Profile → AI drafting, for AI cover letters and for written
   questions the templates do not cover. Use **Test Gemini key** there. The key stays in browser storage.

## Use

1. Click the extension → **▶ Run**. The dashboard reads the official job boards of 33 AI companies (about 2–3
   minutes) and scores every engineering role. Among them: Anthropic, OpenAI, Mistral AI, ElevenLabs, NVIDIA,
   Cohere, Perplexity, Hugging Face, Databricks, Cursor, Sarvam AI and Freshworks (India), Scale AI, xAI. Add any
   Greenhouse / Ashby / Lever / Workable / SmartRecruiters company under Profile → Job boards.
2. **Why?** shows the reasons, the skills the posting asks for with where your profile shows them (at work or in a
   project), gaps, warnings and blockers with the posting's own words.
3. **Prepare** → resume version → optional cover letter → **written answers**: "Tell us about yourself", "Why do
   you want to join …?", "Most impactful project", "Why are you a good fit?" (plus any question you add) are
   drafted from your profile and the posting. Edit, then tick **Approved**. → **Open application page**.
4. On the application page, the panel: **Fill from my profile** (green = filled, orange = answer yourself, blue =
   left for you), then **Draft written answers** — your approved answers come first; every other written question
   gets a draft. Each one: edit → tick "I read this; it is true" → **Put in the form**. Submit on the site.
5. Any other careers site: open its application form, click the extension → **Fill this page**.
6. Click **I submitted it** in the panel. **Applications** keeps company, role, job site, link, date, resume
   version, the answers you submitted and the status; warns before a duplicate; exports CSV.

## Auto-apply (optional)

Profile → **Auto-apply** → tick *Turn on auto-apply*. Leave **Dry run** ticked at first. Add your Gemini key under
**AI drafting** and write **What you are looking for** under *In your own words* (it answers "Why do you want to
join …?"). Then click **▶ Run** in the popup (or on the Dashboard's **Auto-apply** tab).

### One-click Run

One Run, in the dashboard tab it opens (keep that tab open until it says *Run finished*):

1. Reads every enabled company job board again and scores each engineering role against your profile.
2. Picks the best Strong/Good job **per company**, skipping: companies you already applied to (tracker or an earlier
   Run), jobs a Run already finished, roles whose location does not fit (*Where* setting: countries you may work in
   or remote, by default), and a second job at a company whose first form is still waiting for you.
3. Asks **Gemini** whether the job really fits (years, degree, language, location, seniority — only from your
   profile facts and the posting). A *skip* is recorded with its reason and never retried. If the check itself fails,
   the job is skipped for this Run only.
4. Applies (steps below) until **5 applications** went through (setting: *Applications per Run*), or 12 forms were
   tried, or the suitable jobs ran out. Fewer than 5 is normal: it never applies to an unsuitable job to reach 5.
5. Records every job in **Job history** (applied, needs you, failed, poor fit), shows a notification with the
   totals, and lists form questions your profile could not answer under **Questions for you**. Answer one there and
   the next Run retries the jobs that asked it; written answers are kept per company, factual ones reused everywhere.

Failed forms are retried once on a later Run; *Applied* and *Check the tab* (Submit clicked, no confirmation seen)
are never retried. A dry run is not counted as applied, so the same jobs are tried again once you go live.

Every few hours (setting, default 6; 0 = off) the extension also checks the boards in the background and notifies
you once about new Strong/Good jobs at companies you have not applied to. It does not apply on its own; Run does.

### What happens on each form

In a background tab it opens itself:

1. Fills your details and attaches your resume (and the template cover letter, if the form has a box).
2. Answers the other required questions **only from what you typed in Profile**: work authorization and visa
   sponsorship (from your countries and your yes/no answers), relocation, notice period, "how did you hear" (company
   careers page), consent/privacy boxes (if allowed), diversity questions (**"prefer not to say"**, never a guess), and
   written questions from your saved answers, approved answers, checked AI drafts or profile-built drafts.
   An unusual multiple-choice question ("Do you have experience with X?") is answered by Gemini **only** when it
   quotes the profile text that proves the answer and that quote really is in your profile; otherwise you are asked.
3. Checks every required field is filled. If **anything** is missing, a CAPTCHA appears, a legal agreement
   (arbitration, non-compete, NDA) is required, or no rule covers a question, it **stops without submitting** and
   lists exactly why under *Results* — the tab stays open so you can finish it yourself.
4. Dry run: stops here and leaves the filled tab open for you to check. Live: clicks the site's own Submit, waits for its
   confirmation, and records the application (Applications tab, marked *via auto-apply*).

Greenhouse jobs that a company lists on its own careers site (MongoDB, Stripe, Okta, Elastic, Databricks …) are
applied to through Greenhouse's own copy of the same form (`job-boards.greenhouse.io/embed/job_app?…`), because the
careers-site version sits in a frame the assistant cannot drive.

Guard rails: only Greenhouse, Lever and Ashby company pages (never LinkedIn, Indeed, Wellfound); minimum match (Good
or Strong); a daily limit (default 10 live) and a pause between applications; no duplicates (the tracker); needs a
resume and your Profile answers (phone, city, countries, visa, relocation). It assumes you were **not referred** —
turn it off for a referred job. Keep the dashboard tab open while the queue runs; **Stop** ends it after the current job.

**Verified so far:** the answer rules and the whole fill → submit → confirm flow on test forms (`npm test`); the
whole one-click Run in a real Chromium with the real extension loaded, against local copies of the boards, forms and
Gemini (`npm run e2e`: 3 suitable companies applied to, one job per company, a previously applied company, a US-only
remote role and a poor AI fit skipped, nothing applied on the second Run); Greenhouse's embedded form page loads with
the full application form for MongoDB, Stripe, Okta, Elastic and Twilio jobs (opened, nothing submitted);
form detection, dropdown opening/reading/selection (react-select) and Yes/No answers on a **real** Anthropic
Greenhouse application page (nothing submitted); Ashby's Yes/No button groups detected on a real Cohere page
(detection only: Ashby saves answers as they are typed). **Not verified:** a real submission and the real
confirmation page — nothing was submitted to any company while building this. Run **one** job live first and watch it.
Lever pages use the same engine but were not opened live.

### Playwright runner (companion, review-first)

For the most automated *and* most careful flow, use the companion runner in [`runner/`](runner/README.md):
`node runner/cli.mjs prepare --data export.json`. It analyses each posting against your real profile, picks the
best resume, fills everything your profile can answer with real browser input, **asks you in the terminal about
anything it cannot answer**, then leaves the page open so **you** review and press Submit. `survey` measures how
well this works on each job portal without filling anything. See `runner/README.md` for results and limits.

### LinkedIn, Indeed, Wellfound

Their terms forbid extensions that read their pages or apply automatically, and they can restrict accounts that
use one, so the assistant never runs on them (it refuses there, even from "Fill this page"). Instead:

- Dashboard → **+ Add a job you found elsewhere**: paste the link, company, title and the job description. It is
  scored like the rest, tracked (no duplicates) and gets drafted answers with **Copy** buttons for their form.
  Then **I submitted it** records it, with its job site.
- Many of their postings link to the company's own careers page ("Apply on company website") — the panel works
  there (Greenhouse, Lever, Ashby, Workable, SmartRecruiters automatically; anything else via **Fill this page**).

## How answers are written

`extension/src/lib/answers.js`

- **Templates** (no key): built only from verified facts — your education and roles in order, the projects that
  best fit the posting (finished work before partial work, with its real status), duties quoted from the posting
  that match work you have done, and your own words where you wrote them.
- **Anything only you can say** (why you personally want this company, why a project mattered, a story) becomes a
  **[bracketed ask]**. An answer with an open bracket cannot be approved or put in a form.
- **AI drafts** (your key, `claude-opus-5-5`): for other questions. The model gets your verified profile, your own
  words and the job description, with strict rules: no invented employers, dates, numbers, skills, opinions or
  motivations; brackets for what it does not know; plain, specific, first-person writing without buzzwords.
- **Every answer is checked** before you approve it: skills your profile does not show, coursework presented as
  work, numbers not in your profile, stock phrases ("passionate about", "leverage" …), and the field's length limit.
- **Never drafted**: work authorization, visa, citizenship, demographics, agreements/declarations. Salary, notice
  period and start date come from your profile or are asked of you ("Also save this to my profile").

## How matching works

`extension/src/lib/match.js` — deterministic and explainable. Score = role fit (35) + skills (35) + level (20) +
location (10); any blocker makes the role **Blocked** (still shown, with the reason, if you tick it).

Blockers: senior titles; required years ≥ about 3 (years listed only as *preferred* are a warning); a required
PhD or master's; internships that need current enrollment or a 2026+ graduation (you graduated in 2025);
on-site abroad when the posting says it does not sponsor (once you answered the visa questions); a required
language you do not speak. Skills only count as experience when your profile shows them in a job or project;
coursework (e.g. C++) and LinkedIn-listed skills are shown separately and never as work experience.

What a real run found (Oct 2026, first 14 boards): about 2,900 open roles → about 1,000 engineering roles scored →
11 strong, 40 good, 122 stretch; 650 blocked (mostly senior titles or 3+/4+ years). Most internships require
current enrollment, so few are open to a 2025 graduate — the dashboard says so per posting. Sarvam AI's current
engineering roles all ask for 3+ years or are Staff level.

## Privacy and safety

- Everything is stored in `chrome.storage.local` on this computer (not synced, not in any file or repository).
- The assistant never opens LinkedIn, Indeed or Wellfound pages; LinkedIn data comes from LinkedIn's own export.
  It stores no passwords and logs in nowhere — you sign in to job sites yourself.
- Job data comes from the companies' own public job-board APIs.
- Your API keys (optional) are kept in extension storage and sent only to their provider (`api.anthropic.com` or
  `generativelanguage.googleapis.com`, in a header, never in a URL). Anyone with access
  to this browser profile could read it: use a key with a spending limit and remove it when not in use.
- **Auto-apply submits applications in your name.** Every answer it gives comes from your Profile; check a dry run first and keep the daily limit low. Nothing is sent anywhere except the company's own form (and your AI provider, for fit checks and drafts).
- **Filling a form sends data to the company before you submit, on some sites.** Seen in testing: Ashby (OpenAI,
  ElevenLabs, Mistral …) saves each answer as it is filled, and both Greenhouse and Ashby upload an attached
  resume immediately — exactly as when you attach it yourself. The panel warns on Ashby pages. Fill (and put
  answers in) only when you mean to apply.
- "Fill this page" runs only on the tab you click it on (`activeTab`), never in the background.

## Limits (manual steps)

- **NVIDIA (Workday)**: jobs are found and scored (up to 80 non-senior matches per run), but Workday needs an
  account; after signing in, **Fill this page** may fill the plain fields — the rest is yours.
- **CAPTCHAs** are never solved; the panel tells you when one is present.
- Dropdown/typeahead questions (country, location pickers, dates) are left for you.
- Resume versions are PDFs you add; the assistant suggests what to lead with but does not rewrite your resume.
  To tailor one, edit `../public/resume.html`, print it to PDF and add it in Profile → Resumes.
- Skill detection is a keyword check of the posting; read the posting before applying.

## Develop

```bash
npm install
npm test               # 87 tests (matcher, feeds, tracker, LinkedIn import, letters, answers, form filling, auto-apply, one-click Run)
npm run e2e            # one-click Run in real Chromium with the extension loaded; all network is local fakes
                       # (needs: npx playwright-core install chromium, and openssl on PATH)
npm run sync-profile   # after editing ../src/data/portfolio.ts: regenerate the verified profile
npm run vendor         # rebuild the bundled Anthropic SDK (extension/src/vendor)
npm run icons
```

After `sync-profile`, reload the extension in `chrome://extensions`.
