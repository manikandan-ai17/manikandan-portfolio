// Asks you in the terminal about anything the rules cannot answer from your real profile.

import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

export function terminalAsker() {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  const lines = []
  rl.on('line', () => {})

  async function line(prompt, signal) {
    try {
      return (await rl.question(prompt, signal ? { signal } : undefined)).trim()
    } catch (err) {
      if (err.name === 'AbortError') return null
      throw err
    }
  }

  return {
    line,
    close: () => rl.close(),

    /** need: { label, kind, options, why, draft? }  →  { answer, scope } or null (leave it for the browser) */
    async ask(need, { company }) {
      console.log(`\n  ? ${need.label}`)
      if (need.why) console.log(`    (${need.why})`)
      if (need.options?.length && need.kind !== 'written') {
        need.options.slice(0, 12).forEach((o, i) => console.log(`    ${i + 1}) ${o}`))
        const a = await line('    Your choice (number or text; Enter = answer it on the page yourself): ')
        if (!a) return null
        const byNum = /^\d+$/.test(a) ? need.options[Number(a) - 1] : null
        const hit = byNum ?? need.options.find((o) => o.toLowerCase() === a.toLowerCase()) ?? need.options.find((o) => o.toLowerCase().startsWith(a.toLowerCase()))
        if (!hit) { console.log('    Not one of the options; leaving it for the page.'); return null }
        const all = (await line('    Use this answer for every company? (Y/n): ')).toLowerCase() !== 'n'
        return { answer: hit, scope: all ? 'all' : 'company' }
      }
      if (need.draft) {
        console.log('    A draft from your verified profile (the [brackets] are things only you can say):')
        console.log(need.draft.split('\n').map((l) => `      | ${l}`).join('\n'))
      }
      console.log(`    Type your answer for ${company}; finish with a line containing only END. An empty first line leaves it for the page.`)
      const parts = []
      for (;;) {
        const l = await rl.question('    > ')
        if (l.trim() === 'END') break
        if (!parts.length && !l.trim()) return null
        parts.push(l)
      }
      const text = parts.join('\n').trim()
      if (!text) return null
      if (/\[[^\]]+\]/.test(text)) { console.log('    That still has a [bracket]; leaving it for the page.'); return null }
      return { answer: text, scope: need.kind === 'written' ? 'company' : 'all' }
    },
  }
}
