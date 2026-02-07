export const colors = {
  primary: '#0891b2',
  primaryDark: '#0e7490',
  primaryLight: '#06b6d4',
  primaryLighter: '#22d3ee',

  secondary: '#8b5cf6',
  secondaryDark: '#7c3aed',
  secondaryLight: '#a78bfa',

  accent: '#f43f5e',
  accentDark: '#e11d48',
  accentLight: '#fb7185',

  success: '#10b981',
  successDark: '#059669',
  successLight: '#34d399',

  warning: '#f59e0b',
  warningDark: '#d97706',
  warningLight: '#fbbf24',

  error: '#ef4444',
  errorDark: '#dc2626',
  errorLight: '#f87171',

  info: '#06b6d4',
  infoDark: '#0891b2',
  infoLight: '#22d3ee',

  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',

  white: '#ffffff',
  black: '#000000',

  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  text: '#0f172a',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  textInverse: '#ffffff',

  cardBackground: '#ffffff',
  cardBorder: '#e2e8f0',

  inputBackground: '#ffffff',
  inputBorder: '#cbd5e1',
  inputBorderFocus: '#0891b2',
  inputPlaceholder: '#94a3b8',

  disabled: '#e2e8f0',
  disabledText: '#94a3b8',

  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(15, 23, 42, 0.3)',
};

export const gradients = {
  primary: ['#0891b2', '#06b6d4'],
  secondary: ['#8b5cf6', '#a78bfa'],
  accent: ['#f43f5e', '#fb7185'],
  success: ['#10b981', '#34d399'],
  warm: ['#f59e0b', '#fb923c'],
  cool: ['#0891b2', '#8b5cf6'],
};

export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const opacity = {
  transparent: 0,
  5: 0.05,
  10: 0.1,
  20: 0.2,
  30: 0.3,
  40: 0.4,
  50: 0.5,
  60: 0.6,
  70: 0.7,
  80: 0.8,
  90: 0.9,
  full: 1,
};

export const withOpacity = (color: string, opacityValue: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
};
