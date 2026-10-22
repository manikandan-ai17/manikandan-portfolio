# Job Application Assistant (Chrome extension)

Finds AI-company roles that genuinely match Manikandan's verified background, explains each match, fills
application forms with verified details, drafts answers to written questions from the real portfolio, and tracks
every application. **It never submits an application, and nothing goes into a form without your approval** — you
review everything, answer the sensitive questions yourself and press the site's own Submit button.

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
5. Optional: an Anthropic API key under Profile → AI drafting (for AI cover letters and for written questions the
   templates do not cover).

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
- Your API key (optional) is kept in extension storage and sent only to `api.anthropic.com`. Anyone with access
  to this browser profile could read it: use a key with a spending limit and remove it when not in use.
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
npm test               # 51 unit tests (matcher, feeds, tracker, LinkedIn import, letters, answers, form filling)
npm run sync-profile   # after editing ../src/data/portfolio.ts: regenerate the verified profile
npm run vendor         # rebuild the bundled Anthropic SDK (extension/src/vendor)
npm run icons
```

After `sync-profile`, reload the extension in `chrome://extensions`.
