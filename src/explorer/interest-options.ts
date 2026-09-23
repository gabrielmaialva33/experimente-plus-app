import type { Interest } from '@/api/explorer'

export interface InterestOption {
  slug: string
  name: string
  /** Chosen before but no longer offered: kept visible so it can be removed. */
  retired: boolean
}

/**
 * What the interests screen offers.
 *
 * The city's categories, plus anything already chosen that this list does not
 * contain — a category deactivated since, or one with no place in the current
 * city. Hiding those would leave a preference the person cannot see and
 * therefore cannot undo.
 */
export function interestOptions(
  cityCategories: { slug: string; name: string }[],
  chosen: Interest[]
): InterestOption[] {
  const offered = new Set(cityCategories.map((category) => category.slug))
  const options: InterestOption[] = cityCategories.map((category) => ({
    slug: category.slug,
    name: category.name,
    retired: false,
  }))

  for (const interest of chosen) {
    if (offered.has(interest.category.slug)) continue
    options.push({
      slug: interest.category.slug,
      name: interest.category.name,
      retired: true,
    })
  }

  return options
}

/** Whether the selection differs from what the server holds. */
export function selectionChanged(selected: Set<string>, chosen: Interest[]): boolean {
  if (selected.size !== chosen.length) return true
  return chosen.some((interest) => !selected.has(interest.category.slug))
}
