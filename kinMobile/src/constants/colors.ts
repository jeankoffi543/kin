export const Colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  primaryLight: 'rgba(245, 158, 11, 0.12)',

  background: '#0b0d11',
  surface: '#161920',
  surfaceElevated: '#1e2330',
  surfacePressed: '#252c3d',

  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: 'rgba(245, 158, 11, 0.5)',

  text: '#e8eaf2',
  textSecondary: '#8892a8',
  textMuted: '#5b6278',

  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.25)',

  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.1)',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const

export type ColorKey = keyof typeof Colors
