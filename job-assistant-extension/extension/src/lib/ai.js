// Which AI provider drafts answers and letters, and the Gemini client. The key is yours: it is kept in
// extension storage (never in code or git) and sent only to the provider you chose.

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5-5'

/**
 * { provider, apiKey, model } for the provider you chose (settings.aiProvider), falling back to whichever key
 * exists; null when there is no key at all.
 */
export function aiConfig(settings = {}) {
  const gemini = settings.geminiKey ? { provider: 'gemini', apiKey: settings.geminiKey, model: settings.geminiModel || GEMINI_DEFAULT_MODEL } : null
  const claude = settings.anthropicKey ? { provider: 'anthropic', apiKey: settings.anthropicKey, model: settings.model || CLAUDE_DEFAULT_MODEL } : null
  if (settings.aiProvider === 'gemini') return gemini ?? claude
  if (settings.aiProvider === 'anthropic') return claude ?? gemini
  return gemini ?? claude
}

export const hasAi = (settings) => Boolean(aiConfig(settings))
export const providerName = (cfg) => (cfg?.provider === 'gemini' ? 'Gemini' : 'Claude')

/** One Gemini call. Returns { text, model, truncated }. Throws an Error with a readable message. */
export async function geminiGenerate({ apiKey, model = GEMINI_DEFAULT_MODEL, system, user, maxOutputTokens = 4096, temperature = 0.4, fetchFn = fetch }) {
  if (!apiKey) throw new Error('Add your Gemini API key in Profile → AI drafting first.')
  let res
  try {
    res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      // The key goes in a header, not the URL, so it never appears in logs or the address bar.
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens, temperature },
      }),
    })
  } catch (err) {
    throw new Error(`Could not reach the Gemini API: ${err?.message ?? err}`)
  }
  let body = null
  try { body = await res.json() } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = body?.error?.message ?? res.statusText
    if (res.status === 429) throw new Error('Gemini rate limit reached — try again in a minute.')
    if (res.status === 401 || res.status === 403 || /api key (not valid|expired)|API_KEY_INVALID/i.test(msg)) throw new Error('The Gemini API key was refused. Check it in Profile → AI drafting.')
    if (res.status === 404) throw new Error(`Gemini model “${model}” was not found. Change it in Profile → AI drafting.`)
    throw new Error(`Gemini API error ${res.status}: ${msg}`)
  }
  if (body?.promptFeedback?.blockReason) throw new Error('Gemini declined to draft this. Write it yourself or rephrase the question.')
  const cand = body?.candidates?.[0]
  if (!cand || ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT'].includes(cand.finishReason)) throw new Error('Gemini declined to draft this. Write it yourself or rephrase the question.')
  const text = (cand.content?.parts ?? []).map((p) => p.text ?? '').join('\n').trim()
  if (!text) throw new Error('The answer had no text. Try again.')
  return { text, model: body.modelVersion ?? model, truncated: cand.finishReason === 'MAX_TOKENS' }
}
