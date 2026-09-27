import { Button } from '@/components/button'
import { IconButton } from '@/components/icon-button'

import { manualLabel, openManual, type HelpTopic } from './manual'

const ICON = 'help-circle-outline'

const testId = (topic?: HelpTopic) => `help-${topic ?? 'manual'}`

/**
 * A secondary link to the manual under a screen's own content: a 44 ghost
 * pill in the column's text colour, with the help glyph. It opens a page in
 * the browser, so it is a link, named by where it leads.
 */
export function HelpLink({
  topic,
  label,
  align,
}: {
  /** The manual's section; the whole manual without one. */
  topic?: HelpTopic
  /** What the page answers, as a person would ask it: "Como validar". */
  label: string
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <Button
      label={label}
      accessibilityLabel={manualLabel(label)}
      accessibilityRole="link"
      variant="ghost"
      size={44}
      icon={ICON}
      align={align}
      onPress={() => void openManual(topic)}
      testID={testId(topic)}
    />
  )
}

/** The manual behind a 44 circle, for a band or a map where a line of text has no room. */
export function HelpButton({
  topic,
  label,
  tone,
}: {
  topic?: HelpTopic
  /** What the page answers; the screen reader hears "Abrir o manual: …". */
  label: string
  tone?: 'surface' | 'image' | 'chrome'
}) {
  return (
    <IconButton
      icon={ICON}
      accessibilityLabel={manualLabel(label)}
      accessibilityRole="link"
      tone={tone}
      onPress={() => void openManual(topic)}
      testID={testId(topic)}
    />
  )
}

/** The failure cards' way to the manual's troubleshooting section. */
export const TROUBLESHOOTING_HELP = { topic: 'troubleshooting', label: 'Problemas comuns' } as const
