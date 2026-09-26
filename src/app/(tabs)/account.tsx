import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useCities } from '@/catalog/queries'
import { useSelectedCity } from '@/catalog/city-store'
import { Avatar } from '@/components/avatar'
import { ListGroup, ListRow } from '@/components/list-row'
import { ScreenHeader } from '@/components/screen-header'
import { useSession } from '@/session/context'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

// The band below reserves the status bar, so the tab's native header steps aside.
const HEADER_OPTIONS = { headerShown: false }

/**
 * The account hub (audit A23): who is signed in, then the person's own things,
 * preferences and the account itself, each one row that opens its screen.
 * Editing the profile has a screen of its own, so a hub is not a form.
 */
export default function AccountScreen() {
  const colors = useColors()
  const router = useRouter()
  const { context, capabilities, signOut } = useSession()
  const user = context?.user
  const name = user?.full_name?.trim() || user?.username || 'Sua conta'

  const citySlug = useSelectedCity()
  const cities = useCities()
  const city = cities.data?.find((candidate) => candidate.slug === citySlug)

  // The operation is a partner's working context; a consumer has nothing to do
  // with it and would only read an unexplained name (audit A54).
  const operation = capabilities?.partner?.enabled === true ? context?.active_operation : null

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <Tabs.Screen options={HEADER_OPTIONS} />
      <ScrollView contentContainerStyle={styles.page}>
        <ScreenHeader>
          <View style={styles.identity}>
            <Avatar name={user?.full_name || user?.username} tone="chrome" />
            <View style={styles.who}>
              <Text accessibilityRole="header" numberOfLines={2} style={[styles.name, { color: colors.chromeForeground }]}>
                {name}
              </Text>
              {user?.email ? (
                <Text numberOfLines={1} style={[styles.email, { color: colors.chromeMuted }]}>
                  {user.email}
                </Text>
              ) : null}
              {operation ? (
                <Text numberOfLines={1} style={[styles.email, { color: colors.chromeMuted }]}>
                  Operação ativa: {operation.name}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            onPress={() => router.push('/conta/perfil')}
            style={({ pressed }) => [
              styles.edit,
              { backgroundColor: colors.chromeRaised, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Ionicons name="create-outline" size={18} color={colors.chromeForeground} />
            <Text style={[styles.editLabel, { color: colors.chromeForeground }]}>Editar perfil</Text>
          </Pressable>
        </ScreenHeader>

        <View style={styles.groups}>
          {/* Anexo I item 10 — the person's own relationship with the catalogue. */}
          <ListGroup title="Minhas coisas">
            <ListRow icon="heart-outline" label="Favoritos" onPress={() => router.push('/conta/favoritos')} />
            <ListRow icon="notifications-outline" label="Seguindo" onPress={() => router.push('/conta/seguindo')} />
            <ListRow icon="map-outline" label="Roteiros" onPress={() => router.push('/roteiros')} />
            <ListRow icon="star-outline" label="Avaliações" onPress={() => router.push('/conta/avaliacoes')} />
          </ListGroup>

          <ListGroup title="Preferências">
            <ListRow icon="sparkles-outline" label="Interesses" onPress={() => router.push('/conta/interesses')} />
            <ListRow
              icon="location-outline"
              label="Cidade"
              value={citySlug ? city?.name : 'Nenhuma escolhida'}
              onPress={() => router.push('/conta/cidade')}
            />
          </ListGroup>

          <ListGroup title="Conta">
            <ListRow icon="log-out-outline" label="Sair" chevron={false} onPress={signOut} />
            <ListRow
              icon="trash-outline"
              label="Excluir conta"
              tone="destructive"
              onPress={() => router.push('/conta/excluir')}
            />
          </ListGroup>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  who: { flex: 1, gap: 2 },
  name: { ...typography.title, fontSize: 24, lineHeight: 28 },
  email: typography.body,
  edit: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: minTouch,
    paddingHorizontal: spacing.gutter,
  },
  editLabel: { ...typography.label, ...textWeight('700') },
  groups: { gap: spacing.section, paddingHorizontal: spacing.gutter, paddingTop: spacing.xl },
})
