import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { askAssistant, type ConciergeReply } from '@/api/concierge'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { placeHref } from '@/place/links'

import { conciergeReferences, isNavigable, type ConciergeReferenceView, referenceHighlight } from './references'

interface DiscoveryAssistantProps {
  citySlug: string | null
  cityName: string | null
}

const MAX_QUESTION_LENGTH = 300

export function DiscoveryAssistant({ citySlug, cityName }: DiscoveryAssistantProps) {
  const colors = useColors()
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<ConciergeReply | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const request = useRef<AbortController | null>(null)
  const trimmed = question.trim()
  const canAsk = Boolean(citySlug) && trimmed.length >= 3 && !loading
  // Only the grounded references the server returned; never a place read out of
  // the model's prose.
  const references = conciergeReferences(reply)

  const open = (view: ConciergeReferenceView) =>
    router.push(placeHref(`${view.citySlug}`, `${view.establishmentSlug}`, referenceHighlight(view.ref)))

  useEffect(
    () => () => {
      request.current?.abort()
    },
    []
  )

  const submit = async () => {
    if (!canAsk || !citySlug) return

    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setFailed(false)
    setReply(null)

    try {
      const result = await askAssistant({ question: trimmed, city: citySlug }, controller.signal)
      if (!controller.signal.aborted) {
        setReply(result)
      }
    } catch {
      if (!controller.signal.aborted) {
        setFailed(true)
      }
    } finally {
      if (request.current === controller) {
        request.current = null
        setLoading(false)
      }
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.borderSubtle },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Concierge</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>O que você quer fazer?</Text>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>
          Pergunte por ideias em {cityName ?? 'sua cidade'}. As sugestões usam somente lugares
          publicados no Experimente+.
        </Text>
      </View>

      <TextInput
        accessibilityLabel="Pergunta para o Concierge"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ex.: quero um café tranquilo e depois algo para fazer à tarde"
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={MAX_QUESTION_LENGTH}
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.input,
            color: colors.foreground,
          },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAsk }}
        disabled={!canAsk}
        onPress={() => void submit()}
        style={[
          styles.button,
          {
            backgroundColor: canAsk ? colors.primary : colors.muted,
          },
        ]}
      >
        <Text
          style={[
            styles.buttonLabel,
            { color: canAsk ? colors.primaryForeground : colors.mutedForeground },
          ]}
        >
          {loading ? 'Pensando…' : 'Perguntar'}
        </Text>
      </Pressable>

      {failed ? (
        <Text accessibilityLiveRegion="polite" style={[styles.help, { color: colors.destructive }]}>
          Não foi possível consultar agora. Tente novamente em instantes.
        </Text>
      ) : null}

      {reply ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.answer, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.answerLabel, { color: colors.primaryAccent }]}>
            {reply.outcome === 'grounded'
              ? 'Sugestão ancorada no catálogo'
              : reply.outcome === 'refused'
                ? 'Posso ajudar com descoberta local'
                : 'Sugestões do catálogo'}
          </Text>

          {reply.personalized ? (
            // Said only when the server applied interests, never inferred from
            // being signed in: a person without interests gets the plain answer.
            <Text style={[styles.answerText, { color: colors.mutedForeground }]} testID="concierge-personalized">
              Considerando seus interesses.
            </Text>
          ) : null}

          {reply.text ? (
            <Text style={[styles.answerText, { color: colors.foreground }]}>{reply.text}</Text>
          ) : reply.outcome === 'degraded' ? (
            <Text style={[styles.answerText, { color: colors.foreground }]}>
              O assistente está indisponível agora, então trouxe opções publicadas no catálogo.
            </Text>
          ) : null}

          {references.length > 0 ? (
            <View style={styles.items}>
              {references.map((view) => {
                const footer = [view.place, view.detail].filter(Boolean).join(' · ')

                if (!isNavigable(view)) {
                  return (
                    <View key={view.key} style={styles.item}>
                      {view.kindLabel ? (
                        <Text style={[styles.itemKind, { color: colors.mutedForeground }]}>
                          {view.kindLabel}
                        </Text>
                      ) : null}
                      <Text style={[styles.itemName, { color: colors.foreground }]}>
                        {view.name}
                      </Text>
                      {footer ? (
                        <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                          {footer}
                        </Text>
                      ) : null}
                    </View>
                  )
                }

                return (
                  <Pressable
                    key={view.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${view.name}`}
                    onPress={() => open(view)}
                    style={styles.item}
                  >
                    {view.kindLabel ? (
                      <Text style={[styles.itemKind, { color: colors.mutedForeground }]}>
                        {view.kindLabel}
                      </Text>
                    ) : null}
                    <Text style={[styles.itemName, { color: colors.primary }]}>{view.name}</Text>
                    {footer ? (
                      <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                        {footer}
                      </Text>
                    ) : null}
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    marginHorizontal: spacing.gutter,
    padding: spacing.lg,
  },
  copy: { gap: spacing.xs },
  eyebrow: typography.overline,
  title: typography.heading,
  help: typography.caption,
  input: {
    ...typography.body,
    borderRadius: radius.thumb,
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonLabel: { ...typography.label, ...textWeight('700') },
  answer: { borderRadius: radius.thumb, gap: spacing.sm, padding: spacing.md },
  answerLabel: { ...typography.caption, ...textWeight('700') },
  answerText: typography.body,
  items: { gap: spacing.sm },
  item: { gap: 2, minHeight: 44, justifyContent: 'center' },
  itemKind: { ...typography.caption, ...textWeight('700'), textTransform: 'uppercase' },
  itemName: { ...typography.body, ...textWeight('600') },
  itemMeta: typography.caption,
})
