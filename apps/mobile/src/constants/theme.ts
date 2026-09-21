export const colors = {
  primary: "#084C3D",
  background: "#FFF8ED",
  backgroundAlt: "#FBF6EC",
  authBackground: "#FFF8ED",
  surface: "#FFFFFF",
  surfaceAlt: "#F8EEE0",
  textPrimary: "#1A1F1C",
  textSecondary: "#646464",
  textMuted: "#A0A0A0",
  border: "#E9E3D4",
  borderStrong: "#E9E3D4",
  forest: {
    900: "#0B2E22",
    800: "#084C3D",
    700: "#0C4A3A",
    600: "#376E62",
    100: "#E4F3EA",
  },
  gold: {
    700: "#E0A030",
    500: "#F6B853",
    100: "#F8EEE0",
  },
  blue: {
    50: "#EEF4FF",
    100: "#DCEBFF",
    300: "#93C5FD",
    500: "#0C4A3A",
    600: "#084C3D",
  },
  green: {
    50: "#E4F3EA",
    100: "#E4F3EA",
    500: "#3A8A5C",
    600: "#084C3D",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    300: "#FCA5A5",
    600: "#DC2626",
    500: "#EF4444",
  },
  slate: {
    800: "#1A1F1C",
    900: "#0B2E22",
  },
  emerald: {
    50: "#E4F3EA",
    100: "#E4F3EA",
    200: "#C5E0D2",
    500: "#3A8A5C",
    600: "#084C3D",
    700: "#0B2E22",
  },
  teal: {
    50: "#E4F3EA",
    100: "#C5E0D2",
    500: "#376E62",
    600: "#084C3D",
    700: "#0B2E22",
  },
  amber: {
    50: "#F8EEE0",
    100: "#F8EEE0",
    500: "#F6B853",
    600: "#E0A030",
    700: "#E0A030",
  },
} as const;

/**
 * Mohalla Mitr brand palette — Forest + Gold on cream.
 * Forest is used for immersive screens (splash, role select) and selected states.
 * Gold is the primary call-to-action.
 */
export const brand = {
  primary: "#084C3D",
  primaryDark: "#0B2E22",
  teal: "#376E62",
  accent: "#F6B853",
  accentDark: "#E0A030",
  soft: "#E4F3EA",
  softStrong: "#C5E0D2",
  accentSoft: "#F8EEE0",
  cream: "#FFF8ED",
  creamAlt: "#FBF6EC",
  progressTrack: "#F2EBE1",
  tabInactive: "#A3AD9F",
  muted: "#7B8580",
  heroGradient: ["#084C3D", "#0C4A3A"] as const,
  ctaGradient: ["#F6B853", "#E0A030"] as const,
} as const;

export const gradients = {
  appBackground: ["#FFF8ED", "#FBF6EC", "#F8EEE0"],
  authBackground: ["#FFF8ED", "#FFF8ED", "#FBF6EC"],
  superAdmin: ["#084C3D", "#0B2E22"],
  businessOwner: ["#084C3D", "#0B2E22"],
  user: ["#084C3D", "#0C4A3A"],
  deliveryPartner: ["#084C3D", "#376E62"],
  ctaBlue: ["#084C3D", "#0B2E22"],
  ctaGreen: ["#F6B853", "#E0A030"],
  ctaAmber: ["#F6B853", "#E0A030"],
  ctaTeal: ["#F6B853", "#E0A030"],
} as const;

export const fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  extraBold: "DMSans_700Bold",
  serif: "DMSerifText_400Regular",
  display: "Fraunces_600SemiBold",
  ui: "Inter_400Regular",
  uiMedium: "Inter_500Medium",
  uiSemiBold: "Inter_600SemiBold",
  uiBold: "Inter_700Bold",
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
  border: "rgba(11,46,34,0.12)",
  background: "rgba(255,255,255,0.86)",
  shadow: "#0B2E22",
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: "400" as const,
    fontFamily: fonts.serif,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: fonts.semiBold,
  },
  label: {
    fontSize: 12,
    fontWeight: "700" as const,
    fontFamily: fonts.bold,
  },
} as const;

export const roleTheme = {
  superAdmin: {
    accent: brand.primary,
    soft: brand.soft,
    gradient: gradients.superAdmin,
  },
  businessOwner: {
    accent: brand.primary,
    soft: brand.soft,
    gradient: gradients.businessOwner,
  },
  user: {
    accent: brand.primary,
    soft: brand.soft,
    gradient: gradients.user,
  },
  deliveryPartner: {
    accent: brand.primary,
    soft: brand.soft,
    gradient: gradients.deliveryPartner,
  },
} as const;
