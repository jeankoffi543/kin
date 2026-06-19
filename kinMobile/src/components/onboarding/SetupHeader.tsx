import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Colors } from '@/constants/colors'
import { KinText } from '@/components/ui/KinText'

type Props = {
  subtitle?: string
}

export function SetupHeader({ subtitle }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>
      </View>
      <KinText variant="h1" align="center" style={styles.title}>
        Kin
      </KinText>
      <KinText
        variant="small"
        align="center"
        style={styles.sub}
      >
        {subtitle ?? 'Contrôle parental · Configuration appareil'}
      </KinText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 36,
  },
  logoContainer: {
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colors.black,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  title: {
    marginBottom: 6,
  },
  sub: {
    opacity: 0.7,
  },
})
