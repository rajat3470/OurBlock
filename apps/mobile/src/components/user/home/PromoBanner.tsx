import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import content from "@/content/home.json";

interface PromoBannerProps {
  onPress: () => void;
}

export function PromoBanner({ onPress }: PromoBannerProps) {
  return (
    <TouchableOpacity style={styles.promoWrap} activeOpacity={0.9} onPress={onPress}>
      <LinearGradient
        colors={["#FBBF24", "#F59E0B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoCard}
      >
        <View style={styles.promoTextCol}>
          <Text style={styles.promoTitle}>{content.promo.title}</Text>
          <Text style={styles.promoSub}>{content.promo.subtitle}</Text>
          <View style={styles.promoCodePill}>
            <Text style={styles.promoCodeText}>{content.promo.code}</Text>
          </View>
        </View>
        <Text style={styles.promoEmoji}>{content.promo.emoji}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  promoWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  promoCard: { flexDirection: "row", alignItems: "center", padding: 18 },
  promoTextCol: { flex: 1 },
  promoTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  promoSub: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    marginTop: 2,
  },
  promoCodePill: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoCodeText: { fontSize: 12, fontWeight: "800", color: "#B45309", letterSpacing: 0.3 },
  promoEmoji: { fontSize: 56, marginLeft: 8 },
});
