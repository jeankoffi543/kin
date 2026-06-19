import React from 'react'
import { Linking } from 'react-native'
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useDeviceStatus } from '@/hooks/useDeviceStatus'
import { WelcomeScreen } from '@/screens/Onboarding/WelcomeScreen'
import { SetupScreen } from '@/screens/Onboarding/SetupScreen'
import { ProtectedScreen } from '@/screens/Protected/ProtectedScreen'
import { extractUuidFromUrl } from '@/lib/deeplink'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['kin://', 'kin-setup://'],
  config: {
    screens: {
      Setup: {
        path: 'setup',
        parse: {
          method: () => 'manual' as const,
          prefillUuid: (uuid: string) => uuid,
        },
      },
    },
  },
  getStateFromPath: (path) => {
    const uuid = extractUuidFromUrl(path)
    if (uuid) {
      return {
        routes: [
          { name: 'Welcome' as const },
          { name: 'Setup' as const, params: { method: 'manual' as const, prefillUuid: uuid } },
        ],
        index: 1,
      }
    }
    return undefined
  },
}

export function RootNavigator(): React.JSX.Element {
  const { isRegistered } = useDeviceStatus()

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
        initialRouteName={isRegistered ? 'Protected' : 'Welcome'}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Setup" component={SetupScreen} />
        <Stack.Screen name="Protected" component={ProtectedScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
