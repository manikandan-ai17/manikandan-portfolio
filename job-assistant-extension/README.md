# Job Application Assistant (Chrome extension)

Finds AI-company roles that genuinely match Manikandan's verified background, explains each match, fills
application forms with verified details, and tracks every application. **It never submits an application** —
you review the form, answer the sensitive questions yourself and press the site's own Submit button.

It is separate from the portfolio site: nothing under `../src`, `../public` or `../index.html` is changed, and the
site build (`tsc` on `src/` + Vite) does not include this folder.

## Install (once)

1. In Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose
   `job-assistant-extension/extension` (the `extension` sub-folder, not this one).
2. Pin the extension. Click it → **Profile** and answer what only you can give: phone, city, countries you may
   work in, visa sponsorship, relocation, languages, start date. Click **Load resume from my portfolio**
   and **Load from GitHub**.
3. Optional: LinkedIn → Settings & Privacy → Data privacy → **Get a copy of your data** → tick Profile,
   Positions, Education, Skills, Languages. When LinkedIn emails the ZIP, select it under Profile → LinkedIn.
4. Optional: an Anthropic API key under Profile → AI cover-letter drafts.

## Use

1. Click the extension → **▶ Run**. The dashboard reads the official job boards (about 2 minutes) and scores
   every engineering role. Defaults: Anthropic, OpenAI, Mistral AI, ElevenLabs, NVIDIA, Cohere, Perplexity,
   LangChain, Scale AI, xAI, Together AI, Pinecone, Runway, Stability AI. Add any Greenhouse / Ashby / Lever
   company under Profile → Job boards.
2. **Why?** shows the reasons, the skills the posting asks for with where your profile shows them (at work or in a
   project), gaps, warnings and blockers with the posting's own words.
3. **Prepare** → pick the resume version, optionally a cover letter (template, or AI draft), tick that you read
   it → **Open application page**.
4. On the official page, the assistant's panel: **Fill from my profile**. Green = filled (check them), orange =
   answer yourself (visa, authorization, demographics, agreements…), blue = left for you. Submit on the site.
5. Click **I submitted it** in the panel. The dashboard's **Applications** tab keeps company, role, link, date,
   resume version and status (interviewing, offer, rejected …), warns before a duplicate, and exports CSV.

## How matching works

`extension/src/lib/match.js` — deterministic and explainable. Score = role fit (35) + skills (35) + level (20) +
location (10); any blocker makes the role **Blocked** (still shown, with the reason, if you tick it).

Blockers: senior titles; required years ≥ about 3 (years listed only as *preferred* are a warning); a required
PhD or master's; internships that need current enrollment or a 2026+ graduation (you graduated in 2025);
on-site abroad when the posting says it does not sponsor (once you answered the visa questions); a required
language you do not speak. Skills only count as experience when your profile shows them in a job or project;
coursework (e.g. C++) and LinkedIn-listed skills are shown separately and never as work experience.

What a real run found (Oct 2026): about 2,900 open roles → about 1,000 engineering roles scored → 11 strong, 40 good,
122 stretch; 650 blocked (mostly senior titles or 4+ years). Of the internships, most require current enrollment,
so few are open to a 2025 graduate — the dashboard says so per posting.

## Privacy and safety

- Everything is stored in `chrome.storage.local` on this computer (not synced, not in any file or repository).
- The assistant never opens LinkedIn pages (LinkedIn's terms forbid scraping extensions); it reads LinkedIn's own
  export only. It stores no passwords and logs in nowhere — you sign in to job sites yourself.
- Job data comes from the companies' own public job-board APIs.
- Your API key (optional) is kept in extension storage and sent only to `api.anthropic.com`. Anyone with access
  to this browser profile could read it: use a key with a spending limit and remove it when not in use.
- **Filling a form sends data to the company before you submit, on some sites.** Seen in testing: Ashby (OpenAI,
  ElevenLabs, Mistral …) saves each answer as it is filled, and both Greenhouse and Ashby upload an attached
  resume immediately — exactly as when you attach it yourself. The panel warns on Ashby pages. Fill only when you
  mean to apply.
- Never filled, always left to you: work authorization, visa, citizenship, demographics (gender, race, veteran,
  disability), agreements and declarations, salary, relocation, "how did you hear", "why us" and other essays.

## Limits (manual steps)

- **NVIDIA (Workday)**: jobs are found and scored (up to 80 non-senior matches per run), but Workday needs an
  account, so its form is not filled — copy from Profile, then mark it applied under Applications.
- **CAPTCHAs** are never solved; the panel tells you when one is present.
- Dropdown/typeahead questions (country, location pickers, dates) are left for you.
- Resume versions are PDFs you add; the assistant suggests what to lead with but does not rewrite your resume.
  To tailor one, edit `../public/resume.html`, print it to PDF and add it in Profile → Resumes.
- Skill detection is a keyword check of the posting; read the posting before applying.

## Develop

```bash
npm install
npm test               # 35 unit tests (matcher, feeds, tracker, LinkedIn import, letters, form filling)
npm run sync-profile   # after editing ../src/data/portfolio.ts: regenerate the verified profile
npm run vendor         # rebuild the bundled Anthropic SDK (extension/src/vendor)
npm run icons
```

After `sync-profile`, reload the extension in `chrome://extensions`.
