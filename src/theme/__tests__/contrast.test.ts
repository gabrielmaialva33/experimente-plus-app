import { palette } from '../tokens'

/**
 * WCAG 2.x contrast of the text pairs the app actually draws, in both schemes.
 *
 * `tokens.test.ts` checks the canonical web pairs; this names the ones the
 * screens render — including the direction A header band, which the web does
 * not have — so a token change that makes a label unreadable fails by name.
 */

/** Relative luminance of an opaque sRGB colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + 0.05) / (low + 0.05)
}

type Token = keyof typeof palette.light

/** AA for text under 18.66px bold / 24px regular — every pair below is read at body size. */
const AA = 4.5

const pairs: [text: Token, plane: Token, use: string][] = [
  ['foreground', 'background', 'page text'],
  ['foreground', 'card', 'card text'],
  ['mutedForeground', 'background', 'secondary text on the page'],
  ['mutedForeground', 'card', 'secondary text on a card'],
  ['mutedForeground', 'muted', 'disabled button label and neutral status'],
  ['primary', 'background', 'links and ghost buttons on the page'],
  ['primary', 'card', 'links and row icons on a card'],
  ['primaryForeground', 'primary', 'primary button label and selected chip'],
  ['primaryAccent', 'primarySoft', 'selected choice, avatar and icon wells'],
  ['ctaForeground', 'cta', 'conversion button label'],
  ['ctaAccent', 'ctaSoft', 'benefit overline and terms'],
  ['foreground', 'ctaSoft', 'benefit title'],
  ['chromeForeground', 'chrome', 'header band title and undo message'],
  ['chromeMuted', 'chrome', 'header band subtitle and undo action'],
  ['chromeForeground', 'chromeRaised', 'city switch and edit profile on the band'],
  ['successAccent', 'successSoft', 'success notice and open status'],
  ['warningAccent', 'warningSoft', 'warning notice and temporary closure'],
  ['infoAccent', 'infoSoft', 'information notice'],
  ['destructiveAccent', 'destructiveSoft', 'error notice'],
  ['destructiveAccent', 'background', 'field error on the page'],
  ['destructiveAccent', 'card', 'field error on a card'],
  ['statusNeutralForeground', 'statusNeutral', 'neutral status pill'],
  ['contentAbsentForeground', 'contentAbsent', '"Foto indisponível"'],
  ['temporalEmphasisForeground', 'temporalEmphasis', "today's hours"],
]

describe.each(['light', 'dark'] as const)('text contrast in %s', (scheme) => {
  const colors = palette[scheme]

  it.each(pairs)('%s on %s (%s) meets AA', (text, plane) => {
    expect(contrast(colors[text], colors[plane])).toBeGreaterThanOrEqual(AA)
  })
})

it('measures contrast the way WCAG does', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
  expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
})
