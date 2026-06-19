import React, { useEffect, useCallback } from 'react'
import { StyleSheet, View, Pressable } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { KinScreen } from '@/components/ui/KinScreen'
import { KinText } from '@/components/ui/KinText'
import { QrScanner } from '@/components/onboarding/QrScanner'
import { UuidInput } from '@/components/onboarding/UuidInput'
import { Colors } from '@/constants/colors'
import { useSetupFlow } from '@/hooks/useSetupFlow'
import type { RootStackParamList, SetupNavProp } from '@/navigation/types'

type SetupRoute = RouteProp<RootStackParamList, 'Setup'>

export function SetupScreen(): React.JSX.Element {
  const navigation = useNavigation<SetupNavProp>()
  const route = useRoute<SetupRoute>()
  const { method, prefillUuid } = route.params

  const { state, submitUuid, reset } = useSetupFlow()

  // Auto-submit when arriving with a prefilled UUID (from deep link or QR)
  useEffect(() => {
    if (prefillUuid && state.phase === 'idle') {
      submitUuid(prefillUuid)
    }
  }, [prefillUuid, state.phase, submitUuid])

  // Navigate to Protected on success
  useEffect(() => {
    if (state.phase === 'success') {
      navigation.reset({ index: 0, routes: [{ name: 'Protected' }] })
    }
  }, [state, navigation])

  const handleSwitchToManual = useCallback(() => {
    reset()
    navigation.setParams({ method: 'manual' })
  }, [navigation, reset])

  const isVerifying = state.phase === 'verifying'
  const errorMessage = state.phase === 'error' ? state.message : null

  return (
    <KinScreen scrollable={method === 'manual'}>
      {/* Header row */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <KinText variant="small" color={Colors.primary}>
            ← Retour
          </KinText>
        </Pressable>
        <KinText variant="label" align="center" style={styles.headerTitle}>
          {method === 'qr' ? 'Scanner le QR code' : 'Saisir l\'UUID'}
        </KinText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TabButton
          label="QR Code"
          active={method === 'qr'}
          onPress={() => { reset(); navigation.setParams({ method: 'qr' }) }}
        />
        <TabButton
          label="Manuel"
          active={method === 'manual'}
          onPress={handleSwitchToManual}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {method === 'qr' ? (
          <QrScanner
            onUuidScanned={submitUuid}
            onSwitchToManual={handleSwitchToManual}
          />
        ) : (
          <View style={styles.manualWrapper}>
            <KinText variant="h3" style={styles.manualTitle}>
              Identifiant d'appareil
            </KinText>
            <KinText variant="small" style={styles.manualDesc}>
              Retrouvez l'UUID dans l'espace parent → Appareils → Détail de l'appareil.
            </KinText>
            <UuidInput
              onSubmit={submitUuid}
              loading={isVerifying}
              error={errorMessage}
              initialValue={prefillUuid ?? ''}
            />
          </View>
        )}
      </View>
    </KinScreen>
  )
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={[tabStyles.tab, active && tabStyles.activeTab]}
    >
      <KinText
        variant="label"
        color={active ? Colors.primary : Colors.textMuted}
        style={active ? tabStyles.activeLabel : undefined}
      >
        {label}
      </KinText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
  },
  headerSpacer: {
    width: 48,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  manualWrapper: {
    gap: 10,
    paddingTop: 4,
  },
  manualTitle: {
    marginBottom: 2,
  },
  manualDesc: {
    marginBottom: 8,
    opacity: 0.8,
    lineHeight: 20,
  },
})

const tabStyles = StyleSheet.create({
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: Colors.primaryLight,
  },
  activeLabel: {
    fontWeight: '700',
  },
})
