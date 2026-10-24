// Answers you gave the runner when it asked, so it never asks the same thing twice and never guesses.
// Stored in runner/answers.json on this computer only (git-ignored). Factual answers apply to every company;
// written answers ("Why this company?") are stored per company because they are specific to it.

import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './shared.mjs'

export const MEMORY_FILE = process.env.RUNNER_MEMORY ?? path.join(ROOT, 'runner/answers.json')
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[*✱]/g, ' ').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

export function loadMemory(file = MEMORY_FILE) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return {} }
}

export function saveMemory(mem, file = MEMORY_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(mem, null, 1))
}

const keyFor = (label, company, scope) => (scope === 'company' ? `${norm(company)}|${norm(label)}` : norm(label))

export function recall(mem, label, company) {
  return mem[keyFor(label, company, 'company')] ?? mem[keyFor(label, company, 'all')] ?? null
}

export function remember(mem, label, company, answer, scope = 'all') {
  mem[keyFor(label, company, scope)] = { answer, label: String(label).slice(0, 160), company: scope === 'company' ? company : null, savedAt: new Date().toISOString() }
  return mem
}
