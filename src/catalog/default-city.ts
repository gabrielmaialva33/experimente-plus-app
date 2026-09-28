/**
 * The city Explorar should switch to, or null to keep the selection.
 *
 * Until the published cities are known the remembered one is kept, so a launch
 * opens on it without waiting. Once they are, a selection that is missing or no
 * longer published gives way to the first published city.
 */
export function defaultCity(
  selected: string | null,
  published: readonly { slug: string }[] | undefined
): string | null {
  if (!published?.length) return null
  if (selected && published.some((city) => city.slug === selected)) return null
  return published[0].slug
}
