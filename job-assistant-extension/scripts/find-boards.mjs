// Dev tool: lists which candidate company boards have non-senior India or remote engineering roles (used to pick DEFAULT_SOURCES).
import { fetchSource } from '../extension/src/lib/sources.js'
import { isRelevantTitle } from '../extension/src/lib/match.js'
const cands = {
  greenhouse: ['postman','browserstack','hackerrank','druva','sprinklr','mindtickle','chargebee','clevertap','innovaccer','rubrik','cohesity','gitlab','elastic','mongodb','cloudflare','twilio','okta','stripe','vercel','canonical','sourcegraph','zapier','remotecom','phonepe','groww','meesho','razorpay','swiggy','cred','zeta','highradius','freshworks','atlan','hasura','observeai','uniphore','yellowai','gupshup','haptik','sarvamai','krutrim','turing','toptal','deel','datadog','confluent','hashicorp','grafanalabs','airbnb','dropbox','pinterest','figma','discord','reddit','instacart','doordash','robinhood','coinbase','gusto','brex','plaid','affirm','asana','airtable','webflow','samsara','anduril','nuro','waymo','scaleai','huggingface','perplexityai','runwayml','jasper','writer','glean','harvey','abridge','tempus','pathai','databricks','snowflake','temporal','redpanda','supabase','posthog','retool','clickhouse','fivetran','dbtlabsinc','airbyte','prefect','dagster','modal','replicate','together','fireworksai','anyscale','weightsandbiases','pinecone','qdrant','weaviate','langchain','llamaindex','cohere'],
  lever: ['razorpay','swiggy','cred','meesho','zepto','sharechat','groww','jupiter','sliceit','phonepe','dream11','unacademy','hasura','postman','zeta','fampay','khatabook','cars24','urbancompany','udaan','ola','paytm','zomato','nykaa','lenskart','acko','dunzo','spinny','upgrad','vedantu','byjus','physicswallah','scaler','interviewbit','atlan','rippling','kong','gojek','grab','shopee','canva','atlassian','wise','revolut','monzo','palantir','spotify','plaid','netflix','eventbrite','lyft','mistral','tomtom','sumup','n26','celonis','personio','contentful','deliveryhero','zalando','blinkit','smallcase','setu','juspay','chargebee','leena','sprinto','yellowai','observeai','gupshup','exotel','mfine','practo','pharmeasy','cult','curefit','ather','rapido','bounce'],
  ashby: ['supabase','posthog','linear','notion','ramp','replit','vercel','deel','retool','cursor','perplexity','elevenlabs','langchain','modal','baseten','pinecone','sierra','decagon','harvey','writer','cognition','character','lovable','sarvam','hebbia','glean','runway','suno','pika','luma','ideogram','black-forest-labs','together','fireworks','anysphere','warp','zed','tldraw','resend','clerk','neon','convex','inngest','trigger','temporal','dagster','airbyte','dbt','hex','mode','sigma','census','hightouch','rudderstack','segment','mixpanel','amplitude','statsig','launchdarkly','sentry','grafana','tailscale','fly','railway','render','netlify','cloudflare','snyk','socket','semgrep','sourcegraph','codeium','tabnine','continue','sweep','factory','imbue','adept','inflection','mistral','krea','gamma','tome','pitch','loom','descript','captions','synthesia','heygen','elevenlabs','assemblyai','deepgram','rime','cartesia','vapi','retell','bland','sindarin','hume']
}
const out = []
const isIndiaOrRemote = (locs) => /india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|remote/i.test(locs.join(' '))
const senior = /senior|staff|principal|lead|manager|director|head|sr\.|architect|vp/i
for (const [ats, toks] of Object.entries(cands)) {
  for (const token of [...new Set(toks)]) {
    try {
      const jobs = await fetchSource({ company: token, ats, token }, { keepTitle: () => true })
      const fit = jobs.filter((j) => isRelevantTitle(j.title) && !senior.test(j.title) && isIndiaOrRemote(j.locations ?? []))
      const india = fit.filter((j) => /india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai/i.test((j.locations ?? []).join(' ')))
      if (fit.length) out.push({ ats, token, total: jobs.length, fit: fit.length, india: india.length, sample: fit[0].title.slice(0, 40) + ' @ ' + (fit[0].locations ?? []).join('; ').slice(0, 30) })
    } catch { /* no board */ }
  }
}
out.sort((a, b) => b.india - a.india || b.fit - a.fit)
for (const o of out) console.log(`${o.ats.padEnd(10)} ${o.token.padEnd(18)} total ${String(o.total).padStart(4)} · junior-ish eng India/remote ${String(o.fit).padStart(3)} (India ${o.india}) · ${o.sample}`)
console.log(`\n${out.length} boards with at least one non-senior engineering role in India or remote`)
