# Playwright runner (companion to the extension)

Playwright cannot run *inside* a Chrome extension (it is a Node library that drives a browser from outside), so
this is a companion tool. It loads the **extension's own code** — the same field detection, answer rules,
eligibility checks and cover-letter/answer drafting — and drives your installed Chrome with **real clicks and
typing**, which the dropdown widgets on Greenhouse and others need.

```bash
npm install                                  # once (uses your installed Chrome; nothing is downloaded)
node runner/cli.mjs prepare --data export.json
```

`export.json` is the extension's **Profile → Export everything (JSON)**: your verified profile (portfolio + the
LinkedIn export and GitHub repos you imported), answers, resumes, saved jobs. Your API key is never in it.

## Commands

| Command | What it does |
|---|---|
| `prepare` | **Review-first (recommended).** Opens the application page, analyses the posting against your profile, picks the best resume, fills what your profile can answer, **asks you in the terminal** about everything else, then leaves the page open with green (filled) and orange (needs you) outlines. **You press Submit.** It never clicks Submit. After you submit, it records the application and what was sent. |
| `survey` | Read-only coverage report across portals. Opens live postings, detects the form, reports what the rules could answer. Fills and submits nothing. |
| `apply` | Unattended. Dry run unless `--live`. Stops without submitting whenever anything needs you. |
| `selftest` | The whole flow against a local fake form in a real browser (17 checks). |

`prepare` options: `--limit 3` (best matches from your saved jobs), or one job you found yourself:
`--url <company application page> --company "Acme" --title "AI Engineer" [--jd job.txt] [--location "Remote"]`;
`--ai` allows AI drafts for written questions (Gemini by default, from `GEMINI_API_KEY` in `runner/.env.local`, which is git-ignored; or `ANTHROPIC_API_KEY`). Drafts are checked for skills, numbers and outcome claims your profile does not support, and shown to you before anything is sent. Read them: a model can still phrase a true fact loosely.

## How answers are chosen (nothing is guessed)

1. **Your profile** — name, email, links, education, work, projects (from your portfolio) plus what you typed in
   Profile: phone, city, countries you may work in, visa/relocation answers, notice period, salary.
2. **Rules** — visa sponsorship and work authorization from your countries and the job's location; consent boxes;
   "prefer not to say" for diversity questions; legal agreements are **never** accepted for you.
3. **Written questions** — built only from verified facts and tailored to the posting (the skills it asks for that
   you really have, the projects that fit). Anything that needs *your* motive ("Why this company?") is shown to you
   as a draft with `[brackets]`; you type the real answer, which is saved per company.
4. **You** — anything else is asked. Your answers are stored in `runner/answers.json` (this computer only) so it
   never asks the same thing twice.
5. **The resume** — the stored version whose label best matches the posting, with the reason shown.

Before filling, `prepare` prints the match, what your profile shows for the skills asked, the **gaps**, warnings
and blockers, so you can decide whether the job is worth your time.

## What was measured (22 Oct 2026, 11 live postings, read-only, stand-in profile)

| Portal | Form found | Required questions auto-answerable | Notes |
|---|---|---|---|
| Greenhouse (Anthropic, Scale AI, xAI) | 3/3 | 63% | Dropdown widgets work with real clicks. Stops on arbitration agreements, "Why us?" essays, a few company-specific yes/no questions. |
| Ashby (OpenAI, Mistral, ElevenLabs) | 3/3 | 83% | Shortest forms; Yes/No button pairs handled. Stops on "Why us?" / "impactful project" essays. |
| Lever (Palantir, Spotify) | 2/2 | 46% | Many custom cards and check-all-that-apply groups; those are left to you. |
| Workable (Hugging Face) | 1/1 | 55% | Custom confirmation and open-source questions need you. |
| SmartRecruiters (Freshworks) | 0/1 | – | Form not reached (needs a click-through / multi-step); not working. |
| Workday (NVIDIA) | 0/1 | – | Needs an account; not automated. |

Takeaway: **fully unattended applying is not realistic** on most portals — company-specific essays, legal
agreements and unusual questions need a person — which is why `prepare` asks you and leaves the final review and
Submit to you. Expect to type a few answers per application and review the rest.

## Limits and honesty

- **No real application was submitted** while building this. The submit-and-confirm path is tested on a local form
  only; the live-site behaviour of a final Submit click is unverified.
- Invisible CAPTCHAs are present on most of these forms. The runner never solves or evades them; if a challenge
  appears it stops and tells you. Automated browsers can score lower on bot checks: if a site rejects a submission,
  press Submit yourself in the open page (which is what `prepare` does anyway).
- Multi-step forms (SmartRecruiters, Workday) fill only the first step, if that.
- Fill in the application on **your own** account/identity only; LinkedIn, Indeed and Wellfound are never automated.
- Output: `runner/out/results.jsonl`, `runner/out/tracker.json` (applications you submitted, with the answers),
  `runner/out/shots/`, survey reports. `runner/out/` and `runner/answers.json` are git-ignored.
