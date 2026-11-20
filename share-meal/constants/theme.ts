// Brand colors for Share-Meal — light/white themed
export const Colors = {
  // Brand
  primary: '#B83E17',
  primaryLight: '#FFF1EC',
  primaryDark: '#923012',
  primarySoft: '#FFE5DB',
  accent: '#245DB3',
  accentLight: '#EEF3FF',
  secondary: '#087657',
  secondaryLight: '#EAFBF5',

  // Backgrounds
  background: '#FAF9F6',
  card: '#FFFFFF',
  surface: '#F1F4F9',
  input: '#F6F7FB',

  // Text
  text: '#171A22',
  textSecondary: '#5D6473',
  textMuted: '#687180',

  // Borders
  border: '#E4E8F0',
  divider: '#EEF1F6',

  // Semantic
  success: '#087657',
  successBg: '#ECFDF5',
  warning: '#925600',
  warningBg: '#FFFBEB',
  error: '#B42330',
  errorBg: '#FEF2F2',
  info: '#245DB3',
  infoBg: '#EFF6FF',

  // Donation status
  available: '#087657',
  availableBg: '#ECFDF5',
  pending: '#925600',
  pendingBg: '#FFFBEB',
  claimed: '#245DB3',
  claimedBg: '#EFF6FF',
  expired: '#B42330',
  expiredBg: '#FEF2F2',
  approved: '#087657',
  approvedBg: '#ECFDF5',
  rejected: '#B42330',
  rejectedBg: '#FEF2F2',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.45)',
  gradientWarm: ['#B83E17', '#923012'] as const,
  gradientSoft: ['#FFF3EE', '#FFFFFF'] as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  mdSm: 12,
  md: 16,
  lgMd: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 16,
  xxl: 20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 3,
    elevation: 0,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#171A22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 14,
    elevation: 0,
  },
};

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};

export const Motion = {
  fast: 160,
  normal: 260,
  slow: 380,
};
