import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = PressableProps & {
  label: string
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const VARIANT_STYLES: Record<Variant, { container: ViewStyle; text: { color: string } }> = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text: { color: Colors.black },
  },
  secondary: {
    container: {
      backgroundColor: Colors.surfaceElevated,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    text: { color: Colors.text },
  },
  ghost: {
    container: { backgroundColor: Colors.transparent },
    text: { color: Colors.textSecondary },
  },
  danger: {
    container: {
      backgroundColor: Colors.errorBg,
      borderWidth: 1,
      borderColor: Colors.errorBorder,
    },
    text: { color: Colors.error },
  },
}

export function KinButton({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  style,
  disabled,
  ...rest
}: Props): React.JSX.Element {
  const { container, text } = VARIANT_STYLES[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.black : Colors.primary}
        />
      ) : (
        <Text style={[styles.label, text]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
