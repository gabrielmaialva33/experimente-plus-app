import { ChoiceControl } from '@/components/choice-control'

/** Filters retain their pill shape, target and reserved selection marker. */
export function Chip(props: { label: string; selected?: boolean; maxWidth?: number; onPress: () => void }) {
  return <ChoiceControl compact {...props} />
}
