export const colors = {
  primary: "#007AFF",
  background: "#08090D",
  backgroundAlt: "#101114",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  blue: {
    50: "#EEF4FF",
    100: "#DCEBFF",
    300: "#93C5FD",
    500: "#007AFF",
    600: "#0A5CFF",
  },
  green: {
    50: "#EAFBF4",
    100: "#D2F5E3",
    500: "#16A34A",
    600: "#0E8A3D",
  },
  amber: {
    50: "#FFF8E6",
    100: "#FDE9BF",
    600: "#D97706",
    700: "#B45309",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    300: "#FCA5A5",
    600: "#DC2626",
    500: "#EF4444",
  },
  slate: {
    800: "#1E293B",
    900: "#0B1220",
  },
} as const;

export const gradients = {
  appBackground: ["#07080C", "#111215", "#17181C"],
  superAdmin: ["#2563EB", "#4F46E5"],
  businessOwner: ["#0F9F68", "#0A7D55"],
  user: ["#09090B", "#7F1D1D"],
  ctaBlue: ["#2563EB", "#0A5CFF"],
  ctaGreen: ["#16A34A", "#0E8A3D"],
  ctaAmber: ["#DC2626", "#991B1B"],
} as const;

export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extraBold: "Poppins_800ExtraBold",
} as const;

type GradientTuple = readonly [string, string, ...string[]];

export type AppRoleTheme = "superAdmin" | "businessOwner" | "user";

export function getRoleGradient(role: AppRoleTheme): GradientTuple {
  if (role === "superAdmin") return gradients.superAdmin;
  if (role === "businessOwner") return gradients.businessOwner;
  return gradients.user;
}

export const glass = {
  border: "rgba(255,255,255,0.36)",
  background: "rgba(255,255,255,0.18)",
  shadow: "#0F172A",
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
    gradient: gradients.superAdmin,
  },
  businessOwner: {
    accent: colors.green[500],
    soft: colors.green[100],
    gradient: gradients.businessOwner,
  },
  user: {
    accent: colors.red[600],
    soft: colors.red[100],
    gradient: gradients.user,
  },
} as const;
