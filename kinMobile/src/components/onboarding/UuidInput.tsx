import React, { useState, useCallback } from 'react'
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  type TextInputProps,
} from 'react-native'
import { Colors } from '@/constants/colors'
import { KinButton } from '@/components/ui/KinButton'
import { KinText } from '@/components/ui/KinText'
import { isValidUuid, normalizeUuid } from '@/lib/deeplink'

type Props = {
  onSubmit: (uuid: string) => void
  loading?: boolean
  error?: string | null
  initialValue?: string
}

// Auto-insère les tirets du format UUID : 8-4-4-4-12
function formatUuidInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-f]/gi, '').slice(0, 32)
  const parts = [
    cleaned.slice(0, 8),
    cleaned.slice(8, 12),
    cleaned.slice(12, 16),
    cleaned.slice(16, 20),
    cleaned.slice(20, 32),
  ].filter(Boolean)
  return parts.join('-')
}

export function UuidInput({ onSubmit, loading = false, error, initialValue = '' }: Props): React.JSX.Element {
  const [value, setValue] = useState<string>(() =>
    initialValue ? formatUuidInput(initialValue.replace(/-/g, '')) : '',
  )
  const [focused, setFocused] = useState<boolean>(false)

  const handleChange = useCallback((text: string) => {
    setValue(formatUuidInput(text.replace(/-/g, '')))
  }, [])

  const handleSubmit = useCallback(() => {
    const uuid = normalizeUuid(value)
    if (isValidUuid(uuid)) {
      onSubmit(uuid)
    }
  }, [value, onSubmit])

  const isValid = isValidUuid(value)

  return (
    <View style={styles.container}>
      <KinText variant="label" style={styles.label}>
        Identifiant d'appareil (UUID)
      </KinText>

      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        maxLength={36}
        selectionColor={Colors.primary}
      />

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KinText variant="caption" style={styles.hint}>
        Copiez l'UUID depuis l'espace parent du tableau de bord Kin
      </KinText>

      <KinButton
        label="Vérifier et associer"
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
        style={styles.button}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 13,
    color: Colors.text,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  inputFocused: {
    borderColor: Colors.borderFocus,
  },
  inputError: {
    borderColor: Colors.errorBorder,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '500',
  },
  hint: {
    marginTop: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
})
