export const colors = {
  primary: "#0E9F6E",
  background: "#08090D",
  backgroundAlt: "#101114",
  authBackground: "#F8FAFC",
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
  emerald: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    500: "#10B981",
    600: "#0E9F6E",
    700: "#0A7D55",
  },
  teal: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    500: "#06B6D4",
    600: "#0891B2",
    700: "#0E7490",
  },
  amber: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
  },
} as const;

/**
 * Customer ("user") app brand palette — Emerald-Teal + Amber.
 * Emerald/teal is the primary brand color (headers, links, active states);
 * amber is the accent used for calls-to-action and promo highlights.
 */
export const brand = {
  primary: "#0E9F6E",
  primaryDark: "#0A7D55",
  teal: "#0891B2",
  accent: "#F59E0B",
  accentDark: "#D97706",
  soft: "#ECFDF5",
  softStrong: "#D1FAE5",
  accentSoft: "#FEF3C7",
  heroGradient: ["#0E9F6E", "#0891B2"] as const,
  ctaGradient: ["#F59E0B", "#D97706"] as const,
} as const;

export const gradients = {
  appBackground: ["#07080C", "#111215", "#17181C"],
  authBackground: ["#F8FAFC", "#F1F5F9", "#E2E8F0"],
  superAdmin: ["#2563EB", "#4F46E5"],
  businessOwner: ["#0F9F68", "#0A7D55"],
  user: ["#0E9F6E", "#0891B2"],
  deliveryPartner: ["#0891B2", "#0E7490"],
  ctaBlue: ["#2563EB", "#0A5CFF"],
  ctaGreen: ["#16A34A", "#0E8A3D"],
  ctaAmber: ["#F59E0B", "#D97706"],
  ctaTeal: ["#0891B2", "#0E7490"],
} as const;

export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extraBold: "Poppins_800ExtraBold",
} as const;

type GradientTuple = readonly [string, string, ...string[]];

export type AppRoleTheme = "superAdmin" | "businessOwner" | "user" | "deliveryPartner";

export function getRoleGradient(role: AppRoleTheme): GradientTuple {
  if (role === "superAdmin") return gradients.superAdmin;
  if (role === "businessOwner") return gradients.businessOwner;
  if (role === "deliveryPartner") return gradients.deliveryPartner;
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
    accent: colors.emerald[600],
    soft: colors.emerald[100],
    gradient: gradients.user,
  },
  deliveryPartner: {
    accent: colors.teal[600],
    soft: colors.teal[100],
    gradient: gradients.deliveryPartner,
  },
} as const;
