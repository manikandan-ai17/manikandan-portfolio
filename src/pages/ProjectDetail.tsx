import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Download } from 'lucide-react'
import { motion } from 'framer-motion'
import { GithubIcon } from '@/components/ui/SocialIcons'

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
interface TechItem { name: string; purpose: string }
interface AIModel  { name: string; purpose: string }
interface APIItem  { name: string; purpose: string }
interface DBItem   { name: string; purpose: string }

interface Decision {
  decision: string
  rationale: string
  tradeoff: string
}

interface EnvVar {
  name: string
  description: string
  example: string
}

interface ProjectData {
  name: string
  tagline: string
  status: string
  statusTone: 'good' | 'partial'
  llm: string
  executiveSummary: string
  problem?: string
  designGoal?: string
  architectureDiagram?: string
  systemFlow: string[]
  techStack: TechItem[]
  aiModels: AIModel[]
  apis: APIItem[]
  database: DBItem | null
  folderStructure?: string
  features: string[]
  installation?: string[]
  envVars?: EnvVar[]
  decisions?: Decision[]
  performance: string[]
  security: string[]
  scalability: string[]
  testing: string
  results: string[]
  limitations: string[]
  gradient: string
  image?: string
  github?: string
  download?: { url: string; label: string }
  demo: string
  tech: string[]
}

// ──────────────────────────────────────────────────────────
// Project data. Every statement here was checked against the project's source code or a live check.
// ──────────────────────────────────────────────────────────
const PROJECT_DETAILS: Record<string, ProjectData> = {
  'outreach-platform': {
    name: 'B2B Outreach Platform',
    tagline: 'AI-assisted outreach platform that takes a prospect from research to outreach email, with human approval before anything is sent.',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #2563eb 100%)',
    image: '/images/p-outreach-platform.svg',
    status: 'Private · company project',
    statusTone: 'good',
    llm: 'Gemini API',
    demo: '#',
    tech: ['TypeScript', 'Node.js', 'Express', 'React', 'Vite', 'PostgreSQL', 'Prisma', 'pg-boss', 'Gemini API', 'PM2', 'Vitest'],

    executiveSummary:
      'A full-stack TypeScript platform that I designed and built from scratch at AltiusNxt Technologies. A multi-stage pipeline takes a sales prospect from research to outreach; Gemini drafts the content and a person approves it before anything is sent. It is a private company product: it is not publicly accessible and its source is private. I can demonstrate it in an interview or run it locally where permitted.',

    designGoal:
      'Keep AI drafting fast while keeping approval, sending and safeguards under human control: operating and approving are separate roles, sending sits behind feature flags, and a test-send mode exists.',

    architectureDiagram:
`React single-page app (Vite)
          │  HTTP / JSON
          ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Express API         │───────►│  PostgreSQL (Prisma) │
│  (TypeScript)        │        │  68 models           │
└──────────┬───────────┘        └──────────────────────┘
           │ jobs
           ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Background worker   │───────►│  Gemini API          │
│  (pg-boss queue)     │        │  (behind an adapter) │
└──────────┬───────────┘        └──────────────────────┘
           │
           ▼
   Email (SMTP), sending behind feature flags

   The API and the worker run as two separate PM2 processes.`,

    systemFlow: [
      'Research: the pipeline finds prospects and gathers company data.',
      'Enrich: company details and intent signals are added.',
      'Contacts: the relevant decision-makers are identified.',
      'Draft: Gemini writes personalised outreach, including sequences with follow-ups.',
      'Approve: a user with the approver role signs off. By default, nobody can approve their own work.',
      'Send: email goes out behind feature flags, and a test-send mode exists. LinkedIn output is a draft that a person sends.',
      'Track: engagement with the outreach is tracked.',
    ],

    techStack: [
      { name: 'TypeScript, Node.js, Express', purpose: 'API server with helmet, rate limiting and zod request validation.' },
      { name: 'React, Vite', purpose: 'Front-end single-page application.' },
      { name: 'PostgreSQL, Prisma', purpose: '68 database models and 44 migrations.' },
      { name: 'pg-boss', purpose: 'Background job queue, consumed by a separate worker process.' },
      { name: 'Gemini API', purpose: 'Drafting and reasoning steps, called through an adapter interface that also has a fake adapter for tests.' },
      { name: 'nodemailer', purpose: 'SMTP email sending.' },
      { name: 'PM2', purpose: 'Runs the API and the worker as separate processes with restart policies.' },
      { name: 'Vitest', purpose: 'Unit and integration tests.' },
    ],

    aiModels: [
      { name: 'Gemini', purpose: 'Drafts outreach content and supports the analysis steps. Used through a provider interface so tests can run against a fake model.' },
    ],
    apis: [
      { name: 'SMTP', purpose: 'Outbound email.' },
    ],
    database: { name: 'PostgreSQL via Prisma', purpose: '68 models and 44 migrations, from 25 Aug to 17 Oct 2026.' },

    features: [
      'Multi-stage pipeline from prospect research and enrichment to outreach and engagement tracking, run by a background worker queue.',
      'Personalised email drafting with Gemini, sequences with follow-ups, a suppression list, a test-send mode and a manual-send flow.',
      'Bulk email with Excel recipient import, attachments, templates, open tracking and a report of skipped recipients.',
      'Four user roles; approving is separate from operating, and self-approval is off by default.',
      'Sign-in with email one-time codes or passwords.',
      'LinkedIn output is draft-only: a person sends it.',
    ],

    performance: [],
    security: [
      'Four roles (viewer, operator, approver, admin) with approval separated from operation.',
      'One-time email codes are hashed, single-use and attempt-limited.',
      'helmet and rate limiting on the API.',
    ],
    scalability: [
      'The API and the background worker run as separate processes.',
    ],

    testing:
      'About 3,100 test cases in 183 test files (147 backend, 36 front end), counted from the source. They were not run for this page.',

    results: [
      'Source reviewed on 22 Oct 2026: about 74,000 lines of TypeScript in the backend, 32,000 in the React app and 42,000 in tests.',
      'Git history: 58 commits from 3 Sep to 21 Oct 2026. 50 are mine; the other 8 are pull-request merge commits.',
      'File dates and the first database migration begin on 25 Aug 2026, before the first commit on 3 Sep, so the repository was created after development started.',
    ],

    limitations: [
      'Private company product: it cannot be tried from outside, and I do not quote usage or email-volume figures.',
      'Several capabilities, such as bulk sending, are switched off by default through feature flags.',
    ],
  },

  'cad-drawing-agent': {
    name: 'CAD Drawing Analysis Agent',
    tagline: 'Reads engineering-drawing PDFs and answers questions about them, with every answer tied to a highlighted mark on the page.',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #2563eb 100%)',
    image: '/images/p-cad-drawing-agent.svg',
    status: 'Public source · runs locally',
    statusTone: 'good',
    llm: 'Gemini vision + PyMuPDF',
    github: 'https://github.com/manikandan-ai17/Pdf-Cad-Drawing-Analizer',
    demo: '#',
    tech: ['Python', 'FastAPI', 'PyMuPDF', 'Gemini API', 'NumPy', 'pdfplumber', 'openpyxl', 'JavaScript'],

    executiveSummary:
      'A Python/FastAPI application that analyses CAD drawing PDFs by comparing two independent readings of each page: the PDF’s own vector geometry and text layer, and a Gemini vision model that never sees that text. Where the two agree, confidence rises. Where they disagree, the conflict is reported instead of being resolved silently. The source code is public; no hosted demo is running at the moment.',

    problem:
      'A drawing PDF holds exact data written by the CAD system (vector geometry and a text layer) and content that only a vision model can read from the rendered page. Either source alone can be wrong: a model can misread a glyph, and many scanned drawings have no text layer at all (only 9 of the 26 benchmark files had one).',

    designGoal:
      'Treat a drawing as evidence to be corroborated, not an image to describe. A missing dimension, tolerance or unit stays missing, and “insufficient evidence” is a supported answer.',

    architectureDiagram:
`PDF
 ├─ PyMuPDF ──► page classification    VECTOR | RASTER | HYBRID | NON-DRAWING
 │              vector geometry        lines, rects, circles, arcs, dash styles
 │              text layer             per-line text + boxes + rotation
 │
 ├─ render 300 dpi ──► 5 concurrent vision passes, each schema-constrained:
 │                       structure    views, title block, tables, cutting planes
 │                       annotations  verbatim text + leader targets
 │                       features     holes, slots, fillets, threads
 │                       gdt          control frames, datums, finish, welds
 │                       titleblock   fields, notes, revisions, BOM
 │
 └─ cross-validation ──► dimensions, features, GD&T, warnings, derived scale
                         confidence per item, conflicts reported verbatim`,

    systemFlow: [
      'Upload a PDF (up to 60 MB, must start with a %PDF- header). Pages are classified; non-drawing pages are skipped before any model call.',
      'PyMuPDF extracts vector geometry (lines, circles, arcs) and the text layer with positions.',
      'Each drawing page is rendered at 300 dpi and sent through five concurrent, schema-constrained Gemini vision passes. The vision stage is never shown the text layer.',
      'Cross-validation compares the readings: text agreement, page scale derived from matched circles, sizes against geometry, and feature counts against geometry.',
      'Every item gets a confidence (HIGH, MEDIUM or LOW) with a separate value confidence and association confidence; conflicts are reported verbatim.',
      'The browser workspace shows evidence overlays, answers questions with cited item IDs, builds a named-attribute extraction table, and exports Excel, CSV or JSON.',
    ],

    techStack: [
      { name: 'Python, FastAPI', purpose: 'HTTP API: upload, analyse, status polling, result, ask, extract and export endpoints.' },
      { name: 'PyMuPDF', purpose: 'Page classification, vector geometry, text layer and page rendering.' },
      { name: 'pdfplumber, NumPy', purpose: 'PDF text handling and numeric work such as circle fitting and scale derivation.' },
      { name: 'Gemini API', purpose: 'Schema-constrained vision passes, question answering and attribute mapping.' },
      { name: 'openpyxl', purpose: 'Excel export of extraction results.' },
      { name: 'Vanilla JavaScript', purpose: 'Browser workspace with no build step and no frontend dependencies.' },
      { name: 'pytest', purpose: '329 automated tests over the deterministic stages.' },
    ],

    aiModels: [
      { name: 'Gemini (default gemini-3.1-pro-preview)', purpose: 'Five vision passes per page, question answering and attribute-to-item mapping. Falls back to gemini-2.5-pro when the primary model fails.' },
    ],
    apis: [
      { name: 'Google Gemini API', purpose: 'Schema-constrained responses with retries and model fallback.' },
    ],
    database: { name: 'File storage, no database', purpose: 'Each upload gets a folder holding the PDF, rendered pages and result.json.' },

    features: [
      'Page classification into vector, raster, hybrid and non-drawing before any model call.',
      'Two-part confidence: how sure the value is, and how sure it is attached to the right feature.',
      'Checks diameters and radii against circles fitted in the vector layer, and feature counts against drawn geometry.',
      'Page scale derived from matched callouts; reported as underivable rather than guessed when fewer than two matches exist.',
      'Question answering whose answers cite item IDs; an ID that does not exist is reported as unresolved and lowers confidence.',
      'Named-attribute extraction table with page, source text, evidence and confidence, exported to Excel, CSV or JSON.',
    ],

    folderStructure:
`cad_agent/
  config.py         settings from .env
  geometry.py       box maths, circle fitting, dimension-text parsing
  pdf_vector.py     vector/text extraction, page classification, rendering
  gemini.py         schema-constrained API client, retries, model fallback
  prompts.py        the five pass prompts and their JSON schemas
  crossvalidate.py  evidence reconciliation and confidence assignment
  analyze.py        pipeline orchestration
  qa.py             question answering + evidence resolution
  associate.py      dimension -> leader -> geometry association
  extract.py        structured attribute extraction over an analysis
  static/           workspace UI (no build step)
server.py           FastAPI API
run.py              launcher
tools/              CLI, sample-drawing generator, replay tool
tests/              automated tests`,

    installation: [
      'Install the dependencies with `pip install -r requirements.txt`.',
      'Copy `.env.example` to `.env` and add your Google AI Studio key as `GEMINI_API_KEY`.',
      'Optionally generate a test drawing with `python tools/make_sample.py samples/mounting_plate.pdf`.',
      'Start the app with `python run.py` and open `http://127.0.0.1:8000`.',
    ],

    envVars: [
      { name: 'GEMINI_API_KEY', description: 'Required for analysis; classification works without it', example: 'your key' },
      { name: 'GEMINI_MODEL', description: 'Primary model; must support images and responseSchema', example: 'gemini-3.1-pro-preview' },
      { name: 'GEMINI_FALLBACK_MODEL', description: 'Used when the primary model fails', example: 'gemini-2.5-pro' },
      { name: 'ANALYSIS_DPI', description: 'Resolution sent to the model', example: '300' },
      { name: 'RENDER_DPI', description: 'Resolution served to the viewer', example: '200' },
      { name: 'MAX_CONCURRENCY', description: 'Parallel vision passes', example: '5' },
    ],

    decisions: [
      {
        decision: 'The vision stage never sees the PDF text layer',
        rationale: 'Corroboration is only meaningful between independent readings; showing the model the answer would destroy the cross-check.',
        tradeoff: 'It costs roughly five model calls per drawing page.',
      },
      {
        decision: 'Value confidence and association confidence are tracked separately',
        rationale: 'They fail differently. A value two sources agree on is still reliable even when its leader line could not be traced, so a weak association caps the result at MEDIUM rather than LOW.',
        tradeoff: 'Association failures never reach LOW, so genuinely LOW findings are not buried in noise.',
      },
      {
        decision: 'No nearest-neighbour fallback when matching values to features',
        rationale: 'Attaching a value to the wrong feature is worse than reporting no association.',
        tradeoff: 'Some values stay unassociated and need a human look.',
      },
    ],

    performance: [
      'Five vision passes per page run concurrently (MAX_CONCURRENCY).',
      'Non-drawing pages are classified and skipped before any model call.',
      'Each page’s raw model response is saved, so validation logic can be re-run without new API calls.',
    ],
    security: [
      'Uploads must start with a %PDF- header and are capped at 60 MB.',
      'Document IDs are checked against a fixed 12-character pattern before any file path is built.',
    ],
    scalability: [
      'Single-machine design: analysis runs on a worker thread and files live on local disk. It is not built to scale horizontally.',
    ],

    testing:
      '329 automated tests pass (python -m pytest tests, run on 22 Oct 2026). They cover parsing, geometry, confidence rules and API routes. The vision calls themselves are not tested because they need the network and are not deterministic.',

    results: [
      'Benchmark on 26 real packaging drawings (36 pages): 90.3% dimension recall (308 of 341) and 97.7% value precision on the values it found.',
      'Radius accuracy 95.5% and linear accuracy 86.7% in the same benchmark.',
      'Ground truth was labelled by a different model family (Claude). A second pass agreed on 327 of 335 sampled items (97.6%). It is model-assisted, not human-labelled.',
    ],

    limitations: [
      'Hole-count accuracy was 28.6% and diameter typing 59.1% in the same benchmark.',
      'Fixes were made after failures found on these same drawings, so the figures are development-set results, not a blind test.',
      'Needs a Gemini API key and makes roughly five model calls per page.',
      'Linear dimensions are not verified against geometry. Page scale needs at least two matched diameter or radius callouts.',
    ],
  },

  'catalogwiz': {
    name: 'CatalogWiz',
    tagline: 'Product-catalog enrichment and review platform. Company project; about 60% completed by me before it was reassigned.',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #2563eb 100%)',
    image: '/images/p-catalogwiz.svg',
    status: 'Partial · reassigned',
    statusTone: 'partial',
    llm: 'Gemini API',
    demo: '#',
    tech: ['React', 'Vite', 'MUI', 'Node.js', 'Express', 'MongoDB', 'Python', 'Gemini API', 'AWS SQS', 'AWS S3', 'Shopify API', 'WooCommerce API'],

    executiveSummary:
      'CatalogWiz is a multi-service application for enriching and reviewing product-catalog data with Gemini. It was assigned to me as a trainee at AltiusNxt Technologies; I completed roughly 60% of it before it was reassigned to another developer, so it is not a finished product by me. This page describes the version I worked on. The source is private.',

    architectureDiagram:
`┌──────────────────────┐
│  React review UI     │
│  (Vite, MUI)         │
└──────────┬───────────┘
           ▼
┌──────────────────────┐        ┌──────────────────┐
│  Node / Express API  │───────►│  MongoDB         │
│  JWT auth, Zod       │        │  (Mongoose)      │
└───────┬──────┬───────┘        └──────────────────┘
        │      │
        │      └──► Shopify (Admin GraphQL) and WooCommerce sync
        ▼
┌──────────────────────┐        ┌──────────────────┐
│  AWS SQS queues      │───────►│  Python workers  │───► Gemini API
│  (enrich, audit ...) │        │  (SQS polling)   │
└──────────────────────┘        └──────────────────┘`,

    systemFlow: [
      'Import a product spreadsheet and map its headers to catalog fields.',
      'Enrichment jobs are queued on AWS SQS; a Python worker scrapes supplier pages and asks Gemini for attributes.',
      'Content jobs generate SEO titles, descriptions, bullet points and meta text.',
      'Audit-and-fix and benchmark workers raise issues per product and propose corrections.',
      'Products are classified against a taxonomy.',
      'People review the results in the React interface: bulk review and approval, with brand-tone, restricted-word and generation-rule settings.',
      'Approved products can be synced to Shopify or WooCommerce.',
    ],

    techStack: [
      { name: 'React, Vite, MUI', purpose: 'Review interface and settings screens.' },
      { name: 'Node.js, Express', purpose: 'API with JWT authentication and zod request validation; documented with Swagger.' },
      { name: 'MongoDB', purpose: 'Catalog data, users and settings, accessed with Mongoose.' },
      { name: 'AWS SQS', purpose: 'Separate queues for enrichment, content, taxonomy, audit, audit-fix and benchmark jobs.' },
      { name: 'Python workers', purpose: 'Poll the queues and call Gemini for enrichment, content, audit and benchmarking.' },
      { name: 'Shopify, WooCommerce', purpose: 'Sync clients for publishing reviewed products.' },
    ],

    aiModels: [
      { name: 'Gemini 2.0 Flash', purpose: 'Used by the Python workers for enrichment, auditing and benchmarking; the content worker reads its model from configuration.' },
    ],
    apis: [
      { name: 'Shopify Admin GraphQL API', purpose: 'Find, create and update products.' },
      { name: 'WooCommerce API', purpose: 'Product sync.' },
      { name: 'AWS SQS and S3', purpose: 'Job queues and image storage.' },
    ],
    database: { name: 'MongoDB', purpose: 'Catalog items, users and configuration.' },

    features: [
      'Import product spreadsheets and map their headers to catalog fields.',
      'Gemini-based enrichment: attribute extraction from scraped supplier pages, plus SEO titles, descriptions and bullet points.',
      'Audit-and-fix and benchmark workflows that raise issues per product and propose corrections.',
      'Taxonomy classification of products.',
      'React review interface with bulk review and approval.',
      'Shopify and WooCommerce sync clients, with multi-user JWT authentication.',
    ],

    performance: [],
    security: [],
    scalability: [
      'Work is split across queues and separate Python workers, so enrichment does not run inside the API process.',
    ],

    testing: 'No automated tests in the version I worked on.',

    results: [
      'Source reviewed on 22 Oct 2026: about 11,700 lines of JavaScript in the API, 30,700 in the React app and 2,400 lines of Python in the workers.',
      'Features above are taken from the code of the version I worked on, not from documentation.',
    ],

    limitations: [
      'Not completed by me: it was reassigned at roughly 60%, and I cannot speak for what was added afterwards.',
      'No automated tests, and no container or CI configuration, in the version I worked on.',
      'Private company code with no public demo; details are discussed in interviews.',
    ],
  },

  'audit-pipeline': {
    name: 'Audit Pipeline',
    tagline: 'Pilot-first audit of vendor product spreadsheets with Gemini.',
    gradient: 'linear-gradient(135deg, #be185d 0%, #2563eb 100%)',
    image: '/images/p-audit-pipeline.svg',
    status: 'Private · company server',
    statusTone: 'good',
    llm: 'Gemini API',
    demo: '#',
    tech: ['Python', 'FastAPI', 'React', 'Gemini API', 'Gemma (custom endpoint)', 'pandas', 'openpyxl', 'Playwright'],

    executiveSummary:
      'A web tool that audits product-data spreadsheets. You upload a workbook, run a small pilot batch, review the findings, give feedback and re-run the pilot, and only then approve the full batch and download the audited workbook. It runs on a company server and is not publicly linked.',

    designGoal:
      'Catch a model mistake on a small batch, with a person reviewing, before it runs across a whole workbook.',

    architectureDiagram:
`Browser UI ──► FastAPI
                 ├─ upload      .xlsx workbook
                 ├─ pilot       small batch first
                 ├─ revise      re-run pilot with feedback
                 ├─ approve     run the full batch
                 └─ download    pilot file / audited workbook
                         │
                         ▼
              Audit engine: rules + per-product model check
              (Gemini, or Gemma through a custom endpoint)
                         │
                         ▼
              openpyxl write-back into the workbook
              Jobs and settings stored as files on disk`,

    systemFlow: [
      'Upload an .xlsx file, then choose the sheet and the pilot size.',
      'Run the pilot on a small number of products.',
      'Review the pilot results and download the pilot file.',
      'Give free-text feedback and re-run the pilot with that guidance, as many times as needed.',
      'Approve to process the remaining rows.',
      'Download the audited workbook.',
    ],

    techStack: [
      { name: 'FastAPI', purpose: 'Job API: upload, pilot, revise, approve and download endpoints.' },
      { name: 'React', purpose: 'Front end of the audit tool.' },
      { name: 'Gemini 2.5 Flash', purpose: 'Main model for the per-product checks.' },
      { name: 'Gemma (custom endpoint)', purpose: 'Optional provider that sends rows to a Gemma model served over HTTP.' },
      { name: 'pandas, openpyxl', purpose: 'Reading the workbook and writing audit flags and comments back.' },
      { name: 'Scrape.do, Playwright', purpose: 'Fetching source pages: a metered service, or a headless-browser fallback.' },
    ],

    aiModels: [
      { name: 'Gemini 2.5 Flash', purpose: '474 of the 577 model calls in the tool’s usage log.' },
      { name: 'Gemma (label “gemma-base”)', purpose: '103 logged audit calls on 24–28 Jul 2026, served through a custom HTTP endpoint.' },
    ],
    apis: [
      { name: 'Google Gemini API', purpose: 'Per-product verification.' },
      { name: 'Scrape.do (optional)', purpose: 'Fetching supplier pages.' },
    ],
    database: { name: 'File storage, no database', purpose: 'Jobs, cache and settings are stored as JSON and text files.' },

    features: [
      'Upload an .xlsx file, choose the sheet and the pilot size.',
      'Pilot run with review, a downloadable pilot file, and free-text feedback that re-runs the pilot with guidance.',
      'Approve to process the remaining rows, then download the audited workbook.',
      'Gemini is the main model. An optional provider can send rows to a Gemma model served from a custom HTTP endpoint instead.',
    ],

    performance: [],
    security: [],
    scalability: [],

    testing:
      'The related Audit Tool codebase has 7 test files with about 99 test functions (counted, not run).',

    results: [
      'Checked on 22 Oct 2026: the deployed application’s client code calls the pilot, revise, approve and download endpoints described above.',
      'The usage log records 577 model calls: 474 to Gemini 2.5 Flash and 103 to “gemma-base”.',
    ],

    limitations: [
      'No accuracy benchmark. The pilot-and-review step is the quality control.',
      'Jobs and settings are stored as files on disk; there is no database.',
      'The Gemma path shows that I ran a Gemma model behind an endpoint. It is not a claim about fine-tuning.',
    ],
  },

  'dtlp-extension': {
    name: 'DTLP Data Extraction Extension',
    tagline: 'Chrome extension that extracts structured product attributes from web pages, PDFs and Excel lists using an LLM.',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #2563eb 100%)',
    image: '/images/p-dtlp-extension.svg',
    status: 'Runs unpacked in Chrome',
    statusTone: 'good',
    llm: 'Perplexity or Gemini',
    demo: '#',
    tech: ['JavaScript', 'Chrome Extension (MV3)', 'Perplexity API', 'Gemini API', 'PDF.js', 'SheetJS', 'IndexedDB'],

    executiveSummary:
      'A Manifest V3 Chrome extension, built during my internship at Deep Tech Launchpad, that sends page, PDF or spreadsheet content to Perplexity (sonar-pro) or Gemini (1.5 Flash), chosen per run, and returns the attributes you define as JSON. It is not published on the Chrome Web Store and the repository is private; it runs by loading the folder at chrome://extensions with your own API key.',

    architectureDiagram:
`popup.js (UI + AI calls)
   │  one provider per run
   ├──────────────► Perplexity sonar-pro   (temperature 0.1)
   └──────────────► Gemini 1.5 Flash       (temperature 0.1)

content.js ──► page text for extraction
PDF.js     ──► PDF files (first 10 pages)
SheetJS    ──► Excel URL lists
background.js (service worker) ──► API-key validation, IndexedDB templates

Results ──► JSON copied to clipboard, CSV download`,

    systemFlow: [
      'Choose a provider (Perplexity or Gemini) and a category template with the attributes to extract.',
      'The extension gathers content from the current page, a PDF (first 10 pages) or a list of URLs from an Excel file.',
      'The content and attribute definitions are sent to the chosen model with a low temperature (0.1).',
      'The response is parsed as JSON and shown in a results table.',
      'Copy the JSON to the clipboard or download a CSV.',
    ],

    techStack: [
      { name: 'Manifest V3', purpose: 'Service worker, content scripts and popup UI.' },
      { name: 'Perplexity sonar-pro', purpose: 'One of the two selectable extraction models.' },
      { name: 'Gemini 1.5 Flash', purpose: 'The other selectable extraction model.' },
      { name: 'PDF.js', purpose: 'Reading PDF files (first 10 pages).' },
      { name: 'SheetJS', purpose: 'Reading Excel lists of URLs.' },
      { name: 'IndexedDB', purpose: 'Stores category templates and value mappings.' },
    ],

    aiModels: [
      { name: 'Perplexity sonar-pro', purpose: 'Extraction when selected; the two models are alternatives, not a verification pair.' },
      { name: 'Gemini 1.5 Flash', purpose: 'Extraction when selected.' },
    ],
    apis: [
      { name: 'Perplexity API', purpose: 'Called directly from the popup with the user’s own key.' },
      { name: 'Google Gemini API', purpose: 'Called directly from the popup with the user’s own key.' },
    ],
    database: { name: 'IndexedDB and chrome.storage.local', purpose: 'Templates and mappings in IndexedDB; API keys and attribute definitions in chrome.storage.local.' },

    features: [
      'Category templates and value mappings guide which attributes are extracted.',
      'Inputs: the current page, PDF files, Excel lists and multi-URL batches.',
      'Draggable in-page overlay and a token-usage display.',
      'JSON copy to clipboard and CSV download.',
      'Client-side only: there is no backend server.',
    ],

    installation: [
      'Open `chrome://extensions` and switch on Developer mode.',
      'Choose Load unpacked and select the `dtlp_extension` folder.',
      'Open the extension, go to Settings and enter your own Perplexity or Gemini API key; it is validated when saved.',
      'Pick a category, define the attributes and run the extraction.',
    ],

    performance: [],
    security: [
      'API keys are entered by the user and stored in browser local storage.',
    ],
    scalability: [],

    testing: 'No automated tests.',

    results: [
      'About 6,300 lines of JavaScript, plus CSS and HTML, in the extension source.',
      'The two models are alternatives: the extension does not run one model’s output through a second model.',
    ],

    limitations: [
      'No schema validation or retry: the response is parsed as JSON and an error is raised if that fails, so results need human review.',
      'No automated tests.',
      'Requests access to all URLs, as on-page extraction requires.',
    ],
  },

  'job-assistant': {
    name: 'Job Application Assistant',
    tagline: 'A Chrome extension you can install: it finds engineering roles on official company job boards, checks each against your own details, and fills the application forms for you to review.',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #047857 100%)',
    image: '/images/p-job-assistant.svg',
    status: 'Free download · runs unpacked in Chrome',
    statusTone: 'good',
    llm: 'Gemini API (optional)',
    github: 'https://github.com/manikandan-ai17/manikandan-portfolio/tree/main/job-assistant-extension',
    download: { url: '/downloads/job-assistant-extension.zip', label: 'Download the extension (ZIP)' },
    demo: '#',
    tech: ['JavaScript', 'Chrome Extension (MV3)', 'Gemini API', 'Playwright', 'Vitest'],

    executiveSummary:
      'A personal project, built to make my own job search faster and then packaged so anyone can use it. It reads the public job boards that companies publish themselves, scores each engineering role against the details you type in (a skill only counts if your own details back it), explains the match, and can fill and submit application forms on Greenhouse, Lever and Ashby pages. Everything runs in your browser and stays there. Auto-apply is off by default and starts as a dry run that fills a form but does not submit it. It never runs on LinkedIn, Indeed or Wellfound.',

    problem:
      'Finding suitable roles and typing the same details into every application form takes hours, and tools that apply on your behalf tend to guess answers. This one answers only from what you told it and stops to ask when it cannot.',

    architectureDiagram:
`Popup / Dashboard / Profile (extension pages)
   │  Run
   ▼
Search ──► public job-board APIs (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Workday)
   ▼
Match (explainable rules) ──► optional Gemini fit check
   ▼
Application tab ──► content script fills the form
   │  a question your profile cannot answer?
   └──► "Questions for you" (saved, reused on later forms)

Service worker ──► new-job alerts (alarms + notifications)
chrome.storage.local ──► details, resumes, history (stays in your browser)`,

    systemFlow: [
      'Type your details once (name, education, work, projects, skills) and add your resume PDF.',
      'Run reads the public job boards of 51 companies and scores each engineering role against your details.',
      'Roles you do not qualify for are blocked and the reason is shown, for example a senior title or more required years than you have.',
      'Optionally, Gemini checks the fit of each candidate; its decision and reasons are recorded.',
      'With auto-apply on (dry run first), the extension opens one application page per company, fills your details, attaches the resume and answers the questions it can from your profile.',
      'Questions it cannot answer are listed under “Questions for you”. Answers you save are reused on later forms.',
      'You review the filled form. In live mode it clicks the site’s own Submit and records the application only after the site shows a confirmation.',
    ],

    techStack: [
      { name: 'JavaScript (ES modules)', purpose: 'The whole extension, with no build step.' },
      { name: 'Manifest V3', purpose: 'Service worker, content scripts, alarms and notifications.' },
      { name: 'chrome.storage.local', purpose: 'Your details, resumes, application history and saved answers, kept in the browser.' },
      { name: 'Gemini API (optional)', purpose: 'Fit check, multiple-choice answers backed by a quote from your profile, and written-answer drafts.' },
      { name: 'Playwright', purpose: 'A companion command-line runner and the browser-level end-to-end test.' },
      { name: 'Vitest + jsdom', purpose: 'Unit tests, including the form-filling engine on test pages.' },
    ],

    aiModels: [
      { name: 'Gemini 2.5 Flash (default)', purpose: 'Fit check, multiple-choice answers and written drafts, with your own key. Claude can be used instead.' },
    ],
    apis: [
      { name: 'Public job-board APIs', purpose: 'Greenhouse, Lever, Ashby, Workable, SmartRecruiters and Workday job listings, read without a login.' },
      { name: 'Google Gemini API', purpose: 'Called with your own key, sent in a request header and never in a URL.' },
      { name: 'GitHub public API (optional)', purpose: 'Loads your public repositories as project evidence if you add your GitHub link.' },
    ],
    database: { name: 'chrome.storage.local', purpose: 'Everything is stored in your browser. Nothing is sent to a server of mine.' },

    features: [
      'Explainable match for every role: matched skills, gaps and blockers, each with the reason.',
      'One-click Run: search, pick the best role at each company, check the fit, apply to up to 5 different companies. It applies to fewer when fewer qualify.',
      'Never the same job or company twice; every outcome is kept in a history (applied, needs you, failed, poor fit).',
      '“Questions for you”: anything your profile cannot answer is asked once and reused.',
      'A multiple-choice question is answered by the AI only when it can quote the line in your profile that proves the answer.',
      'Alerts about new matching jobs, once each.',
      'Dry run by default, a daily limit and a pause between applications.',
    ],

    installation: [
      'Download the ZIP with the button below and unzip it.',
      'Open `chrome://extensions`, switch on Developer mode and choose Load unpacked, then select the unzipped `job-assistant-extension` folder.',
      'Open the extension, then Profile. Fill in Your details, Answers only you can give, and add your resume (PDF).',
      'Optional: paste your own Gemini or Claude key under AI drafts for the fit check and drafted answers.',
      'Run it with Auto-apply off to see matches first. If you turn Auto-apply on, keep Dry run ticked until you have checked a few filled forms.',
    ],

    performance: [],
    security: [
      'API keys are entered by you and kept in this browser’s extension storage.',
      'It never opens or reads LinkedIn, Indeed or Wellfound, stores no passwords and logs in nowhere.',
      'CAPTCHAs are never solved and legal agreements (arbitration, non-compete) are never accepted: the run stops instead.',
      'Demographic, disability, veteran and similar questions are never answered by the AI.',
    ],
    scalability: [],

    testing:
      '92 automated tests (Vitest) cover matching, job-board parsing, answer rules, form filling, the one-click Run and the editable profile. A separate script runs a whole Run in real Chromium with the extension loaded, against local copies of the job boards, forms and Gemini, and all 10 of its checks pass. The companion runner’s 17-check self-test passes.',

    results: [
      'In that browser run, a Run applied to the 3 suitable companies (one job per company), skipped a company already applied to, a US-only remote role and a role the AI judged a poor fit, and a second Run applied to nobody.',
      'Form detection, dropdown handling and Yes/No answers were checked on a real Greenhouse application page, with nothing submitted.',
    ],

    limitations: [
      'During development no application was submitted to a real company. Run it in dry-run mode first and watch the first live run.',
      'Only Greenhouse, Lever and Ashby forms are filled. Workday, SmartRecruiters and Workable roles are searched but not automated.',
      'LinkedIn, Indeed and Wellfound are not supported on purpose: their terms forbid it and accounts can be restricted.',
      'Role matching reads keywords in the posting, so read the posting before you apply. Ashby saves answers as they are typed, and sites upload an attached resume immediately.',
      'It loads unpacked in Chrome; it is not in the Chrome Web Store.',
    ],
  },
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────
const SectionHeading = ({ label, title }: { label: string; title: string }) => (
  <div style={{ marginBottom: '1.25rem' }}>
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.68rem', fontWeight: 700,
      color: '#2563eb', textTransform: 'uppercase',
      letterSpacing: '1.5px', marginBottom: '4px',
    }}>
      {label}
    </div>
    <h2 style={{
      fontSize: '1.2rem', fontWeight: 800,
      color: 'var(--text)',
      borderBottom: '1px solid rgba(128,128,128,0.15)',
      paddingBottom: '0.6rem',
    }}>
      {title}
    </h2>
  </div>
)

const CodeBlock = ({ children, label }: { children: string; label?: string }) => (
  <div style={{ marginTop: label ? '0.5rem' : '0' }}>
    {label && (
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.68rem', fontWeight: 700,
        color: 'var(--text-secondary)', marginBottom: '6px',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>{label}</div>
    )}
    <pre style={{
      background: '#0d1117',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem',
      overflowX: 'auto',
      fontSize: '0.78rem',
      lineHeight: 1.7,
      color: '#c9d1d9',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      margin: 0,
    }}>
      {children}
    </pre>
  </div>
)

// ──────────────────────────────────────────────────────────
// Animation variant
// ──────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
}

// ──────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────
export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const project = id ? PROJECT_DETAILS[id] : undefined

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Project not found</h2>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Back to Portfolio
        </button>
      </div>
    )
  }

  let sectionCount = 0
  const nextLabel = (name: string) => `${String(++sectionCount).padStart(2, '0')} — ${name}`
  let motionIdx = 0

  const Section = ({ label, title, children }: { label: string; title: string; children: React.ReactNode }) => (
    <motion.section
      custom={motionIdx++} variants={fadeUp} initial="hidden" animate="visible"
      style={{ marginBottom: '3rem' }}
    >
      <SectionHeading label={label} title={title} />
      {children}
    </motion.section>
  )

  const textStyle = { color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', margin: 0 }
  const listStyle = { margin: 0, paddingLeft: '1.25rem', display: 'flex' as const, flexDirection: 'column' as const, gap: '8px' }
  const liStyle = { color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem' }

  const statusStyle = project.statusTone === 'partial'
    ? { background: 'rgba(245,158,11,0.25)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.4)' }
    : { background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.35)' }

  const hasQuality = project.performance.length + project.security.length + project.scalability.length > 0
  const hasInteg = project.aiModels.length + project.apis.length > 0 || project.database

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: project.gradient }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 2rem 0' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px',
              padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>
        </div>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 2rem 3rem' }}>
          {/* Status + LLM badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              ...statusStyle,
              borderRadius: '100px', padding: '3px 12px',
              fontSize: '0.7rem', fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {project.status}
            </span>
            <span style={{
              background: 'rgba(96,165,250,0.2)', color: '#93c5fd',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: '100px', padding: '3px 12px',
              fontSize: '0.7rem', fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.5px',
            }}>
              {project.llm}
            </span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}
          >
            {project.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, maxWidth: '700px' }}
          >
            {project.tagline}
          </motion.p>

          {/* Tech pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1.5rem' }}
          >
            {project.tech.map(t => (
              <span key={t} style={{
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '100px', padding: '4px 14px',
                fontSize: '0.78rem', fontWeight: 600,
              }}>
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 2rem 6rem' }}>

        {/* Visual */}
        {project.image && (
          <motion.section
            custom={-1} variants={fadeUp} initial="hidden" animate="visible"
            style={{ marginBottom: '3rem' }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                00 — Visual
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid rgba(128,128,128,0.15)', paddingBottom: '0.6rem' }}>
                Project Overview
              </h2>
            </div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              style={{
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                background: '#0d1117',
              }}
            >
              <img
                src={project.image}
                alt={`${project.name} — overview`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{
                padding: '8px 14px',
                background: 'rgba(0,0,0,0.4)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}>
                Pipeline overview (illustration of the verified flow)
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* Executive Summary */}
        <Section label={nextLabel('Overview')} title="Executive Summary">
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px', padding: '1.5rem 1.75rem',
            borderLeft: '4px solid #2563eb',
          }}>
            <p style={textStyle}>{project.executiveSummary}</p>
          </div>
        </Section>

        {/* Problem + design goal */}
        {(project.problem || project.designGoal) && (
          <Section label={nextLabel('Problem Space')} title="The Problem and the Design Goal">
            {project.problem && (
              <p style={{ ...textStyle, marginBottom: '1.5rem' }}><strong style={{ color: 'var(--text)' }}>The Problem: </strong>{project.problem}</p>
            )}
            {project.designGoal && (
              <p style={{ ...textStyle, marginBottom: 0 }}><strong style={{ color: 'var(--text)' }}>Design Goal: </strong>{project.designGoal}</p>
            )}
          </Section>
        )}

        {/* Architecture Diagram */}
        {project.architectureDiagram && (
          <Section label={nextLabel('Architecture')} title="System Architecture Diagram">
            <CodeBlock label="ASCII architecture — read top to bottom">{project.architectureDiagram}</CodeBlock>
          </Section>
        )}

        {/* System Flow */}
        {project.systemFlow.length > 0 && (
          <Section label={nextLabel('System Flow')} title="Complete System Flow">
            <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.systemFlow.map((step, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem' }}>
                  {step}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Tech Stack */}
        <Section label={nextLabel('Technology Stack')} title="Technology Stack">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {project.techStack.map((t, i) => (
              <div key={i} style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.82rem', fontWeight: 700,
                  color: '#60a5fa', minWidth: '160px', flexShrink: 0, paddingTop: '2px',
                }}>
                  {t.name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {t.purpose}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* AI Models + APIs + Database */}
        {hasInteg && (
          <Section label={nextLabel('AI & Integrations')} title="AI Models, APIs & Database">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {project.aiModels.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>AI Models</div>
                  {project.aiModels.map((m, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '2px' }}>{m.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{m.purpose}</div>
                    </div>
                  ))}
                </div>
              )}
              {project.apis.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>External APIs</div>
                  {project.apis.map((a, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '2px' }}>{a.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{a.purpose}</div>
                    </div>
                  ))}
                </div>
              )}
              {project.database && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>Storage</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '4px' }}>{project.database.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{project.database.purpose}</div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Key Features */}
        <Section label={nextLabel('Features')} title="Key Features">
          <ul style={listStyle}>
            {project.features.map((f, i) => (
              <li key={i} style={liStyle}>{f}</li>
            ))}
          </ul>
        </Section>

        {/* Folder Structure */}
        {project.folderStructure && (
          <Section label={nextLabel('Codebase')} title="Folder Structure">
            <CodeBlock label="Project directory layout">{project.folderStructure}</CodeBlock>
          </Section>
        )}

        {/* Installation Guide */}
        {project.installation && project.installation.length > 0 && (
          <Section label={nextLabel('Setup')} title="Installation Guide">
            <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.installation.map((step, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem', fontFamily: step.includes('`') ? 'inherit' : undefined }}>
                  {step.split('`').map((part, j) =>
                    j % 2 === 0
                      ? <span key={j}>{part}</span>
                      : <code key={j} style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa', borderRadius: '4px', padding: '1px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85em' }}>{part}</code>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Environment Variables */}
        {project.envVars && project.envVars.length > 0 && (
          <Section label={nextLabel('Configuration')} title="Environment Variables">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Variable', 'Description', 'Example'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.envVars.map((v, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", color: '#60a5fa', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{v.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{v.description}</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{v.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Engineering Decisions */}
        {project.decisions && project.decisions.length > 0 && (
          <Section label={nextLabel('Engineering Decisions')} title="Why This Design — Decisions and Trade-offs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {project.decisions.map((d, i) => (
                <div key={i} style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px', padding: '1.5rem',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderTop: '3px solid #2563eb',
                }}>
                  <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.95rem', marginBottom: '12px' }}>
                    {d.decision}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'JetBrains Mono', monospace" }}>Rationale</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{d.rationale}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontFamily: "'JetBrains Mono', monospace" }}>Trade-off</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>{d.tradeoff}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Performance + Security + Scalability */}
        {hasQuality && (
          <Section label={nextLabel('Engineering Quality')} title="Performance, Security & Scalability">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {[
                { title: 'Performance', color: '#34d399', items: project.performance },
                { title: 'Security', color: '#f87171', items: project.security },
                { title: 'Scalability', color: '#60a5fa', items: project.scalability },
              ].filter(g => g.items.length > 0).map(({ title, color, items }) => (
                <div key={title} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${color}20`, borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>{title}</div>
                  <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {items.map((item, i) => (
                      <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.6 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Testing */}
        <Section label={nextLabel('Testing')} title="Testing">
          <p style={textStyle}>{project.testing}</p>
        </Section>

        {/* Results */}
        <Section label={nextLabel('Results')} title="Verified Results">
          <ul style={listStyle}>
            {project.results.map((r, i) => (
              <li key={i} style={liStyle}>{r}</li>
            ))}
          </ul>
        </Section>

        {/* Limitations */}
        <Section label={nextLabel('Limitations')} title="Known Limitations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {project.limitations.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, color: '#f59e0b', fontSize: '0.5rem', marginTop: '7px' }}>◆</span>
                <p style={{ ...textStyle, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer CTA */}
        <motion.div
          custom={motionIdx} variants={fadeUp} initial="hidden" animate="visible"
          style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap',
            paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <motion.span
                className="btn-primary"
                style={{ display: 'inline-flex', fontSize: '0.88rem', padding: '11px 24px', cursor: 'pointer' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <GithubIcon size={16} /> Source on GitHub
              </motion.span>
            </a>
          )}
          {project.download && (
            <a href={project.download.url} download style={{ textDecoration: 'none' }}>
              <motion.span
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.88rem', padding: '11px 24px', cursor: 'pointer' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Download size={15} /> {project.download.label}
              </motion.span>
            </a>
          )}
          {project.demo !== '#' && (
            <a href={project.demo} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <motion.span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '11px 24px', borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'var(--text)', fontSize: '0.88rem', fontWeight: 700,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <ExternalLink size={15} /> Live Demo
              </motion.span>
            </a>
          )}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
              padding: '11px 24px', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.88rem',
            }}
          >
            <ArrowLeft size={15} /> Back to Portfolio
          </button>
        </motion.div>
      </div>
    </div>
  )
}
