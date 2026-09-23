import resolveConfig, { releaseProblems } from '../../app.config'

const HOMOLOGATION = 'https://experimente-plus.mahina.fun'
const REGIONAL_MAP = 'https://midia-experimente.mahina.fun/maps/norte-parana/style.json'

describe('store build guard', () => {
  it('stays out of the way of every build that is not a production one', () => {
    expect(releaseProblems({})).toEqual([])
    expect(releaseProblems({ EAS_BUILD_PROFILE: 'preview' })).toEqual([])
    expect(
      releaseProblems({ EAS_BUILD_PROFILE: 'development', EXPO_PUBLIC_API_BASE_URL: HOMOLOGATION })
    ).toEqual([])
  })

  it('refuses a production build that would fall back to homologation and the demo map', () => {
    const problems = releaseProblems({ EAS_BUILD_PROFILE: 'production' })

    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/homologation/)
    expect(problems[1]).toMatch(/demo tiles/)
  })

  it('refuses a production build pointed at homologation on purpose', () => {
    expect(
      releaseProblems({
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_API_BASE_URL: `${HOMOLOGATION}/`,
        EXPO_PUBLIC_MAP_STYLE_URL: REGIONAL_MAP,
      })
    ).toEqual([expect.stringMatching(/points at homologation/)])
  })

  it('refuses plain http and the MapLibre demo style', () => {
    expect(
      releaseProblems({
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_API_BASE_URL: 'http://app.exemplo.com.br',
        EXPO_PUBLIC_MAP_STYLE_URL: 'https://demotiles.maplibre.org/style.json',
      })
    ).toEqual([expect.stringMatching(/https/), expect.stringMatching(/demo tiles/)])
  })

  it('lets a correctly configured production build through, unchanged', () => {
    const env = {
      EAS_BUILD_PROFILE: 'production',
      EXPO_PUBLIC_API_BASE_URL: 'https://app.exemplo.com.br',
      EXPO_PUBLIC_MAP_STYLE_URL: REGIONAL_MAP,
    }
    expect(releaseProblems(env)).toEqual([])

    const previous = { ...process.env }
    Object.assign(process.env, env)
    try {
      const config = { name: 'Experimente+', slug: 'experimente-plus' }
      expect(resolveConfig({ config } as never)).toBe(config)
    } finally {
      process.env = previous
    }
  })

  it('stops the build by throwing when something is missing', () => {
    const previous = { ...process.env }
    process.env = { ...previous, EAS_BUILD_PROFILE: 'production' }
    delete process.env.EXPO_PUBLIC_API_BASE_URL
    delete process.env.EXPO_PUBLIC_MAP_STYLE_URL
    try {
      expect(() => resolveConfig({ config: { name: 'x', slug: 'x' } } as never)).toThrow(
        /Production build refused/
      )
    } finally {
      process.env = previous
    }
  })
})
