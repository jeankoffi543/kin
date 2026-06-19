import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { KinScreen } from '@/components/ui/KinScreen'
import { KinText } from '@/components/ui/KinText'
import { KinButton } from '@/components/ui/KinButton'
import { SetupHeader } from '@/components/onboarding/SetupHeader'
import { Colors } from '@/constants/colors'
import { useSetupFlow } from '@/hooks/useSetupFlow'
import type { WelcomeNavProp } from '@/navigation/types'

export function WelcomeScreen(): React.JSX.Element {
  const navigation = useNavigation<WelcomeNavProp>()
  const { deepLinkUuid } = useSetupFlow()

  // Si l'app a été ouverte via un deep link kin://, go directly to Setup
  useEffect(() => {
    if (deepLinkUuid) {
      navigation.navigate('Setup', { method: 'manual', prefillUuid: deepLinkUuid })
    }
  }, [deepLinkUuid, navigation])

  return (
    <KinScreen scrollable centered={false}>
      <View style={styles.top}>
        <SetupHeader subtitle="Bienvenue sur l'appareil de votre enfant" />

        <View style={styles.card}>
          <KinText variant="h3" align="center" style={styles.cardTitle}>
            Associer cet appareil
          </KinText>
          <KinText variant="small" align="center" style={styles.cardDesc}>
            Pour commencer, votre parent doit avoir créé cet appareil dans son espace Kin.
            Choisissez ensuite votre méthode d'association.
          </KinText>

          <View style={styles.stepList}>
            <Step number={1} text="Connectez-vous à l'espace parent Kin" />
            <Step number={2} text="Créez un nouvel appareil et obtenez son code" />
            <Step number={3} text="Scannez le QR code ou saisissez l'UUID" />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <KinButton
          label="Scanner le QR code"
          onPress={() => navigation.navigate('Setup', { method: 'qr' })}
        />
        <KinButton
          label="Saisir l'UUID manuellement"
          variant="secondary"
          onPress={() => navigation.navigate('Setup', { method: 'manual' })}
          style={styles.manualBtn}
        />
      </View>
    </KinScreen>
  )
}

function Step({ number, text }: { number: number; text: string }): React.JSX.Element {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.badge}>
        <KinText variant="label" color={Colors.black} style={stepStyles.num}>
          {String(number)}
        </KinText>
      </View>
      <KinText variant="small" style={stepStyles.text}>
        {text}
      </KinText>
    </View>
  )
}

const styles = StyleSheet.create({
  top: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    marginBottom: 2,
  },
  cardDesc: {
    opacity: 0.8,
    lineHeight: 20,
  },
  stepList: {
    gap: 10,
    marginTop: 4,
  },
  actions: {
    gap: 10,
    paddingTop: 20,
  },
  manualBtn: {},
})

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  num: {
    fontSize: 11,
    fontWeight: '800',
  },
  text: {
    flex: 1,
    lineHeight: 20,
  },
})
