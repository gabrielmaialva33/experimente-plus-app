import { ContentFavoritesSection } from '@/explorer/content-favorites-section'
import { useSavedContent } from '@/explorer/queries'
import { SavedListScreen } from '@/explorer/saved-list-screen'

export default function FavoritesScreen() {
  // The experiences and events below the places are asked again by the same pull.
  const content = useSavedContent()
  return (
    <SavedListScreen
      kind="favorites"
      footer={<ContentFavoritesSection />}
      refetchFooter={content.refetch}
    />
  )
}
