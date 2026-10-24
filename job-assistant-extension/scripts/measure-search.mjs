// Dev tool: runs a real search over DEFAULT_SOURCES and prints how many Strong/Good jobs land on supported sites.
import { DEFAULT_SOURCES } from '../extension/src/lib/sources.js'
import { runSearch } from '../extension/src/lib/pipeline.js'
import { defaultProfile } from '../extension/src/lib/profile.js'
const p = defaultProfile()
p.phone = '+91 90000 00000'; p.city = 'Coimbatore'; p.country = 'India'
p.eligibility = { ...p.eligibility, authorizedCountries: ['India'], needsSponsorshipElsewhere: true, openToRelocate: true, languages: [{ name: 'English' }] }
const t0 = Date.now()
const { jobs, meta } = await runSearch({ sources: DEFAULT_SOURCES, profile: p })
const all = Object.values(jobs)
const ok = all.filter((j) => ['strong', 'good'].includes(j.match.verdict))
const supported = ok.filter((j) => ['greenhouse', 'lever', 'ashby'].includes(j.ats))
const companies = new Set(supported.map((j) => j.company))
console.log(`search: ${((Date.now() - t0) / 1000).toFixed(0)}s · scored ${all.length} · strong/good ${ok.length} · on supported sites ${supported.length} · distinct companies ${companies.size}`)
console.log('counts:', JSON.stringify(meta.counts))
for (const j of supported.slice(0, 40)) console.log(`  ${j.match.verdict.padEnd(6)} ${String(j.match.score).padStart(3)} ${j.ats.padEnd(10)} ${j.company.slice(0, 18).padEnd(18)} ${j.title.slice(0, 50).padEnd(50)} ${(j.locations || []).join('; ').slice(0, 40)}`)
const india = supported.filter((j) => /india|bengaluru|bangalore|remote/i.test((j.locations || []).join(' ')))
console.log(`\nIndia or remote among them: ${india.length} (${new Set(india.map((j) => j.company)).size} companies)`)
