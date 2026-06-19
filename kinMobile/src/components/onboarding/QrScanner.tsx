import React, { useState, useCallback } from 'react'
import { StyleSheet, View, NativeModules, Platform } from 'react-native'
import { Colors } from '@/constants/colors'
import { KinButton } from '@/components/ui/KinButton'
import { KinText } from '@/components/ui/KinText'
import { extractUuidFromUrl } from '@/lib/deeplink'

type Props = {
  onUuidScanned: (uuid: string) => void
  onSwitchToManual: () => void
}

interface QrScannerModuleInterface {
  scanQrCode(): Promise<string | null>
}

const QrScannerModule = NativeModules.QrScannerModule as QrScannerModuleInterface

export function QrScanner({ onUuidScanned, onSwitchToManual }: Props): React.JSX.Element {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const raw = await QrScannerModule.scanQrCode()
      if (raw) {
        const uuid = extractUuidFromUrl(raw)
        if (uuid) {
          onUuidScanned(uuid)
          return
        }
        setError("QR code invalide — aucun UUID trouvé")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du scan")
    } finally {
      setScanning(false)
    }
  }, [onUuidScanned])

  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <KinText variant="h1" align="center">📷</KinText>
      </View>

      <KinText variant="h3" align="center">
        Scanner le QR code
      </KinText>
      <KinText variant="small" align="center" color={Colors.textSecondary} style={styles.desc}>
        Scannez le QR code d'appairage visible dans le tableau de bord parent Kin.
      </KinText>

      {error && (
        <KinText variant="caption" align="center" color={Colors.error} style={styles.error}>
          {error}
        </KinText>
      )}

      <KinButton
        label={scanning ? "Scan en cours…" : "Ouvrir le scanner"}
        onPress={startScan}
        disabled={scanning}
        style={styles.scanButton}
      />

      <KinButton
        label="Saisir manuellement"
        variant="ghost"
        onPress={onSwitchToManual}
        style={styles.switchButton}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  desc: {
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  error: {
    paddingHorizontal: 16,
  },
  scanButton: {
    width: '100%',
  },
  switchButton: {
    width: '100%',
  },
})
