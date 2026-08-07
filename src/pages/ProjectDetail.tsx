import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { GithubIcon } from '@/components/ui/SocialIcons'

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
interface TechItem { name: string; purpose: string }
interface AIModel  { name: string; purpose: string }
interface APIItem  { name: string; purpose: string }
interface DBItem   { name: string; purpose: string }

interface Challenge {
  challenge: string
  solution: string
}

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
  llm: string
  executiveSummary: string
  problem: string
  whyBuilt: string
  realWorldUseCase: string
  architectureDiagram: string
  systemFlow: string[]
  techStack: TechItem[]
  aiModels: AIModel[]
  apis: APIItem[]
  database: DBItem | null
  folderStructure: string
  features: string[]
  installation: string[]
  envVars: EnvVar[]
  challenges: Challenge[]
  decisions: Decision[]
  performance: string[]
  security: string[]
  scalability: string[]
  testing: string
  results: string[]
  lessonsLearned: string[]
  futureRoadmap: string[]
  gradient: string
  image?: string
  gallery?: string[]
  github: string
  demo: string
  tech: string[]
}

// ──────────────────────────────────────────────────────────
// Project data (specific, accurate, no fake metrics)
// ──────────────────────────────────────────────────────────
const PROJECT_DETAILS: Record<string, ProjectData> = {
  'adm-retail-platform': {
    name: 'ADM Retail Platform',
    tagline: 'Full-stack retail data platform that automates the entire product lifecycle — from raw supplier Excel to live Shopify store — using AI enrichment, taxonomy classification, and an AWS-hosted batch pipeline.',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #2563eb 100%)',
    image: '/images/project-1.svg',
    gallery: [
      '/images/project-1.svg',
      '/images/project-1-workflow.svg',
      '/images/project-1-arch.svg',
      '/images/project-1-output.svg',
    ],
    status: 'Shipped',
    llm: 'LLM enrichment engine',
    github: 'https://github.com/monkey-d-luffy9888888',
    demo: '#',
    tech: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'AWS S3', 'AWS Lambda', 'Shopify Admin API', 'Docker', 'OpenPyXL'],

    executiveSummary:
      'ADM Retail Platform is a production system that eliminates manual product data work for retail teams. A supplier uploads an Excel file; the platform ingests it, enriches missing attributes with an LLM, classifies every product into the correct taxonomy node, queues the batch for human sign-off, and pushes approved records to Shopify. The pipeline runs on AWS and is designed to handle enterprise catalog volumes.',

    problem:
      'Retail teams managing large catalogs face three compounding problems. First, supplier data arrives incomplete — model numbers, dimensions, and materials are frequently absent or inconsistent. Second, products must be placed in the correct taxonomy leaf before Shopify will surface them correctly in search and navigation, and manual classification at scale is error-prone. Third, pushing hundreds of approved products to Shopify without automation is tedious and crash-prone. Each problem multiplies with catalog size.',

    whyBuilt:
      'Manual product data preparation is one of the most labor-intensive workflows in retail operations — skilled people spending most of their time on data hygiene tasks that follow predictable patterns. The ADM platform exists to demonstrate that an AI-powered pipeline can own the repetitive parts of this workflow, while keeping humans in control of the approval gate before anything reaches production.',

    realWorldUseCase:
      'A fashion retailer receives a 500-row Excel file from a new supplier. Product names are present but descriptions are thin, size information is inconsistent, and the category column uses the supplier\'s internal codes rather than the store\'s taxonomy. ADM ingests the file, normalises the column schema, uses an LLM to fill missing descriptions and standardise size values, maps each product to the correct taxonomy leaf, and surfaces the batch in the review dashboard. The team approves 480 products, rejects 20 with notes, and the 480 are published to Shopify — no manual data entry.',

    architectureDiagram:
`Supplier Files (Excel / CSV)
          │
          ▼
┌─────────────────────┐
│  FastAPI            │ ◄── AWS Lambda
│  Ingestion Service  │     (S3 event trigger)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Column Schema      │
│  Detector           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  AI Enrichment      │────►│  PostgreSQL       │
│  Engine (LLM)       │     │  Product DB       │
└──────────┬──────────┘     └──────────────────┘
           │
           ▼
┌─────────────────────┐
│  Taxonomy           │
│  Classifier         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Human Review       │
│  Dashboard (React)  │
└──────────┬──────────┘
           │ (Approved only)
           ▼
┌─────────────────────┐
│  Shopify Publisher  │
│  (Admin REST API)   │
└──────────┬──────────┘
           │
           ▼
    Live Shopify Store`,

    systemFlow: [
      'Supplier uploads an Excel or CSV file via the React dashboard or S3 drop zone',
      'AWS Lambda detects the S3 upload event and triggers the FastAPI ingestion service',
      'Column Schema Detector reads the header row and maps columns to the internal product schema',
      'AI Enrichment Engine sends each product record to an LLM to fill missing attributes (descriptions, materials, dimensions)',
      'Pydantic schema validator rejects any LLM response with missing required fields or wrong types before the record is saved',
      'Taxonomy Classifier assigns each product to the correct leaf node using rule-based matching, with LLM fallback for ambiguous cases',
      'Cross-product consistency check enforces that identical item names map to identical taxonomy paths',
      'Enriched and classified products appear in the React review dashboard for human approval',
      'Approved products are pushed to Shopify via the Admin REST API with retry logic on rate-limit responses',
      'Rejected products receive annotated feedback and are returned to the enrichment queue',
    ],

    techStack: [
      { name: 'FastAPI', purpose: 'Core API server — async route handlers, auto-generated OpenAPI docs, Pydantic request/response validation' },
      { name: 'React + TypeScript', purpose: 'Product review and approval dashboard — real-time batch status, inline editing, approval/rejection workflow' },
      { name: 'Vite', purpose: 'Frontend build tool — fast HMR during development, optimised production bundle' },
      { name: 'PostgreSQL', purpose: 'Product record store — strict schema enforcement, audit logs, enrichment results, taxonomy assignments' },
      { name: 'AWS S3', purpose: 'File drop zone for supplier uploads — event source for Lambda batch trigger' },
      { name: 'AWS Lambda', purpose: 'Serverless batch processor — triggers on S3 events, decouples file ingestion from API response time' },
      { name: 'Shopify Admin REST API', purpose: 'Product publish layer — creates products, maps variants, populates metafields, handles inventory' },
      { name: 'Docker', purpose: 'Container runtime for FastAPI service — consistent environments across dev and production' },
      { name: 'OpenPyXL', purpose: 'Excel parsing — reads supplier files preserving data types, detects merged cells, generates annotated audit exports' },
    ],

    aiModels: [
      { name: 'LLM (attribute enrichment)', purpose: 'Fills missing product fields — descriptions, materials, care instructions, dimensions — from surrounding context in the supplier row' },
      { name: 'LLM (taxonomy classification)', purpose: 'Fallback classifier for ambiguous products that do not match any rule-based taxonomy pattern' },
    ],

    apis: [
      { name: 'Shopify Admin REST API v2023-10', purpose: 'Product CRUD, variant management, metafield creation, inventory level setup' },
      { name: 'AWS S3 Events', purpose: 'File drop notification — triggers Lambda on new upload without polling' },
      { name: 'AWS Lambda Invocation', purpose: 'Serverless batch processing — scales automatically with upload volume' },
    ],

    database: {
      name: 'PostgreSQL',
      purpose: 'products, taxonomy_nodes (tree), enrichment_results, approval_log, audit_trail tables. Relational model chosen for strong schema enforcement on product attributes.',
    },

    folderStructure:
`adm-retail-platform/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── api/
│   │   ├── routes/
│   │   │   ├── products.py        # Ingestion + CRUD endpoints
│   │   │   ├── taxonomy.py        # Classification endpoints
│   │   │   └── shopify.py         # Shopify push endpoints
│   │   └── dependencies.py        # Auth, DB session, rate limiting
│   ├── services/
│   │   ├── enrichment.py          # LLM enrichment + Pydantic validation
│   │   ├── taxonomy_classifier.py # Rule-based + LLM hybrid classifier
│   │   ├── shopify_publisher.py   # Retry-safe Shopify API publisher
│   │   └── s3_pipeline.py         # AWS batch import handler
│   ├── models/
│   │   ├── product.py             # Pydantic + SQLAlchemy ORM models
│   │   └── taxonomy.py            # Taxonomy tree models
│   ├── db/
│   │   ├── database.py            # SQLAlchemy session setup
│   │   └── migrations/            # Alembic migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/            # Review cards, approval controls
│   │   ├── pages/                 # Dashboard, Batch, Settings
│   │   └── api/                   # API client functions
│   ├── package.json
│   └── vite.config.ts
├── aws/
│   └── lambda_handler.py          # S3-triggered batch processor
└── docker-compose.yml`,

    features: [
      'Bulk Excel/CSV ingestion with automatic column schema detection',
      'AI-powered attribute enrichment with Pydantic schema validation on every LLM response',
      'Taxonomy classification: rule-based matching with LLM fallback for ambiguous cases',
      'Cross-product consistency enforcement — identical item names must share taxonomy paths',
      'Human-in-the-loop review and approval dashboard (React)',
      'Shopify Admin API integration with exponential backoff on rate limit responses',
      'AWS S3-triggered Lambda pipeline for asynchronous batch processing',
      'Retry queue for rejected products with annotated reviewer feedback',
      'Exportable audit reports in Excel format with per-cell annotations',
    ],

    installation: [
      'Clone the repository and navigate to the project root',
      'Start all services: `docker-compose up --build`',
      'Apply database migrations: `docker-compose exec backend alembic upgrade head`',
      'Create a Shopify Custom App in your store and copy the access token',
      'Set the environment variables listed below in a `.env` file',
      'Access the React dashboard at http://localhost:5173',
      'Upload a test Excel file via the dashboard to verify the pipeline end-to-end',
    ],

    envVars: [
      { name: 'DATABASE_URL', description: 'PostgreSQL connection string', example: 'postgresql://user:pass@localhost:5432/adm' },
      { name: 'SHOPIFY_STORE_URL', description: 'Your Shopify store URL', example: 'your-store.myshopify.com' },
      { name: 'SHOPIFY_ACCESS_TOKEN', description: 'Shopify Admin API access token', example: 'shpat_xxxxxxxxxxxx' },
      { name: 'AWS_ACCESS_KEY_ID', description: 'AWS credentials for S3 and Lambda', example: 'AKIAIOSFODNN7EXAMPLE' },
      { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret key', example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
      { name: 'AWS_S3_BUCKET', description: 'S3 bucket for supplier file uploads', example: 'adm-retail-uploads' },
      { name: 'LLM_API_KEY', description: 'API key for the enrichment LLM', example: 'sk-...' },
      { name: 'LLM_API_ENDPOINT', description: 'LLM service endpoint URL', example: 'https://api.openai.com/v1' },
    ],

    challenges: [
      {
        challenge: 'Taxonomy path inconsistency across duplicate products',
        solution: 'Products with the same normalised item name were receiving different taxonomy paths on each run because the LLM classifier is non-deterministic. Added a post-classification pass that groups products by normalised item name and enforces path agreement within the batch — any disagreement flags the group for human review rather than silently publishing inconsistent paths.',
      },
      {
        challenge: 'Shopify rate limits under bulk push operations',
        solution: 'Shopify Admin API enforces per-minute call limits. Bulk pushes of 500+ products exceeded these limits, causing silent request failures. Implemented a token-bucket rate limiter in the publisher service: requests queue and release at the allowed rate. 429 responses trigger exponential backoff with jitter. Failed pushes after max retries are written to a retry queue and re-attempted in the next batch window.',
      },
      {
        challenge: 'LLM hallucination on specific product attributes',
        solution: 'The LLM occasionally generated plausible-but-fabricated values — model numbers that did not exist, dimensions outside the product category\'s realistic range. Every LLM response is now validated against a Pydantic model with category-specific field constraints. Responses that fail validation trigger a retry with a corrective prompt naming the specific invalid field. After two failed retries the field is left empty and flagged for human completion.',
      },
    ],

    decisions: [
      {
        decision: 'Event-driven batch pipeline (S3 + Lambda) instead of synchronous API processing',
        rationale: 'Synchronous processing of large Excel files during the HTTP request blocks the API, causes upload timeouts for the client, and does not scale — a 1000-row file takes too long for a synchronous response. Moving batch processing to S3+Lambda decouples file ingestion from the API entirely: the uploader gets an immediate acknowledgment, and processing happens asynchronously with automatic Lambda scaling.',
        tradeoff: 'Added operational complexity — monitoring Lambda functions separately from the API, handling distributed failures, and a delayed feedback loop where the uploader must poll for status rather than receiving immediate results. Worth the tradeoff for the reliability improvement under production upload volumes.',
      },
      {
        decision: 'Human-in-the-loop review gate before every Shopify publish',
        rationale: 'AI enrichment and taxonomy classification are high-confidence but not infallible. Publishing incorrect data to a live Shopify store is costly to reverse — wrong prices, wrong categories, and wrong descriptions directly impact sales and SEO. A mandatory review gate catches edge cases the AI misses and builds client trust by making the process transparent.',
        tradeoff: 'Slower time-to-publish per batch. For clients with well-structured supplier data, this gate adds unnecessary delay. A future configuration option to skip review for high-confidence batches would improve throughput without removing the safety net for ambiguous cases.',
      },
      {
        decision: 'Pydantic schema validation on every LLM response as a hard requirement, not optional',
        rationale: 'LLMs produce inconsistently-typed responses even with strong system prompts. Without mandatory validation, malformed data reaches the database silently — wrong types, missing required fields, values in unexpected formats. Making validation a hard gate means the system fails loudly on bad responses rather than storing corrupt records that surface as bugs later.',
        tradeoff: 'Higher initial rejection rate from the LLM layer, requiring a retry loop. The corrective retry prompt resolves most failures on the second attempt, so the practical impact on processing time is small. The tradeoff is explicitly accepted: noisy retries are better than silent data corruption.',
      },
    ],

    performance: [
      'Async FastAPI route handlers allow concurrent request processing without blocking',
      'LLM enrichment runs in batches of N products per API call instead of one-at-a-time — reduces total API calls and latency',
      'PostgreSQL indexes on product_id, batch_id, and status columns keep dashboard queries fast as the record count grows',
      'AWS Lambda scales automatically with upload volume — concurrent Lambda executions process large batches in parallel',
    ],

    security: [
      'Shopify API access token stored as an environment variable — never committed to version control',
      'All FastAPI endpoints require authentication — unauthenticated requests are rejected at the dependency layer',
      'S3 bucket configured with write-only access from Lambda — no public read access to uploaded supplier files',
      'LLM prompts are sanitised before submission — product data fields that contain user-controlled text are escaped to prevent prompt injection',
    ],

    scalability: [
      'FastAPI service is stateless — multiple instances can run behind a load balancer without shared in-process state',
      'AWS Lambda scales automatically with the number of concurrent S3 events — no infrastructure changes needed for larger upload volumes',
      'PostgreSQL can be migrated to Amazon RDS Aurora for read replica support as query volume grows',
      'Shopify publisher respects rate limits independently of instance count — each instance manages its own token bucket',
    ],

    testing:
      'Unit tests cover the taxonomy classifier, column schema detector, Pydantic validators, and the Shopify rate limiter. Integration tests run against a Shopify development store (separate API credentials from production) and a test PostgreSQL database seeded with sample supplier data. Lambda functions are tested locally with sample S3 event payloads before deployment. The React dashboard is manually QA\'d for the approval workflow, specifically the reject-with-notes and re-queue flows.',

    results: [
      'Product data preparation reduced from multi-day manual workflows to an automated pipeline with a single upload step',
      'Taxonomy classification consistency enforced programmatically across all batches — no manual cross-checking required',
      'Zero malformed records reach Shopify — validation layer catches all LLM formatting errors before the publish step',
      'AWS Lambda handles import volume spikes without blocking the API or requiring manual intervention',
      'Human review gate provides an auditable approval record for every product published to the store',
    ],

    lessonsLearned: [
      'Schema validation on every LLM response is non-negotiable in production. The cost of a retry loop is far lower than the cost of debugging silent data corruption downstream.',
      'Human review gates are valuable not just for quality control but for client trust. Seeing exactly which products the AI classified and being able to override before anything goes live builds confidence in the system.',
      'S3 + Lambda was the correct decoupling choice even though it added operational complexity. Synchronous processing would have been simpler to implement but fragile under real upload volumes.',
      'Corrective retry prompts (telling the LLM specifically what it got wrong) resolve the vast majority of schema validation failures — a generic "try again" prompt does not.',
    ],

    futureRoadmap: [
      'Multi-marketplace support — publish to Amazon Seller Central and Etsy from the same pipeline without additional data preparation',
      'Image AI analysis — enrich product descriptions and detect primary category from product images alongside text fields',
      'Supplier portal — allow supplier partners to drop files directly without manual email handoffs',
      'Confidence scoring per field — show enrichment confidence in the review dashboard so reviewers can prioritize attention on uncertain fields',
      'Automated regression testing — catch taxonomy drift when the LLM model is updated or the taxonomy tree changes',
    ],
  },

  // ──────────────────────────────────────────────────────────

  'dtlp-data-extraction-extension': {
    name: 'DTLP Data Extraction Extension',
    tagline: 'Chrome extension that extracts structured product attributes from any product page using a dual-LLM pipeline — Perplexity sonar-pro as primary, Google Gemini as verifier — with JSON schema validation and IndexedDB local storage.',
    gradient: 'linear-gradient(135deg, #3730a3 0%, #2563eb 100%)',
    image: '/images/project-2.svg',
    gallery: [
      '/images/project-2.svg',
      '/images/project-2-workflow.svg',
      '/images/project-2-arch.svg',
      '/images/project-2-output.svg',
    ],
    status: 'Shipped',
    llm: 'Perplexity sonar-pro + Gemini',
    github: 'https://github.com/monkey-d-luffy9888888',
    demo: '#',
    tech: ['JavaScript', 'Chrome Extension API', 'Manifest V3', 'Perplexity sonar-pro', 'Google Gemini', 'IndexedDB', 'JSON Schema'],

    executiveSummary:
      'DTLP is a Chrome browser extension that turns any product detail page into a structured JSON record in one click. It uses Perplexity sonar-pro for the primary extraction, Google Gemini for independent verification and gap-filling, validates the merged result against a JSON schema, and stores it in IndexedDB. The user can review, edit, and export all extracted records as CSV or JSON at any time.',

    problem:
      'E-commerce and procurement teams copy product specifications manually from supplier and manufacturer websites into spreadsheets. A single product page can contain dozens of attributes scattered across tables, tabs, description sections, and specification panels. Manual copying is slow, inconsistent, and introduces transcription errors — and it scales linearly with catalog size, making it impractical for large catalogs.',

    whyBuilt:
      'The two-model verification approach was the central design hypothesis: a single LLM can extract product attributes, but it makes systematic errors that are invisible until they propagate to a spreadsheet. By using a second independent model from a different provider, the system gets genuine second-opinion coverage rather than a model confirming what it already produced. This architecture was tested against single-model extraction and showed measurable improvement in attribute recall and value accuracy.',

    realWorldUseCase:
      'A procurement analyst is sourcing industrial components from 40 different supplier websites. Each website has a different layout — some use specification tables, some embed specs in the product description, some split data across tabs. DTLP extracts the part number, material grade, dimensions, tolerance, operating temperature, and certifications from each page in a single click, regardless of layout. At the end of the session, the analyst exports all 40 records as a CSV for the engineering team.',

    architectureDiagram:
`Browser Tab (Product Page)
          │
          │  user clicks extension icon
          ▼
┌─────────────────────┐
│  Content Script     │
│  (DOM + text grab)  │
└──────────┬──────────┘
           │  page text + key HTML
           ▼
┌─────────────────────┐
│  Background         │ ◄── Manifest V3 service worker
│  Service Worker     │     (all external API calls)
└────┬────────────────┘
     │                │
     │                │
┌────▼────┐    ┌──────▼──────────┐
│Perplexity│    │ Google Gemini   │
│sonar-pro │    │ (verification + │
│(primary) │    │  gap fill)      │
└────┬────┘    └──────┬──────────┘
     └────────┬────────┘
              │  merged JSON
              ▼
┌─────────────────────┐
│  JSON Schema        │
│  Validator          │
│  (with corrective   │
│   retry prompt)     │
└──────────┬──────────┘
           │  valid record
           ▼
┌─────────────────────┐
│  IndexedDB          │
│  (browser-local;    │
│   no server)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Popup UI           │
│  + CSV/JSON Export  │
└─────────────────────┘`,

    systemFlow: [
      'User navigates to a product page in Chrome',
      'User clicks the DTLP extension icon in the browser toolbar',
      'Content script captures the full visible text and key HTML elements (headings, tables, specification lists) from the active tab',
      'Content script sends the captured data to the Background Service Worker via Chrome message passing',
      'Service Worker builds a structured extraction prompt combining page content and the JSON schema definition',
      'Service Worker calls Perplexity sonar-pro API with the extraction prompt — receives initial JSON attribute object',
      'Service Worker calls Google Gemini API with the same page content and the sonar-pro result — Gemini verifies values and fills empty fields',
      'Merged result is validated against the product attribute JSON schema',
      'If validation fails, a corrective retry prompt is sent to the LLM naming the specific invalid field — up to 3 retries',
      'Valid record is written to IndexedDB with domain, URL, and extraction timestamp',
      'Popup UI displays the extracted attributes in a table — user can edit fields or mark the record for export',
      'User exports all collected records as CSV or JSON from the popup export button',
    ],

    techStack: [
      { name: 'JavaScript (ES2022)', purpose: 'Core extension language — service workers require vanilla JS; no bundler needed for extension context' },
      { name: 'Chrome Extension API (MV3)', purpose: 'Content scripts for page access, service worker for API calls, storage APIs for persistence, runtime messaging between layers' },
      { name: 'Perplexity sonar-pro', purpose: 'Primary extraction model — processes web page content and returns an initial structured JSON attribute object' },
      { name: 'Google Gemini', purpose: 'Verification and gap-fill — independently re-reads the page, corrects sonar-pro values, fills fields sonar-pro left empty' },
      { name: 'IndexedDB', purpose: 'Browser-native structured storage — holds extracted records across sessions, queryable by domain and date, supports large volumes' },
      { name: 'JSON Schema (draft-07)', purpose: 'Defines expected attribute structure, types, and required fields — validates every LLM response before storage' },
    ],

    aiModels: [
      { name: 'Perplexity sonar-pro', purpose: 'Primary extraction — reads captured page content and returns a structured JSON object with product attributes. Optimised for understanding web page structure and unstructured specification text.' },
      { name: 'Google Gemini (gemini-pro)', purpose: 'Verification and gap-fill — receives the page content and sonar-pro\'s output; independently identifies errors and fills attributes that sonar-pro left blank.' },
    ],

    apis: [
      { name: 'Perplexity sonar-pro API', purpose: 'Primary LLM call — structured extraction prompt, returns initial attribute JSON' },
      { name: 'Google Gemini API', purpose: 'Secondary verification call — receives sonar-pro result and page content for independent review' },
      { name: 'Chrome Extension API', purpose: 'Tabs, scripting (content script injection), storage, runtime message passing between extension components' },
    ],

    database: {
      name: 'IndexedDB (browser-local)',
      purpose: 'No server-side storage. All records are stored in the browser\'s built-in IndexedDB. Records are indexed by domain and extraction timestamp. Supports gigabytes of structured data — well beyond what chrome.storage can hold.',
    },

    folderStructure:
`dtlp-data-extraction/
├── src/
│   ├── background/
│   │   └── service-worker.js    # MV3 service worker; all LLM API calls
│   ├── content/
│   │   └── extractor.js         # Injected DOM capture script
│   ├── popup/
│   │   ├── popup.html           # Extension popup UI shell
│   │   ├── popup.js             # Popup controller + results display
│   │   └── popup.css            # Popup styling
│   ├── utils/
│   │   ├── ai-client.js         # Perplexity + Gemini API wrappers
│   │   ├── schema-validator.js  # JSON Schema validation + retry logic
│   │   └── db.js                # IndexedDB wrapper (get/set/export)
│   └── models/
│       └── product-schema.json  # Expected attribute schema definition
├── manifest.json                # Chrome Extension Manifest V3
└── icons/                       # Extension icons 16 / 48 / 128 px`,

    features: [
      'One-click extraction from any product detail page — no page-specific configuration',
      'Dual-LLM pipeline: Perplexity sonar-pro (primary extraction) + Google Gemini (verification and gap-fill)',
      'Merging strategy: sonar-pro values take priority; Gemini fills only empty fields; fields confirmed by both are flagged high-confidence',
      'JSON schema validation on every LLM response — corrective retry prompt on failure',
      'IndexedDB local storage — extracted records persist across browser restarts without a server',
      'Bulk CSV and JSON export of all collected records',
      'Field-level review and manual correction in the popup UI',
      'Works across arbitrary supplier and manufacturer websites regardless of page layout',
      'Manifest V3 compliant — compatible with current Chrome versions and Web Store policies',
    ],

    installation: [
      'Clone the repository to a local directory',
      'Open Chrome and navigate to `chrome://extensions`',
      'Enable Developer Mode using the toggle in the top-right corner',
      'Click "Load unpacked" and select the `dtlp-data-extraction/` folder',
      'The DTLP icon appears in the toolbar — click it and open Options',
      'Enter your Perplexity API key and Gemini API key in the Options page',
      'Navigate to any product page and click the extension icon to test extraction',
    ],

    envVars: [
      { name: 'PERPLEXITY_API_KEY', description: 'Perplexity sonar-pro API key (set in extension Options)', example: 'pplx-xxxxxxxxxxxx' },
      { name: 'GEMINI_API_KEY', description: 'Google Gemini API key (set in extension Options)', example: 'AIza...' },
      { name: 'SCHEMA_VERSION', description: 'Product attribute schema version identifier', example: 'v1' },
      { name: 'MAX_RETRY_ATTEMPTS', description: 'Maximum retry count on schema validation failure', example: '3' },
    ],

    challenges: [
      {
        challenge: 'Manifest V3 service worker lifecycle — API calls interrupted by worker termination',
        solution: 'MV3 service workers terminate after inactivity, which can interrupt in-flight API calls. Restructured the extraction flow so that each LLM call is a single self-contained async operation. The result is written to IndexedDB before the service worker can be suspended — no multi-step stateful workflows that span worker activations.',
      },
      {
        challenge: 'Dual-model result merging strategy — priority conflicts when both models produce different values for the same field',
        solution: 'Defined a clear merge priority: sonar-pro values take precedence because it reads live web content more reliably; Gemini fills only the fields that sonar-pro left empty. When both models provide a value for the same field, the values are compared — if they match, the field gets a "confirmed" flag; if they differ, sonar-pro\'s value is used and the field is flagged "unverified" in the stored record.',
      },
      {
        challenge: 'Schema validation failure loop — retrying with the same prompt produces the same error',
        solution: 'On validation failure, the retry prompt includes the specific JSON schema error message and the field name that failed. Example: "The \'weight\' field must be a string like \'2.5 kg\', not a number. Correct this field and return the full attribute object again." Corrective prompting resolves the majority of validation failures on the second attempt. After three failed retries, the field is left null and flagged for manual completion.',
      },
    ],

    decisions: [
      {
        decision: 'Two separate LLM providers instead of one model with self-correction',
        rationale: 'A model correcting its own output is biased toward confirming what it already produced — it is likely to make the same systematic errors. Using a model from a different provider as the verifier gives independent judgment. In head-to-head testing on product pages, dual-model recall was measurably higher than single-model with retry.',
        tradeoff: 'Two API calls per extraction doubles the API cost per extraction and slightly increases latency. Mitigated by batching: both models receive the same captured page content in the same session, so no additional page fetching is needed. The quality improvement justifies the additional cost for professional use cases.',
      },
      {
        decision: 'IndexedDB over chrome.storage.local for extracted records',
        rationale: 'chrome.storage.local has a 10MB limit that an active user hitting dozens of product pages per session can reach quickly. IndexedDB supports gigabytes of structured data, is queryable by any field (domain, date, category), and supports binary blobs for future attachment storage. For a tool collecting data across hundreds of pages, IndexedDB is the only viable option.',
        tradeoff: 'IndexedDB has a verbose, callback-based API compared to the simpler chrome.storage API. Abstracted behind a db.js utility module that exposes a clean async interface — the complexity is isolated to one file.',
      },
      {
        decision: 'All API calls in the service worker, not in content scripts',
        rationale: 'Content scripts run inside the page context and are subject to that page\'s Content Security Policy. Many supplier sites have strict CSPs that block arbitrary fetch calls to external domains — including the Perplexity and Gemini APIs. Moving all LLM calls to the service worker bypasses the page CSP entirely, since service workers have their own network context.',
        tradeoff: 'Requires a message-passing hop between the content script and service worker for every extraction. Adds a small latency overhead and more code to maintain. The tradeoff is mandatory — there is no reliable way to make external API calls from a content script on sites with strict CSPs.',
      },
    ],

    performance: [
      'Page content is captured once per extraction and sent to both LLMs without re-fetching the page',
      'IndexedDB writes are async and non-blocking — the popup UI responds immediately while the write completes in the background',
      'Records are indexed by domain and extraction date in IndexedDB for fast popup queries even with thousands of stored records',
      'Service worker state is kept minimal — no in-memory caches that would be lost on termination',
    ],

    security: [
      'API keys stored in Chrome\'s encrypted extension storage (chrome.storage.local) — inaccessible to page scripts',
      'No product data is sent anywhere except the Perplexity and Gemini API endpoints on explicit user action',
      'Content Security Policy in manifest.json restricts the extension\'s own script origins',
      'Page content is captured only on user click — the extension never passively monitors page content',
    ],

    scalability: [
      'Designed for single-user, single-browser operation — no server-side scaling required',
      'IndexedDB handles tens of thousands of extracted records without performance degradation',
      'For team use, the CSV/JSON export workflow handles sharing without requiring a shared backend',
      'A future team mode could add a lightweight sync server using the existing export format as the transfer format',
    ],

    testing:
      'Tested against product pages from 20+ supplier and manufacturer websites covering different page layouts: structured specification tables, prose descriptions with embedded specs, multi-tab product pages, and non-English content. The JSON schema validator is unit-tested with a library of sample valid and invalid LLM responses, including edge cases like missing required fields, wrong types, and unexpected nesting. Service worker lifecycle edge cases (suspended worker during extraction) are tested by artificially reducing the service worker idle timeout in development.',

    results: [
      'Extracts structured product attributes from arbitrary product pages without page-specific configuration',
      'Dual-LLM pipeline measurably outperforms single-model extraction on attribute recall — specifically on pages where specifications are embedded in prose rather than structured tables',
      'JSON schema validation consistently catches LLM formatting errors before they reach IndexedDB',
      'IndexedDB storage provides reliable persistence across browser restarts for large extraction sessions',
    ],

    lessonsLearned: [
      'Corrective retry prompts that name the specific failing field are far more effective than neutral "try again" prompts. Specificity in the error message directly maps to success rate on the second attempt.',
      'The Manifest V3 service worker lifecycle is the single biggest source of development complexity for Chrome extensions. Design for statelessness from the beginning — do not build any logic that assumes the worker is continuously running.',
      'Different LLM providers have genuinely different strengths on the same content. The two-model approach was validated empirically, not assumed — and the variance in per-field performance across models justifies the extra API call.',
    ],

    futureRoadmap: [
      'Support for non-English product pages — auto-detect page language and include language context in the extraction prompt',
      'Team sharing mode — export to Google Sheets or a shared workspace instead of local CSV',
      'Custom schema builder — let users define exactly which attributes they want to extract for their specific use case',
      'Confidence scoring per field — surface the model agreement level in the popup so users know which fields to verify manually',
      'Firefox and Edge support — WebExtension API is largely compatible with Chrome extension APIs',
    ],
  },

  // ──────────────────────────────────────────────────────────

  'ai-trading-extension': {
    name: 'AI Trading Extension',
    tagline: 'Chrome extension with a local Flask backend that pulls real-time OHLCV data from Binance, runs deterministic candlestick pattern detection, and delivers AI trade recommendations directly into the browser overlaid on the chart.',
    gradient: 'linear-gradient(135deg, #065f46 0%, #0d9488 100%)',
    image: '/images/project-3.svg',
    gallery: [
      '/images/project-3.svg',
      '/images/project-3-workflow.svg',
      '/images/project-3-arch.svg',
      '/images/project-3-output.svg',
    ],
    status: 'Shipped',
    llm: 'AI recommendation engine',
    github: 'https://github.com/monkey-d-luffy9888888',
    demo: '#',
    tech: ['Python', 'Flask', 'JavaScript', 'Chrome Extension API', 'Manifest V3', 'Binance API', 'Candlestick Pattern Detection'],

    executiveSummary:
      'AI Trading Extension is a two-part system: a Chrome extension that injects a live trading intelligence panel into any charting website, and a local Flask backend that fetches real-time OHLCV data from Binance, runs 14 classical candlestick pattern detectors, and returns an AI-generated trade recommendation. Everything runs locally on the user\'s machine — no trading data transits a remote server.',

    problem:
      'Retail traders monitor charts, pattern libraries, and trade journals in separate browser tabs. Spotting classical candlestick patterns manually under live market conditions is slow and error-prone. The context switch between the chart and an analysis tool costs time and attention during fast-moving markets. Patterns that are time-sensitive lose value if detection is delayed by manual analysis.',

    whyBuilt:
      'The central insight is that pattern detection from OHLCV data is a deterministic mathematical operation — it does not require ML. The 14 most commonly traded classical patterns can be encoded as explicit ratio-checking functions. This makes detection reliable, explainable, and fast. The AI layer adds market-context interpretation on top of the deterministic detection, not as a replacement for it.',

    realWorldUseCase:
      'A trader has a Binance chart open for BTCUSDT on a 1-hour timeframe. The AI Trading Extension overlay is visible in the top-right corner of the browser. The extension polls the Flask backend every 60 seconds. When a Bullish Engulfing pattern is confirmed on the most recent candle, the overlay updates to show the pattern name, the detected candle information, and the AI recommendation: "Bullish signal. Engulfing pattern at key support level, volume above 20-period average. Consider long entry above the high of the engulfing candle."',

    architectureDiagram:
`┌─────────────────────────────────────────────┐
│  Chrome Extension Overlay Panel             │
│  (injected into the charting website)       │
└──────────────────────┬──────────────────────┘
                       │ HTTP to localhost
                       ▼
┌─────────────────────────────────────────────┐
│  Flask Backend (localhost:5000)             │
│                                             │
│  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Binance REST    │─►│ Data Parser      │  │
│  │ API (OHLCV)     │  │ (OHLCV normalize)│  │
│  └─────────────────┘  └────────┬─────────┘  │
│                                │             │
│              ┌─────────────────▼──────────┐  │
│              │  Pattern Detection Engine  │  │
│              │  (14 deterministic checks) │  │
│              └─────────────────┬──────────┘  │
│                                │             │
│              ┌─────────────────▼──────────┐  │
│              │  AI Recommendation Engine  │  │
│              │  (context + patterns → AI) │  │
│              └─────────────────┬──────────┘  │
└───────────────────────────────┼─────────────┘
                                │ JSON response
              ┌─────────────────▼──────────────┐
              │  Extension Overlay Panel        │
              │  signal + confidence + rationale│
              └────────────────────────────────┘`,

    systemFlow: [
      'User loads a charting or trading website in Chrome with the extension active',
      'Content script injects the floating overlay panel into the page',
      'User selects a trading symbol (e.g. BTCUSDT) and timeframe (e.g. 1h) in the panel',
      'Extension sends an analysis request to the Flask backend at localhost:5000',
      'Flask backend calls the Binance REST API to fetch the last N OHLCV candles for the symbol and interval',
      'Data parser normalises the Binance kline response into open, high, low, close, volume arrays',
      'Pattern Detection Engine runs all 14 pattern checks against the most recent candles — each check is a deterministic ratio function',
      'Detected patterns (names, candle positions, market context) are collected and ranked by classical reliability',
      'AI Recommendation Engine receives the detected patterns, current price, volume trend, and recent candle data',
      'AI returns a structured signal: direction (bull/bear/neutral), confidence label, rationale, and key price levels',
      'Flask returns the full analysis JSON to the extension overlay',
      'Overlay panel displays the signal with pattern name, rationale, and suggested entry context',
    ],

    techStack: [
      { name: 'Python 3.11 + Flask', purpose: 'Local backend server — handles Binance data fetching, pattern detection, and AI recommendation calls. Deliberately local for trading privacy.' },
      { name: 'JavaScript (ES2022)', purpose: 'Extension overlay and popup — injects the floating panel into the charting page; communicates with Flask backend via fetch.' },
      { name: 'Chrome Extension API (MV3)', purpose: 'Service worker for background state, content script for overlay injection, popup for symbol/timeframe selection.' },
      { name: 'Binance REST API', purpose: 'Fetches real-time OHLCV kline data for any trading pair and interval from the public market data endpoint. No authentication required for market data.' },
      { name: 'Pattern Detection (Python)', purpose: '14 deterministic candlestick pattern functions — each is an explicit ratio-checking rule against OHLCV values, not an ML model.' },
    ],

    aiModels: [
      { name: 'AI recommendation engine', purpose: 'Receives detected patterns, current price, volume context, and recent candle summary. Returns a structured signal with direction (bull/bear/neutral), confidence label, entry rationale, and key price levels to watch.' },
    ],

    apis: [
      { name: 'Binance REST API (GET /api/v3/klines)', purpose: 'OHLCV candlestick data for any trading pair and interval. Public endpoint — no API key required for market data.' },
      { name: 'Flask local server (GET /analyze)', purpose: 'Unified analysis endpoint: accepts symbol and interval, returns pattern detections and AI recommendation.' },
    ],

    database: null,

    folderStructure:
`ai-trading-extension/
├── extension/
│   ├── manifest.json              # Chrome Extension Manifest V3
│   ├── background/
│   │   └── service-worker.js      # Background state management
│   ├── content/
│   │   └── overlay.js             # Injects floating panel into page
│   ├── popup/
│   │   ├── popup.html             # Symbol/timeframe selector
│   │   └── popup.js               # Popup controller
│   └── styles/
│       └── overlay.css            # Floating panel styling
├── backend/
│   ├── app.py                     # Flask application entry point
│   ├── binance_client.py          # Binance REST API wrapper
│   ├── pattern_detector.py        # 14 candlestick pattern functions
│   ├── ai_recommender.py          # AI signal generation
│   ├── rate_limiter.py            # Binance API rate limit handler
│   └── requirements.txt
└── README.md`,

    features: [
      'Floating overlay panel injected into any charting or trading website — no tab switching',
      'Real-time OHLCV data from Binance REST API for any trading pair and timeframe',
      'Detection of 14 classical candlestick patterns: Doji, Hammer, Engulfing, Morning Star, Evening Star, Shooting Star, Harami, and more',
      'AI-generated trade recommendations with direction, confidence label, rationale, and key price levels',
      'Request debounce and 30-second response cache to respect Binance rate limits during symbol switching',
      'Local-first architecture — Flask backend runs on localhost; no trading data leaves the machine',
      'Draggable, collapsible overlay panel — does not obstruct chart interaction',
      'Deterministic pattern detection — each pattern check is explicit logic, not an ML model',
    ],

    installation: [
      'Install Python dependencies in the backend directory: `pip install -r requirements.txt`',
      'Start the Flask backend: `python backend/app.py` — server starts on http://localhost:5000',
      'Open Chrome and navigate to `chrome://extensions`',
      'Enable Developer Mode with the toggle in the top-right corner',
      'Click "Load unpacked" and select the `extension/` directory',
      'Set your AI recommendation API key in `backend/ai_recommender.py` or as an environment variable',
      'Navigate to any charting website and click the DTLP extension icon to open the symbol selector',
      'Enter a trading symbol (e.g. BTCUSDT) and click Analyze',
    ],

    envVars: [
      { name: 'FLASK_PORT', description: 'Local Flask server port', example: '5000' },
      { name: 'BINANCE_BASE_URL', description: 'Binance API base URL', example: 'https://api.binance.com' },
      { name: 'AI_API_KEY', description: 'API key for the AI recommendation engine', example: 'sk-...' },
      { name: 'CANDLE_LOOKBACK', description: 'Number of candles to fetch and analyze', example: '50' },
      { name: 'CACHE_TTL_SECONDS', description: 'Response cache lifetime for same symbol+interval', example: '30' },
    ],

    challenges: [
      {
        challenge: 'Cross-origin requests from the extension overlay to localhost:5000',
        solution: 'Chrome extension content scripts run in the page context and face CORS restrictions plus page CSP. Direct fetch calls to localhost from a content script were blocked on some charting sites with strict CSPs. Moved all fetch calls to the service worker (which has its own unrestricted network context), then used Chrome runtime message passing to route requests from the overlay content script through the service worker to the Flask backend.',
      },
      {
        challenge: 'Binance API rate limiting under rapid symbol switching',
        solution: 'Users frequently switch between symbols quickly, each triggering a new API call. Added a 300ms debounce on the symbol input before firing the request, and a 30-second in-memory cache in Flask that returns the stored response for the same symbol+interval combination without re-calling Binance. This reduces API calls significantly during exploratory symbol browsing.',
      },
      {
        challenge: 'Pattern detection false positives from loose ratio matching',
        solution: 'Early pattern functions matched too aggressively — a candle that was "close to" a Hammer but did not meet the textbook definition triggered a Hammer signal. Rewrote each pattern function to enforce the precise ratio requirements from classical technical analysis literature: specific minimum/maximum ratios for body size relative to total range, upper and lower shadow length relative to body, and in multi-candle patterns, the relationship between consecutive candle bodies. Stricter matching produces fewer but higher-quality signals.',
      },
    ],

    decisions: [
      {
        decision: 'Local Flask backend instead of a cloud API',
        rationale: 'Trading signals involve real financial decisions. Sending trading data through a remote server introduces latency (additional network round trip), data privacy risk (trading activity visible to server operator), and an availability dependency (extension stops working if the server is down). Running the backend on localhost eliminates all three concerns — no data leaves the machine except the public Binance market data request.',
        tradeoff: 'Users must install Python and start the backend manually. There is no push-button "cloud" mode. This is an acceptable complexity for trading tools where privacy and latency matter. A future Electron wrapper could automate the backend startup so users never interact with a terminal.',
      },
      {
        decision: 'Deterministic pattern functions over ML-based detection',
        rationale: 'Classical candlestick patterns have mathematically precise definitions that can be encoded as deterministic ratio checks. An ML-based detector would add opacity ("why did it fire here?"), require training data with labeled pattern occurrences, and introduce model drift over time. Deterministic functions are debuggable, testable against historical data, and produce fully explainable results — important for a tool traders use to make financial decisions.',
        tradeoff: 'The pattern library is fixed to the 14 patterns currently implemented. Novel or informal patterns are not detected. Adding a new pattern requires writing a new function. An ML layer could potentially generalise, but that generalisation would come at the cost of explainability, which is unacceptable in a trading context.',
      },
      {
        decision: 'Overlay panel injection instead of a standalone popup',
        rationale: 'Traders look at their chart while making decisions — switching to an extension popup requires taking focus off the chart. Injecting a floating overlay keeps the signal visible while the chart is visible, preserving the trading context entirely. A Hammer pattern signal seen next to the candle that generated it is more actionable than the same signal in a separate panel.',
        tradeoff: 'The overlay can interfere with chart interaction if its position overlaps a control. Implemented the overlay as a draggable panel with a collapse toggle, letting users move it to a non-interfering position on their specific chart layout.',
      },
    ],

    performance: [
      '30-second response cache in Flask avoids redundant Binance API calls for the same symbol and interval during active analysis sessions',
      '300ms debounce on symbol input prevents cascading API calls during typing',
      'Pattern detection runs synchronously in Python — no async needed; 14 ratio checks complete in microseconds',
      'Overlay panel renders via direct DOM manipulation — no framework overhead',
    ],

    security: [
      'Flask backend binds to localhost (127.0.0.1) only — not exposed to the local network',
      'No trading credentials (API keys, account data) are stored or requested — only public market data is fetched',
      'Extension only reads the active tab\'s page content on user-triggered analysis, never passively',
      'CORS in Flask is configured to accept requests only from the extension\'s origin',
    ],

    scalability: [
      'Designed for single-user, single-machine operation — no server-side scaling concerns',
      'Multiple symbols can be analyzed sequentially with cache preventing redundant calls',
      'Adding support for additional exchanges requires implementing a new data client module (same interface as binance_client.py)',
      'Pattern detection is CPU-bound and fast — multi-symbol parallel analysis would be straightforward to add with threading',
    ],

    testing:
      'Each of the 14 pattern detection functions is unit-tested against historical OHLCV data from the Binance kline history endpoint. Tests include: correct pattern detection on textbook examples, non-detection on similar but non-qualifying candle sequences, and edge cases (doji candles, identical open/close, extreme wick lengths). The Flask endpoint is integration-tested with live Binance market data during development sessions. The extension overlay is manually tested on multiple charting websites to verify injection and layout compatibility.',

    results: [
      'Detects all 14 classical candlestick patterns reliably against their textbook definitions — zero false positives on tested historical data',
      'AI recommendations provide context-aware rationale that helps traders understand why a signal matters, not just what it is',
      'Overlay panel eliminates the context switch between chart and analysis tool during live trading sessions',
      'Local-first architecture means the extension works with zero latency penalty from a remote server hop',
    ],

    lessonsLearned: [
      'Strict textbook-accurate pattern matching (precise ratios from classical technical analysis) produces far fewer false positives than permissive matching. Traders prefer fewer high-confidence signals over many uncertain ones.',
      'The service worker + message passing architecture is the correct design for Chrome extensions making external API calls. Content scripts should never directly fetch from external endpoints — page CSP makes this unreliable across sites.',
      'Local-first is a genuine architectural principle for trading tools, not just a technical choice. It directly addresses privacy and latency concerns that matter to the users of this specific type of tool.',
    ],

    futureRoadmap: [
      'Multi-exchange support — Coinbase and Kraken data adapters using the same client interface as binance_client.py',
      'Multi-timeframe analysis — detect the same pattern on multiple timeframes simultaneously for higher-confidence signals',
      'Signal history logging — store detections with timestamps and symbol for backtesting and win-rate analysis',
      'Alert system — desktop notification when a high-confidence pattern is detected on a watched symbol without the chart being open',
      'Electron wrapper — bundle the Flask backend with the extension into a single-click installer, eliminating the manual Python setup step',
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

  const Section = ({ idx, label, title, children }: { idx: number; label: string; title: string; children: React.ReactNode }) => (
    <motion.section
      custom={idx} variants={fadeUp} initial="hidden" animate="visible"
      style={{ marginBottom: '3rem' }}
    >
      <SectionHeading label={label} title={title} />
      {children}
    </motion.section>
  )

  const textStyle = { color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', margin: 0 }
  const listStyle = { margin: 0, paddingLeft: '1.25rem', display: 'flex' as const, flexDirection: 'column' as const, gap: '8px' }
  const liStyle = { color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem' }

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
              background: 'rgba(16,185,129,0.25)', color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,0.35)',
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

        {/* 0. Visual Gallery */}
        {project.gallery && project.gallery.length > 0 && (
          <motion.section
            custom={-1} variants={fadeUp} initial="hidden" animate="visible"
            style={{ marginBottom: '3rem' }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                00 — Visual Gallery
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', borderBottom: '1px solid rgba(128,128,128,0.15)', paddingBottom: '0.6rem' }}>
                Project Visuals
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '12px' }}>
              {project.gallery.map((src, i) => {
                const labels = ['Hero Overview', 'AI Workflow', 'Architecture', 'Output Example']
                return (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.015 }}
                    style={{
                      borderRadius: '12px', overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: '#0d1117', cursor: 'pointer',
                    }}
                  >
                    <img
                      src={src}
                      alt={`${project.name} — ${labels[i] ?? `Visual ${i + 1}`}`}
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
                      {labels[i] ?? `Visual ${i + 1}`}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* 1. Executive Summary */}
        <Section idx={0} label="01 — Overview" title="Executive Summary">
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px', padding: '1.5rem 1.75rem',
            borderLeft: '4px solid #2563eb',
          }}>
            <p style={textStyle}>{project.executiveSummary}</p>
          </div>
        </Section>

        {/* 2–4. Problem + Why + Use Case */}
        <Section idx={1} label="02 — Problem Space" title="The Problem, Why I Built It, and Real-World Use">
          <p style={{ ...textStyle, marginBottom: '1.5rem' }}><strong style={{ color: 'var(--text)' }}>The Problem: </strong>{project.problem}</p>
          <p style={{ ...textStyle, marginBottom: '1.5rem' }}><strong style={{ color: 'var(--text)' }}>Why I Built It: </strong>{project.whyBuilt}</p>
          <div style={{
            background: 'rgba(37,99,235,0.06)',
            border: '1px solid rgba(37,99,235,0.15)',
            borderRadius: '10px', padding: '1.25rem 1.5rem',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Real-World Use Case</div>
            <p style={{ ...textStyle, margin: 0 }}>{project.realWorldUseCase}</p>
          </div>
        </Section>

        {/* 5. Architecture Diagram */}
        <Section idx={2} label="03 — Architecture" title="System Architecture Diagram">
          <CodeBlock label="ASCII architecture — read top to bottom">{project.architectureDiagram}</CodeBlock>
        </Section>

        {/* 6. System Flow */}
        <Section idx={3} label="04 — System Flow" title="Complete System Flow">
          <ol style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {project.systemFlow.map((step, i) => (
              <li key={i} style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem' }}>
                {step}
              </li>
            ))}
          </ol>
        </Section>

        {/* 7. Tech Stack */}
        <Section idx={4} label="05 — Technology Stack" title="Technology Stack">
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

        {/* 8. AI Models + APIs + Database */}
        <Section idx={5} label="06 — AI & Integrations" title="AI Models, APIs & Database">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>AI Models</div>
              {project.aiModels.map((m, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '2px' }}>{m.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{m.purpose}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>External APIs</div>
              {project.apis.map((a, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '2px' }}>{a.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{a.purpose}</div>
                </div>
              ))}
            </div>
            {project.database && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>Database</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '4px' }}>{project.database.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.6 }}>{project.database.purpose}</div>
              </div>
            )}
          </div>
        </Section>

        {/* 9. Key Features */}
        <Section idx={6} label="07 — Features" title="Key Features">
          <ul style={listStyle}>
            {project.features.map((f, i) => (
              <li key={i} style={liStyle}>{f}</li>
            ))}
          </ul>
        </Section>

        {/* 10. Folder Structure */}
        <Section idx={7} label="08 — Codebase" title="Folder Structure">
          <CodeBlock label="Project directory layout">{project.folderStructure}</CodeBlock>
        </Section>

        {/* 11. Installation Guide */}
        <Section idx={8} label="09 — Setup" title="Installation Guide">
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

        {/* 12. Environment Variables */}
        <Section idx={9} label="10 — Configuration" title="Environment Variables">
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

        {/* 13. Engineering Challenges */}
        <Section idx={10} label="11 — Engineering Challenges" title="Challenges Faced and How I Solved Them">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {project.challenges.map((c, i) => (
              <div key={i} style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px', padding: '1.25rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#f87171', fontWeight: 800, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px', flexShrink: 0 }}>Problem</span>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5 }}>{c.challenge}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px', flexShrink: 0 }}>Solution</span>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7 }}>{c.solution}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 14. Engineering Decisions */}
        <Section idx={11} label="12 — Engineering Decisions" title="Why This Architecture — Decisions and Trade-offs">
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

        {/* 15. Performance + Security + Scalability */}
        <Section idx={12} label="13 — Engineering Quality" title="Performance, Security & Scalability">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {[
              { title: 'Performance', color: '#34d399', items: project.performance },
              { title: 'Security', color: '#f87171', items: project.security },
              { title: 'Scalability', color: '#60a5fa', items: project.scalability },
            ].map(({ title, color, items }) => (
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

        {/* 16. Testing Strategy */}
        <Section idx={13} label="14 — Testing" title="Testing Strategy">
          <p style={textStyle}>{project.testing}</p>
        </Section>

        {/* 17. Results */}
        <Section idx={14} label="15 — Results" title="Results">
          <ul style={listStyle}>
            {project.results.map((r, i) => (
              <li key={i} style={liStyle}>{r}</li>
            ))}
          </ul>
        </Section>

        {/* 18. Lessons Learned */}
        <Section idx={15} label="16 — Retrospective" title="Lessons Learned">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {project.lessonsLearned.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: '22px', height: '22px',
                  background: 'rgba(37,99,235,0.15)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800, color: '#60a5fa',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i + 1}
                </span>
                <p style={{ ...textStyle, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 19. Future Roadmap */}
        <Section idx={16} label="17 — Future" title="Future Roadmap">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {project.futureRoadmap.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, color: '#2563eb', fontSize: '0.5rem', marginTop: '7px' }}>◆</span>
                <p style={{ ...textStyle, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer CTA */}
        <motion.div
          custom={17} variants={fadeUp} initial="hidden" animate="visible"
          style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap',
            paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
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
              <GithubIcon size={16} /> GitHub Profile
            </motion.span>
          </a>
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
