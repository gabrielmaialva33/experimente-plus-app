import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * What a store build must not ship without.
 *
 * `EXPO_PUBLIC_*` values are inlined at build time, and the local `.env` is
 * ignored by Git — which also means EAS does not upload it. A production build
 * that forgets them does not fail: `src/api/config.ts` falls back to the
 * homologation server and `src/maps/config.ts` to the MapLibre demo tiles,
 * which end at zoom 6. The result would be a store app talking to the test
 * environment over a map with no streets, and nothing would say so.
 *
 * This runs as the config is read, so the mistake stops the build instead of
 * reaching a phone. It lives in this file rather than under `src/` because the
 * config loader evaluates it in Node, outside Metro, and cannot follow a
 * relative import of another TypeScript file.
 */

/** The homologation origin (ADR-0003: the hostname selects the operation). */
export const HOMOLOGATION_API_HOST = 'experimente-plus.mahina.fun'
export const DEMO_MAP_STYLE_HOST = 'demotiles.maplibre.org'

export function releaseProblems(env: Record<string, string | undefined>): string[] {
  if (env.EAS_BUILD_PROFILE !== 'production') return []

  const problems: string[] = []
  const api = env.EXPO_PUBLIC_API_BASE_URL?.trim()
  const mapStyle = env.EXPO_PUBLIC_MAP_STYLE_URL?.trim()

  if (!api) {
    problems.push(
      'EXPO_PUBLIC_API_BASE_URL is not set; the app would fall back to the homologation server.'
    )
  } else if (hostOf(api) === HOMOLOGATION_API_HOST) {
    problems.push(
      `EXPO_PUBLIC_API_BASE_URL points at homologation (${HOMOLOGATION_API_HOST}); a store build needs the production domain.`
    )
  } else if (!api.startsWith('https://')) {
    problems.push('EXPO_PUBLIC_API_BASE_URL must use https in a store build.')
  }

  if (!mapStyle) {
    problems.push(
      'EXPO_PUBLIC_MAP_STYLE_URL is not set; the map would fall back to demo tiles without streets.'
    )
  } else if (hostOf(mapStyle) === DEMO_MAP_STYLE_HOST) {
    problems.push('EXPO_PUBLIC_MAP_STYLE_URL points at the MapLibre demo tiles.')
  }

  return problems
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * `app.json` stays the source of the configuration; this only adds the guard
 * app.json cannot express.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const problems = releaseProblems(process.env)
  if (problems.length > 0) {
    throw new Error(
      `Production build refused:\n- ${problems.join('\n- ')}\nSee docs/store-submission.md.`
    )
  }

  return config as ExpoConfig
}
