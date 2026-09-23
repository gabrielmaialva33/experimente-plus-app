import { ContentFavoritesSection } from '@/explorer/content-favorites-section'
import { SavedListScreen } from '@/explorer/saved-list-screen'

export default function FavoritesScreen() {
  return <SavedListScreen kind="favorites" header={<ContentFavoritesSection />} />
}
