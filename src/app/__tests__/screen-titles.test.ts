// The app ships no Node typings; Jest still runs this file in Node.
declare const __dirname: string
const { readdirSync, readFileSync } = jest.requireActual<{
  readdirSync(path: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]
  readFileSync(path: string, encoding: 'utf8'): string
}>('fs')
const { join, relative } = jest.requireActual<{
  join(...parts: string[]): string
  relative(from: string, to: string): string
}>('path')

const appDir = join(__dirname, '..')

/** Route names as Expo Router derives them; the tabs group titles its own screens. */
function stackedRoutes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === '(tabs)' ? [] : stackedRoutes(path)
    }
    if (!entry.name.endsWith('.tsx') || /^[_+]/.test(entry.name)) return []
    return [relative(appDir, path).replace(/\.tsx$/, '')]
  })
}

it('titles every stacked screen, so no header ever shows a raw route path', () => {
  const layout = readFileSync(join(appDir, '_layout.tsx'), 'utf8').replace(/\s+/g, ' ')
  const untitled = stackedRoutes(appDir).filter((route) => {
    const name = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const declared = new RegExp(`name="${name}"[^>]*title:`).test(layout)
    const own = readFileSync(join(appDir, `${route}.tsx`), 'utf8')
    return !declared && !/Stack\.Screen|setOptions/.test(own)
  })

  expect(untitled).toEqual([])
})
