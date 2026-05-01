// Brand colors for Share-Meal — light/white themed
export const Colors = {
  // Brand
  primary: '#FF6B35',
  primaryLight: '#FFF0EB',
  primaryDark: '#E05528',

  secondary: '#00C896',
  secondaryLight: '#E6FBF5',

  // Backgrounds
  background: '#FAFAFA',
  card: '#FFFFFF',
  surface: '#F5F7FA',

  // Text
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Borders
  border: '#E5E7EB',
  divider: '#F3F4F6',

  // Semantic
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Donation status
  available: '#10B981',
  availableBg: '#ECFDF5',
  pending: '#F59E0B',
  pendingBg: '#FFFBEB',
  claimed: '#3B82F6',
  claimedBg: '#EFF6FF',
  expired: '#EF4444',
  expiredBg: '#FEF2F2',
  approved: '#10B981',
  approvedBg: '#ECFDF5',
  rejected: '#EF4444',
  rejectedBg: '#FEF2F2',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.45)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  h4: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
};
