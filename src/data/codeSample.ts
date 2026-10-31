// Code sample from the CAD drawing analysis agent (shown in the Expertise section).
export type Token = { t: string; c: string }

export const CODE: { tokens: Token[] }[] = [
  { tokens: [{ t: '# CAD drawing analysis agent', c: '#4b5563' }] },
  { tokens: [{ t: 'from ', c: '#c084fc' }, { t: 'fastapi ', c: '#e2e8f0' }, { t: 'import ', c: '#c084fc' }, { t: 'FastAPI', c: '#38bdf8' }] },
  { tokens: [{ t: 'from ', c: '#c084fc' }, { t: 'cad_agent.analyze ', c: '#e2e8f0' }, { t: 'import ', c: '#c084fc' }, { t: 'analyse_document', c: '#38bdf8' }] },
  { tokens: [] },
  { tokens: [{ t: 'app ', c: '#e2e8f0' }, { t: '= ', c: '#94a3b8' }, { t: 'FastAPI(', c: '#fbbf24' }, { t: 'title=', c: '#e2e8f0' }, { t: '"CAD Drawing Analysis Agent"', c: '#4ade80' }, { t: ')', c: '#fbbf24' }] },
  { tokens: [] },
  { tokens: [{ t: '@', c: '#f97316' }, { t: 'app', c: '#60a5fa' }, { t: '.post(', c: '#e2e8f0' }, { t: '"/api/analyse/{doc_id}"', c: '#4ade80' }, { t: ')', c: '#e2e8f0' }] },
  { tokens: [{ t: 'def ', c: '#c084fc' }, { t: 'start_analysis', c: '#fbbf24' }, { t: '(doc_id: str):', c: '#e2e8f0' }] },
  { tokens: [{ t: '    d ', c: '#e2e8f0' }, { t: '= ', c: '#94a3b8' }, { t: '_doc_dir', c: '#38bdf8' }, { t: '(doc_id)', c: '#e2e8f0' }] },
  { tokens: [{ t: '    ', c: '' }, { t: 'threading', c: '#38bdf8' }, { t: '.Thread(target=_worker, ...).start()', c: '#e2e8f0' }] },
  { tokens: [{ t: '    ', c: '' }, { t: 'return ', c: '#c084fc' }, { t: '{', c: '#e2e8f0' }, { t: '"state"', c: '#4ade80' }, { t: ': ', c: '#e2e8f0' }, { t: '"running"', c: '#4ade80' }, { t: '}', c: '#e2e8f0' }] },
  { tokens: [] },
  { tokens: [{ t: '$ ', c: '#4ade80' }, { t: 'python ', c: '#94a3b8' }, { t: 'run.py', c: '#60a5fa' }] },
  { tokens: [{ t: '✓ ', c: '#4ade80' }, { t: 'Serving ', c: '#6b7280' }, { t: 'http://127.0.0.1:8000', c: '#fbbf24' }] },
  { tokens: [{ t: '✓ ', c: '#4ade80' }, { t: 'Upload a PDF, ', c: '#6b7280' }, { t: 'run the analysis', c: '#4ade80' }] },
]
