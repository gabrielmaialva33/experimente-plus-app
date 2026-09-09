import { useRouter } from 'expo-router'
import { useEffect } from 'react'

import { useSession } from '@/session/context'
import SignInScreen from '@/session/sign-in-screen'

export default function PurchaseSignInScreen() {
  const router = useRouter()
  const { status } = useSession()
  useEffect(() => {
    if (status === 'authenticated') {
      if (router.canGoBack()) router.back()
      else router.replace('/wallet/edicoes')
    }
  }, [router, status])
  return <SignInScreen />
}
