import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  background: '#070a13',      // Slate-950 equivalent for mobile
  cardBackground: '#111625',  // Sleek dark navy card background
  cardBorder: '#1e293b',      // Slate-800 equivalent border
  
  // Accents
  primary: '#f59e0b',         // Amber-500
  primaryHover: '#d97706',    // Amber-600
  secondary: '#eab308',       // Yellow-500
  accent: '#3b82f6',          // Blue-500
  
  // Neutral Text
  textPrimary: '#f8fafc',     // Slate-50
  textSecondary: '#94a3b8',   // Slate-400
  textMuted: '#64748b',       // Slate-500
  
  // States
  success: '#10b981',         // Emerald-500
  danger: '#ef4444',          // Red-500
  warning: '#f59e0b',
  info: '#06b6d4',            // Cyan-500
  
  // Shadow / Glows
  shadowColor: '#f59e0b',
  glowOpacity: 0.15,
};

export const SIZES = {
  width,
  height,
  padding: 16,
  borderRadius: 12,
};

export const FONTS = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: COLORS.textPrimary },
  h2: { fontSize: 20, fontWeight: '600' as const, color: COLORS.textPrimary },
  h3: { fontSize: 16, fontWeight: '600' as const, color: COLORS.textPrimary },
  body: { fontSize: 14, color: COLORS.textSecondary },
  small: { fontSize: 12, color: COLORS.textMuted },
  bold: { fontWeight: '700' as const },
  semibold: { fontWeight: '600' as const },
};

export const GLOBAL_STYLES = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.padding,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowAmber: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#070a13',
    fontWeight: '700',
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
