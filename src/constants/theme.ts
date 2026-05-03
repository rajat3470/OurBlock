export const colors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  blue: {
    300: "#93C5FD",
    500: "#007AFF",
    100: "#EFF6FF",
  },
  green: {
    500: "#16A34A",
    100: "#ECFDF5",
  },
  amber: {
    600: "#D97706",
    100: "#FEF3C7",
  },
  red: {
    500: "#EF4444",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  subtitle: {
    fontSize: 13,
  },
  body: {
    fontSize: 14,
  },
  button: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
} as const;

export const roleTheme = {
  superAdmin: {
    accent: colors.blue[500],
    soft: colors.blue[100],
  },
  businessOwner: {
    accent: colors.green[500],
    soft: colors.green[100],
  },
  user: {
    accent: colors.amber[600],
    soft: colors.amber[100],
  },
} as const;
