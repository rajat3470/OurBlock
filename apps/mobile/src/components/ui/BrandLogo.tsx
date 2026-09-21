import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { fonts } from "../../constants/theme";
import { logoMarkXml } from "./logoMarkXml";

const INTRINSIC = { width: 185.46, height: 114 };

interface BrandLogoProps {
  /** compact matches the 97.61×60 mark on the role-select screen */
  size?: "default" | "compact";
}

export default function BrandLogo({ size = "default" }: BrandLogoProps) {
  const width = size === "compact" ? 97.61 : INTRINSIC.width;
  const height = size === "compact" ? 60 : INTRINSIC.height;
  return <SvgXml xml={logoMarkXml} width={width} height={height} />;
}

export function BrandWordmark({
  titleColor = "#F6B853",
  subtitleColor = "#FFFFFF",
}: {
  titleColor?: string;
  subtitleColor?: string;
}) {
  return (
    <View style={wordmarkStyles.wrap}>
      <Text style={[wordmarkStyles.title, { color: titleColor }]}>MOHALLA</Text>
      <Text style={[wordmarkStyles.subtitle, { color: subtitleColor }]}>MITR</Text>
    </View>
  );
}

const wordmarkStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    width: 187,
  },
  title: {
    fontSize: 33,
    letterSpacing: 3.6,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: fonts.bold,
  },
  subtitle: {
    fontSize: 28,
    letterSpacing: 8.45,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: fonts.regular,
    marginTop: -4,
  },
});
