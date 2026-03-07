#!/usr/bin/env bun
/**
 * Usuwa komponent Vue z projektu:
 *  - szuka pliku .vue po nazwie komponentu
 *  - sprawdza użycia w src/
 *  - usuwa plik
 *  - czyści wpis z components.d.ts
 *
 * Użycie:
 *   bun run remove-component <NazwaKomponentu> [--force]
 */

import { readdir, readFile, writeFile, unlink } from 'fs/promises'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname
const COMPONENTS_DTS = join(ROOT, 'src/renderer/components.d.ts')
const SEARCH_ROOT = join(ROOT, 'src')

const args = process.argv.slice(2)
const force = args.includes('--force')
const name = args.find((a) => !a.startsWith('--'))

if (!name) {
  console.error('Użycie: bun run remove-component <NazwaKomponentu> [--force]')
  process.exit(1)
}

// ── 1. Znajdź plik komponentu ────────────────────────────────────────────────

async function findComponent(dir: string, target: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = await findComponent(full, target)
      if (found) return found
    } else if (entry.isFile() && entry.name.toLowerCase() === `${target.toLowerCase()}.vue`) {
      return full
    }
  }
  return null
}

const componentPath = await findComponent(join(ROOT, 'src/renderer/src/components'), name)

if (!componentPath) {
  console.error(`❌  Nie znaleziono pliku komponentu dla "${name}"`)
  process.exit(1)
}

console.log(`✔  Znaleziono: ${relative(ROOT, componentPath)}`)

// ── 2. Sprawdź użycia ────────────────────────────────────────────────────────

async function grepUsages(dir: string, name: string): Promise<string[]> {
  const usages: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      usages.push(...(await grepUsages(full, name)))
    } else if (entry.isFile() && /\.(vue|ts|tsx|js)$/.test(entry.name)) {
      const content = await readFile(full, 'utf8')
      // szuka <NazwaKomponentu, <nazwa-komponentu, import NazwaKomponentu
      const kebab = name.replace(/([A-Z])/g, (m, l, i) => (i ? '-' : '') + l.toLowerCase())
      const pattern = new RegExp(`<${name}[\\s/>]|<${kebab}[\\s/>]|import\\s+.*${name}`, 'g')
      const matches = content.match(pattern)
      if (matches) {
        usages.push(`  ${relative(ROOT, full)}  (${matches.length}x)`)
      }
    }
  }

  return usages
}

const usages = await grepUsages(SEARCH_ROOT, name)

if (usages.length > 0) {
  console.warn(`\n⚠️  Komponent jest używany w ${usages.length} miejscach:`)
  usages.forEach((u) => console.warn(u))

  if (!force) {
    console.error('\nUżyj --force żeby usunąć mimo to.')
    process.exit(1)
  }

  console.warn('\n--force: kontynuuję mimo użyć...\n')
}

// ── 3. Usuń plik ─────────────────────────────────────────────────────────────

await unlink(componentPath)
console.log(`🗑  Usunięto plik: ${relative(ROOT, componentPath)}`)

// ── 4. Wyczyść components.d.ts ───────────────────────────────────────────────

try {
  const dts = await readFile(COMPONENTS_DTS, 'utf8')
  // usuwa linię zawierającą nazwę komponentu (camelCase lub PascalCase)
  const cleaned = dts
    .split('\n')
    .filter((line) => {
      const lower = line.toLowerCase()
      return (
        !lower.includes(`${name.toLowerCase()}:`) && !lower.includes(`/${name.toLowerCase()}.vue`)
      )
    })
    .join('\n')

  if (cleaned !== dts) {
    await writeFile(COMPONENTS_DTS, cleaned, 'utf8')
    console.log(`✔  Usunięto wpis z components.d.ts`)
  } else {
    console.log(`ℹ  Brak wpisu w components.d.ts (lub już usunięty)`)
  }
} catch {
  console.warn(`⚠️  Nie można zaktualizować components.d.ts`)
}

console.log(`\n✅  Gotowe! Komponent "${name}" został usunięty.`)
