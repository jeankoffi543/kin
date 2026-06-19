import React, { useEffect, useState } from 'react'
import { StatusBar, View, StyleSheet, Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { RootNavigator } from './src/navigation/RootNavigator'
import { runMigrations } from './src/db/migrations'
import { configureBackgroundSync } from './src/services/BackgroundSync'
import { FcmService } from './src/services/FcmService'
import { CommandService } from './src/services/CommandService'
import { RestrictionEngine } from './src/services/RestrictionEngine'
import { DeviceHeartbeat } from './src/services/DeviceHeartbeat'
import { CollectorEngine } from './src/services/CollectorEngine'
import { SyncEngine } from './src/services/SyncEngine'
import { DeviceStorage } from './src/lib/storage'
import { Colors } from './src/constants/colors'

type AppBootState = 'booting' | 'ready' | 'error'

async function bootSequence(): Promise<void> {
  await runMigrations()
  DeviceStorage.applyCursorResetV2()
  DeviceStorage.applyCursorResetV3()
  DeviceStorage.applyCursorResetV4()
  DeviceStorage.applyCursorResetV5()
  DeviceStorage.applyCursorResetV6()
  await configureBackgroundSync()

  // FCM init in background — retries until Google Play Services is ready
  FcmService.initialize().catch((err) => {
    console.warn('[Boot] FCM init failed:', err)
  })

  if (DeviceStorage.isRegistered()) {
    await DeviceHeartbeat.send()
    CommandService.startPolling()
    RestrictionEngine.startEventListeners()
    RestrictionEngine.pullAndApply().catch(() => undefined)

    CollectorEngine.start()
      .then(() => SyncEngine.sync())
      .catch((err) => console.warn('[Boot] Collect/sync failed:', err))
  }
}

function App(): React.JSX.Element {
  const [bootState, setBootState] = useState<AppBootState>('booting')
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    bootSequence()
      .then(() => setBootState('ready'))
      .catch((err: Error) => {
        console.error('[Boot] Fatal error:', err)
        setBootError(err.message)
        setBootState('error')
      })
  }, [])

  if (bootState === 'booting') {
    return (
      <View style={splash.container}>
        <StatusBar backgroundColor={Colors.background} barStyle="light-content" />
        <View style={splash.logo}>
          <Text style={splash.logoText}>K</Text>
        </View>
      </View>
    )
  }

  if (bootState === 'error') {
    return (
      <View style={[splash.container, { paddingHorizontal: 32 }]}>
        <StatusBar backgroundColor={Colors.background} barStyle="light-content" />
        <Text style={{ color: Colors.error, textAlign: 'center', fontSize: 13 }}>
          Erreur d'initialisation : {bootError}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={Colors.background} barStyle="light-content" />
      <RootNavigator />
    </SafeAreaProvider>
  )
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.black,
    fontSize: 28,
    fontWeight: '900',
  },
})

export default App
