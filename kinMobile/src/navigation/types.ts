import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

export type RootStackParamList = {
  Welcome: undefined
  Setup: { method: 'qr' | 'manual'; prefillUuid?: string }
  Protected: undefined
}

export type WelcomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>
export type SetupNavProp = NativeStackNavigationProp<RootStackParamList, 'Setup'>
export type ProtectedNavProp = NativeStackNavigationProp<RootStackParamList, 'Protected'>
