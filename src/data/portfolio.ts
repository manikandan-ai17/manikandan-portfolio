export type StatusTone = 'live' | 'local' | 'internal' | 'prototype'

export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  id: string
  name: string
  tagline: string
  status: string
  statusTone: StatusTone
  statusNote: string
  summary: string
  features: string[]
  stack: string[]
  role: string
  evidence: string[]
  limitations: string[]
  links: ProjectLink[]
}

export const profile = {
  name: 'Manikandan Santhosh',
  title: 'Software Engineer · LLM-integrated applications',
  location: 'Coimbatore, India',
  email: 'maniappu7777@gmail.com',
  phone: '+91 9944680311',
  github: 'https://github.com/manikandan-ai17',
  linkedin: 'https://www.linkedin.com/in/manikandan-s-032518285/',
  resume: '/resume.html',
  resumePdf: '/Manikandan_Santhosh_Resume.pdf',
  openToWork: true,
  summary:
    'I build full-stack applications that put hosted LLM APIs (Gemini, Perplexity) to work on business data: sales prospects, product spreadsheets, supplier pages, PDFs and engineering drawings. At AltiusNxt Technologies I built and deployed a TypeScript and React B2B outreach platform, and I have worked on a product-catalog platform and a spreadsheet audit tool. On my own I wrote a CAD drawing analysis agent that cross-checks a vision model against the PDF’s own vector data.',
  note:
    'Every project below is labelled with what I can actually demonstrate: public source, local run, or private company code. I use external LLM APIs; I have not trained or fine-tuned models.',
}

export const featuredProjects: Project[] = [
  {
    id: 'marketing-ai-outreach',
    name: 'AltiusNXT Marketing AI',
    tagline: 'B2B outreach platform that takes a company from prospect discovery to tracked email outreach, with human approval before anything is sent.',
    status: 'Deployed · sign-in required',
    statusTone: 'live',
    statusNote:
      'Deployed on a server I manage. Sign-in is limited to company email domains, so it cannot be tried from outside, and the source is a private company repository.',
    summary:
      'A full-stack TypeScript platform for B2B sales outreach. Six pipeline engines move a company from discovery to engagement tracking: prospect discovery, company enrichment, intent signals, decision-maker discovery, multichannel outreach and engagement tracking. Gemini drafts content; a person approves it before it goes out.',
    features: [
      'Six engines in one workspace: Prospect Discovery, Company Enrichment, Intent Signals, Decision Maker Discovery, Multichannel Outreach and Engagement Tracking, plus a sync to the company’s sales CRM.',
      'Outreach: personalised email drafting, sales sequences with follow-ups, a suppression list, a test-send mode and a manual-send flow. LinkedIn is draft-only: a person sends it.',
      'Bulk email: Excel recipient import, attachments, company-wise ZIP files up to 1 GB, up to three own templates, signature, open tracking, scheduling, and a report of the companies a send skipped. Sending sits behind feature flags.',
      'Website audit with generated PDF reports.',
      'Four roles (viewer, operator, approver, admin). Approving is separate from operating, and self-approval is off by default.',
      'Sign-in with email one-time codes or passwords, restricted to allowed company email domains.',
    ],
    stack: ['TypeScript', 'Node.js', 'Express', 'React', 'Vite', 'PostgreSQL', 'Prisma', 'pg-boss', 'Gemini API', 'PM2', 'Vitest'],
    role: 'Main committer (50 of the repository’s 58 commits, Sep–Oct 2026) and deployed it at AltiusNxt Technologies.',
    evidence: [
      'Source reviewed on 22 Oct 2026: about 74,000 lines of TypeScript in the backend, 32,000 in the React app and 42,000 in tests.',
      'The backend has 68 database models and 44 migrations on PostgreSQL. The API and a separate background worker run as two PM2 processes.',
      '183 test files with about 3,100 test cases (counted from the source; not run for this page).',
      'Git history: 58 commits from 3 Sep to 21 Oct 2026. 50 are mine; the other 8 are pull-request merge commits.',
      'The deployed application responds (HTTP 200) and shows the sign-in page.',
    ],
    limitations: [
      'Private company product: I did not create an account to test the live app beyond the sign-in page, and I do not quote usage or email-volume figures.',
      'Several capabilities are switched off by default through feature flags, such as bulk sending and CRM writes.',
    ],
    links: [{ label: 'Open the app (sign-in page)', href: 'http://72.61.245.208:8110/outreach' }],
  },
  {
    id: 'cad-drawing-agent',
    name: 'CAD Drawing Analysis Agent',
    tagline:
      'Reads engineering-drawing PDFs and answers questions about them, with every answer tied to a highlighted mark on the page.',
    status: 'Working · runs locally',
    statusTone: 'local',
    statusNote:
      'Public source code. No hosted demo is running at the moment; a Render deployment file is included in the repository.',
    summary:
      'A Python/FastAPI application that analyses CAD drawing PDFs by comparing two independent readings of each page: the PDF’s own vector geometry and text layer, and a Gemini vision model that never sees that text. Where the two agree, confidence rises. Where they disagree, the conflict is reported instead of being resolved silently.',
    features: [
      'PyMuPDF classifies each page (vector, raster, hybrid, non-drawing) and extracts text, lines, circles and arcs.',
      'Five concurrent, schema-constrained Gemini vision passes per page: structure, annotations, features, GD&T and title block.',
      'Cross-validation labels each value HIGH, MEDIUM or LOW, and checks diameters and radii against circles fitted in the vector layer.',
      'Browser workspace with no build step: page viewer with evidence overlays, Q&A whose answers cite item IDs, a named-attribute extraction table, and Excel/CSV export.',
      'A missing dimension, tolerance or unit stays missing. “Insufficient evidence” is a supported answer.',
    ],
    stack: ['Python', 'FastAPI', 'PyMuPDF', 'Gemini API', 'NumPy', 'pdfplumber', 'openpyxl', 'JavaScript'],
    role: 'Author of the repository (every commit in the public repo).',
    evidence: [
      '329 automated tests pass (run on 22 Oct 2026). They cover parsing, geometry, confidence rules and API routes. The vision calls themselves are not tested.',
      'Benchmark on 26 real packaging drawings (36 pages): 90.3% dimension recall (308 of 341) and 97.7% value precision on the values it found.',
      'The benchmark’s ground truth was labelled by a different model family (Claude). A second pass agreed on 327 of 335 sampled items (97.6%). It is model-assisted, not human-labelled.',
    ],
    limitations: [
      'Hole-count accuracy was 28.6% and diameter typing 59.1% in the same benchmark.',
      'Fixes were made after failures found on these same drawings, so the figures are development-set results, not a blind test.',
      'Needs a Gemini API key and makes roughly five model calls per page.',
      'Linear dimensions are not verified against geometry. Page scale needs at least two matched diameter or radius callouts.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/manikandan-ai17/Pdf-Cad-Drawing-Analizer' }],
  },
  {
    id: 'catalogwiz',
    name: 'CatalogWiz',
    tagline: 'Product-catalog enrichment and review platform for retail catalog teams.',
    status: 'Completed · company code',
    statusTone: 'internal',
    statusNote: 'Built at AltiusNxt Technologies. The source is a company project and is not public; there is no public demo.',
    summary:
      'A multi-service application that takes raw product data, audits and enriches it with Gemini, lets a team review the results, and syncs approved products to Shopify or WooCommerce. I worked on it as part of the AltiusNxt engineering team.',
    features: [
      'Import product spreadsheets and map their headers to catalog fields.',
      'Gemini-based enrichment: attribute extraction from scraped supplier pages, plus SEO titles, descriptions, bullet points and meta text.',
      'Audit-and-fix and competitor-benchmark workflows that raise issues per product and propose corrections.',
      'Taxonomy classification of products.',
      'React review interface with bulk review and approval, and settings for brand tone, restricted words and generation rules.',
      'Shopify (Admin GraphQL) and WooCommerce sync, with multi-user JWT authentication.',
    ],
    stack: ['React', 'Vite', 'MUI', 'Node.js', 'Express', 'MongoDB', 'Python', 'Gemini API', 'AWS SQS', 'AWS S3', 'Shopify API', 'WooCommerce API'],
    role: 'Developer on the AltiusNxt engineering team.',
    evidence: [
      'Features above are taken from the source code (Express API routes, React pages, Python workers), not from documentation.',
      'Architecture: React front end → Node/Express API with MongoDB → AWS SQS queues → Python workers that call Gemini.',
    ],
    limitations: [
      'No automated tests in the delivered code.',
      'Internal tool: no public repository or demo. Details are discussed in interviews.',
      'AI output is treated as a draft; the review interface exists because it needs human approval.',
    ],
    links: [],
  },
  {
    id: 'audit-pipeline',
    name: 'Audit Pipeline',
    tagline: 'Pilot-first audit of vendor product spreadsheets with Gemini.',
    status: 'Deployed · company server',
    statusTone: 'internal',
    statusNote: 'Runs on a company server. The link is withheld until access to it is restricted.',
    summary:
      'A web tool that audits product-data spreadsheets. You upload a workbook, run a small pilot batch, review the findings, give feedback and re-run the pilot, and only then approve the full batch and download the audited workbook.',
    features: [
      'Upload an .xlsx file, choose the sheet and the pilot size.',
      'Pilot run with review, a downloadable pilot file, and free-text feedback that re-runs the pilot with guidance.',
      'Approve to process the remaining rows, then download the audited workbook.',
      'Gemini API key required; an optional Scrape.do key is used when source pages must be fetched.',
    ],
    stack: ['Python', 'FastAPI', 'React', 'Gemini API', 'pandas', 'openpyxl', 'Playwright'],
    role: 'Deployed the application at AltiusNxt Technologies.',
    evidence: [
      'Checked on 22 Oct 2026: the application responds (HTTP 200) and its client code calls the pilot, revise, approve and download endpoints described above.',
      'A related Audit Tool codebase (FastAPI + React) with the same pilot workflow, rule engine and workbook write-back was reviewed.',
    ],
    limitations: [
      'No accuracy benchmark. The pilot-and-review step is the quality control.',
      'Jobs and settings are stored as files on disk; there is no database.',
    ],
    links: [],
  },
  {
    id: 'dtlp-extension',
    name: 'DTLP Data Extraction Extension',
    tagline: 'Chrome extension that extracts structured product attributes from web pages, PDFs and Excel lists using an LLM.',
    status: 'Working · load unpacked',
    statusTone: 'local',
    statusNote:
      'Not published on the Chrome Web Store. Private repository; it runs by loading the folder at chrome://extensions with your own API key.',
    summary:
      'A Manifest V3 Chrome extension that sends page, PDF or spreadsheet content to Perplexity (sonar-pro) or Gemini (1.5 Flash), chosen per run, and returns the attributes you define as JSON.',
    features: [
      'Category templates and value mappings guide which attributes are extracted.',
      'Inputs: the current page, PDF files (PDF.js, first 10 pages), Excel lists (SheetJS) and multi-URL batches.',
      'Draggable in-page overlay, token-usage display, JSON copy to clipboard and CSV download.',
      'Client-side only: no backend server. API keys are kept in chrome.storage.local.',
    ],
    stack: ['JavaScript', 'Chrome Extension (MV3)', 'Perplexity API', 'Gemini API', 'PDF.js', 'SheetJS', 'IndexedDB'],
    role: 'Author of the repository.',
    evidence: [
      'About 6,300 lines of JavaScript, plus CSS and HTML, in the extension source.',
      'The two models are alternatives. The extension does not run one model’s output through a second model.',
    ],
    limitations: [
      'No schema validation or retry: the response is parsed as JSON and an error is raised if that fails, so results need human review.',
      'No automated tests.',
      'Requests access to all URLs, as on-page extraction requires.',
    ],
    links: [],
  },
]

export const otherProjects: Project[] = [
  {
    id: 'excel-auditor-pro',
    name: 'Excel Auditor Pro',
    tagline: 'React + TypeScript spreadsheet quality checker using Gemini.',
    status: 'Local prototype',
    statusTone: 'prototype',
    statusNote: 'Private repository.',
    summary:
      'Upload a sheet, choose columns and checklists (duplicates, hidden rows, formulas, spell check) and have Gemini flag issues, with export to Excel or JSON and history kept in the browser.',
    features: [],
    stack: ['React 19', 'TypeScript', 'Vite', 'Gemini API'],
    role: 'Author of the repository.',
    evidence: [],
    limitations: ['The Gemini key is injected into the client bundle, so it is not safe to deploy publicly as it stands.', 'No tests; the type check reports 2 errors.'],
    links: [],
  },
  {
    id: 'ocr-pdf-analyzer',
    name: 'OCR PDF Analyzer',
    tagline: 'Extracts user-defined attributes from PDF drawings.',
    status: 'Local prototype',
    statusTone: 'prototype',
    statusNote: 'Private repository.',
    summary:
      'Node/Express backend and a plain-JavaScript front end. It reads the PDF text layer, falls back to Tesseract OCR, and matches attributes with patterns or, optionally, Perplexity.',
    features: [],
    stack: ['Node.js', 'Express', 'Tesseract.js', 'pdf-parse', 'Perplexity API'],
    role: 'Author of the repository.',
    evidence: [],
    limitations: ['Some matching patterns are hard-coded to specific attributes.', 'No accuracy evaluation was done.'],
    links: [],
  },
  {
    id: 'pasternack-scraper',
    name: 'Pasternack Product Scraper',
    tagline: 'Playwright script that enriches an Excel list of part numbers from a manufacturer website.',
    status: 'Used on one batch',
    statusTone: 'prototype',
    statusNote: 'Private repository. No LLM is involved.',
    summary:
      'Reads part numbers from Excel, searches the site for each, and writes back URL, taxonomy, title, description and specifications. It saves after every row and detects Cloudflare challenges. One run covered 1,000 part numbers: 833 matched and 167 were not found.',
    features: [],
    stack: ['Python', 'Playwright', 'BeautifulSoup', 'openpyxl'],
    role: 'Author of the repository.',
    evidence: [],
    limitations: ['Runs with a visible browser window and depends on the site’s current page structure.'],
    links: [],
  },
  {
    id: 'docx-pdf-converter',
    name: 'DOCX ↔ PDF Converter',
    tagline: 'Batch document converter with a web interface.',
    status: 'Local tool',
    statusTone: 'prototype',
    statusNote: 'Private repository. No LLM is involved.',
    summary:
      'FastAPI service and React front end that convert DOCX to PDF (Microsoft Word on Windows, LibreOffice on Linux) and PDF to DOCX, with batch download and a packaged Windows executable.',
    features: [],
    stack: ['Python', 'FastAPI', 'React', 'PyMuPDF'],
    role: 'Author of the repository.',
    evidence: [],
    limitations: ['No automated tests, and the README does not match the current endpoints.'],
    links: [],
  },
  {
    id: 'trading-assistant',
    name: 'Candlestick Pattern Assistant',
    tagline: 'Experimental Chrome extension and Flask backend for TradingView charts.',
    status: 'Experimental prototype',
    statusTone: 'prototype',
    statusNote: 'Private repository. Not a trading system and not financial advice.',
    summary:
      'Rule-based detection of 7 named candlestick patterns and simple moving averages on public Binance candle data, with an optional Perplexity text analysis in one backend variant.',
    features: [],
    stack: ['JavaScript', 'Chrome Extension (MV3)', 'Python', 'Flask'],
    role: 'Author of the repository.',
    evidence: [],
    limitations: ['Prototype only: signals in one backend are fixed rules, and there is no back-testing.'],
    links: [],
  },
]

export const allProjects: Project[] = [...featuredProjects, ...otherProjects]

export const skillGroups = [
  {
    title: 'Languages',
    items: ['Python', 'JavaScript', 'TypeScript', 'C and C++ (coursework)', 'MySQL (coursework)'],
  },
  {
    title: 'Backend and data',
    items: ['Node.js / Express', 'FastAPI', 'Flask', 'REST APIs', 'PostgreSQL (Prisma)', 'MongoDB', 'Job queues (pg-boss, AWS SQS)', 'Authentication (JWT, one-time codes)', 'pandas', 'openpyxl'],
  },
  {
    title: 'LLM and document processing',
    items: ['Gemini API (text and vision)', 'Perplexity API', 'Prompting for structured JSON output', 'PyMuPDF', 'pdfplumber', 'PDF.js', 'Tesseract.js (OCR)', 'Playwright scraping'],
  },
  {
    title: 'Frontend',
    items: ['React', 'Vite', 'Tailwind CSS', 'MUI', 'Chrome extensions (Manifest V3)'],
  },
  {
    title: 'Tools and services',
    items: ['Git and GitHub', 'PM2 process management', 'Vitest and pytest', 'AWS SQS and S3 (used in CatalogWiz)', 'Shopify and WooCommerce APIs'],
  },
]

export const experience = [
  {
    role: 'Junior Software Developer',
    company: 'AltiusNxt Technologies',
    place: 'Coimbatore',
    period: 'Present',
    bullets: [
      'Built and deployed AltiusNXT Marketing AI, a B2B outreach platform (TypeScript, Express, React, PostgreSQL): prospect discovery, Gemini-drafted outreach emails with approval gates, sequences and bulk sending.',
      'Deployed the Audit Pipeline, a Gemini-based spreadsheet audit tool with a pilot-then-approve workflow.',
    ],
  },
  {
    role: 'Trainee Software Developer',
    company: 'AltiusNxt Technologies',
    place: 'Coimbatore',
    period: 'Jan 2026 – Jul 2026',
    bullets: [
      'Worked on CatalogWiz, a product-catalog enrichment and review platform (React, Node.js/Express, MongoDB, Python workers calling Gemini through AWS SQS).',
      'Worked on its Shopify and WooCommerce sync for publishing reviewed products.',
    ],
  },
  {
    role: 'AI Software Developer · Internship',
    company: 'Deep Tech Launchpad',
    place: 'Coimbatore',
    period: 'Jul 2025 – Jan 2026',
    bullets: [
      'Built the DTLP Data Extraction Extension: a Manifest V3 Chrome extension that uses Perplexity or Gemini to extract structured product attributes from web pages, PDFs and Excel lists.',
    ],
  },
]

export const education = [
  {
    school: 'KG College of Arts and Science',
    degree: 'B.Sc. Computer Technology',
    period: '2022 – 2025',
    detail: 'Coimbatore · CGPA 7.1',
  },
]
