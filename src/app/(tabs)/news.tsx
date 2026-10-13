import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSelectedCity } from '@/catalog/city-store'
import { useCities, useCityAgenda } from '@/catalog/queries'
import { ContentFrameProvider, useFeedLayout, useScreenFrame } from '@/components/content-frame'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { ScreenHeader } from '@/components/screen-header'
import {
  NewsAgendaSection,
  NewsFollowingSection,
  NewsForYouSection,
  NewsSignInPrompt,
} from '@/explorer/news-sections'
import { useFollowingUpdates, useForYou } from '@/explorer/queries'
import { HelpLink } from '@/help/help-link'
import { useSession } from '@/session/context'
import { useBandStatusBar } from '@/theme/system-bars'
import { spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * "Novidades": what is new for this person in one place — "Para você" from
 * their interests, what the places they follow published, and the agenda of
 * the city chosen in Explorar.
 *
 * Open to everyone. A visitor gets the agenda and the way to an account; the
 * personal sections are only asked for once the session has resolved to a
 * person, and are keyed by operation and person so they never show one
 * account's data to the next. Explorar keeps its own "Para você" row.
 */
export default function NewsScreen() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  // A phone's column, or a wider grid on a tablet and an unfolded phone.
  const { frame } = useFeedLayout()
  useBandStatusBar()

  const { status, context } = useSession()
  const identity =
    status === 'authenticated' && context
      ? { operationId: context.active_operation.id, userId: context.user.id }
      : null
  // While the session is still loading nothing personal is offered, not even the prompt.
  const visitor = status === 'anonymous' || status === 'unavailable'

  const citySlug = useSelectedCity()
  const cities = useCities()
  const cityName = cities.data?.find((city) => city.slug === citySlug)?.name ?? null

  const forYou = useForYou(identity, citySlug)
  const following = useFollowingUpdates(identity)
  const agenda = useCityAgenda(citySlug)

  // A pull asks again for what is on screen, and only that: a disabled query
  // would otherwise be fetched by its own refetch.
  const refetches: (() => Promise<unknown>)[] = []
  if (identity && citySlug) refetches.push(forYou.refetch)
  if (identity) refetches.push(following.refetch)
  if (citySlug) refetches.push(agenda.refetch)
  const refreshControl = usePullToRefresh(...refetches)

  return (
    <ContentFrameProvider frame={frame}>
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        {/* The band scrolls with the page; the status bar keeps its colour. */}
        <View style={{ backgroundColor: colors.chrome, height: insets.top }} />
        <ScrollView
          testID="news-scroll"
          style={styles.fill}
          contentContainerStyle={styles.page}
          refreshControl={refreshControl}
        >
          <ScreenHeader
            insetTop={false}
            title="Novidades"
            subtitle={
              cityName ? `O que há de novo em ${cityName}` : 'O que há de novo perto de você'
            }
          />
          <View style={styles.sections}>
            {visitor ? <NewsSignInPrompt /> : null}
            {identity && citySlug ? <NewsForYouSection query={forYou} cityName={cityName} /> : null}
            {identity ? <NewsFollowingSection query={following} /> : null}
            <NewsAgendaSection citySlug={citySlug} cityName={cityName} query={agenda} />
            <Help />
          </View>
        </ScrollView>
      </View>
    </ContentFrameProvider>
  )
}

function Help() {
  const frame = useScreenFrame()
  return (
    <View style={frame.padding}>
      <HelpLink topic="news" label="Como usar a aba Novidades" />
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingBottom: spacing.section },
  sections: { gap: spacing.section, paddingTop: spacing.lg },
})
