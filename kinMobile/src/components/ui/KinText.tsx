import React from 'react'
import { Text, StyleSheet, type TextProps, type TextStyle, type StyleProp } from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label'

type Props = TextProps & {
  variant?: Variant
  color?: string
  align?: TextStyle['textAlign']
  weight?: TextStyle['fontWeight']
  style?: StyleProp<TextStyle>
}

const VARIANT_STYLES: Record<Variant, TextStyle> = {
  h1: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600', color: Colors.text },
  body: { fontSize: 14, fontWeight: '400', color: Colors.text, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, lineHeight: 20 },
  caption: { fontSize: 11, fontWeight: '500', color: Colors.textMuted, letterSpacing: 0.3 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.2 },
}

export function KinText({
  variant = 'body',
  color,
  align,
  weight,
  style,
  ...rest
}: Props): React.JSX.Element {
  return (
    <Text
      {...rest}
      style={[
        VARIANT_STYLES[variant],
        color ? { color } : undefined,
        align ? { textAlign: align } : undefined,
        weight ? { fontWeight: weight } : undefined,
        style,
      ]}
    />
  )
}
