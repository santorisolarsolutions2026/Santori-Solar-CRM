import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  background: '#f8fafc',      // Clean slate-50
  cardBackground: '#ffffff',  // Crisp solid white card
  cardBorder: '#e2e8f0',      // Soft slate-200 border
  
  // Accents & Actions
  primary: '#FF9800',         // Santori Amber / Orange
  primaryHover: '#f57c00',    // Darker Amber
  secondary: '#2563eb',       // Royal Blue
  accent: '#2563eb',          // Blue-600
  
  // Neutral Text
  textPrimary: '#0f172a',     // Slate-900 (Bold & crisp)
  textSecondary: '#475569',   // Slate-600
  textMuted: '#94a3b8',       // Slate-400
  
  // States
  success: '#10b981',         // Emerald-500
  danger: '#ef4444',          // Red-500
  warning: '#f59e0b',         // Amber-500
  info: '#0284c7',            // Sky-600
  
  // Shadow / Glows
  shadowColor: '#64748b',
  glowOpacity: 0.06,
};

export const SIZES = {
  width,
  height,
  padding: 16,
  borderRadius: 16,
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
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
