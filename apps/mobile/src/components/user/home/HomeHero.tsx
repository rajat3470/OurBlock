import { memo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "@/types";
import content from "@/content/home.json";

interface HomeHeroProps {
  user: User | null;
  selectedSocietyName: string;
  safeBusinessesCount: number;
  minimumOrder: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  goToAddresses: () => void;
  goToProfile: () => void;
  topRowH: number;
  setTopRowH: (height: number) => void;
  infoRowH: number;
  setInfoRowH: (height: number) => void;
  measured: boolean;
  topRowHeight: Animated.AnimatedInterpolation<string | number>;
  infoRowHeight: Animated.AnimatedInterpolation<string | number>;
  collapseOpacity: Animated.AnimatedInterpolation<string | number>;
}

export const HomeHero = memo(function HomeHero({
  user,
  selectedSocietyName,
  safeBusinessesCount,
  minimumOrder,
  searchQuery,
  setSearchQuery,
  goToAddresses,
  goToProfile,
  topRowH,
  setTopRowH,
  infoRowH,
  setInfoRowH,
  measured,
  topRowHeight,
  infoRowHeight,
  collapseOpacity,
}: HomeHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#0E9F6E", "#059669", "#0891B2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroWrap, { paddingTop: insets.top + 14 }]}
    >
      <View style={styles.heroGlowCircle} />
      <Animated.View
        onLayout={(e) => {
          if (topRowH === 0) setTopRowH(e.nativeEvent.layout.height);
        }}
        style={measured ? { height: topRowHeight, opacity: collapseOpacity, overflow: "hidden" } : undefined}
      >
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroBrand}>{content.brand}</Text>
            <Text style={styles.heroDeliverLabel}>{content.deliverTo}</Text>
            <TouchableOpacity
              style={styles.heroLocationRow}
              activeOpacity={0.8}
              onPress={goToAddresses}
            >
              <Ionicons name="location" size={16} color="#FFFFFF" />
              <Text style={styles.heroLocation} numberOfLines={1}>
                {selectedSocietyName}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.profileChip} onPress={goToProfile}>
            <Text style={styles.profileChipText}>
              {(user?.firstName || content.defaultProfileInitial).charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={content.searchPlaceholder}
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <Animated.View
        onLayout={(e) => {
          if (infoRowH === 0) setInfoRowH(e.nativeEvent.layout.height);
        }}
        style={measured ? { height: infoRowHeight, opacity: collapseOpacity, overflow: "hidden" } : undefined}
      >
        <View style={styles.heroInfoRow}>
          <View style={styles.heroInfoPill}>
            <Ionicons name="storefront-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {safeBusinessesCount}
              {content.hero.storesSuffix}
            </Text>
          </View>
          <View style={styles.heroInfoPill}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {content.hero.secureCheckout}
            </Text>
          </View>
          <View style={styles.heroInfoPill}>
            <Ionicons name="wallet-outline" size={13} color="#FFFFFF" />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {content.hero.minPrefix}
              {minimumOrder}
            </Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  heroWrap: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 16,
    paddingBottom: 18,
    overflow: "hidden",
  },
  heroGlowCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -46,
    right: -30,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBrand: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.9)", letterSpacing: 0.2 },
  heroDeliverLabel: {
    marginTop: 8,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
  },
  heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  heroLocation: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", maxWidth: 240 },
  profileChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipText: { fontSize: 16, fontWeight: "800", color: "#0E9F6E" },
  searchWrap: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "600" },
  heroInfoRow: { marginTop: 12, flexDirection: "row", gap: 6 },
  heroInfoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heroInfoText: { fontSize: 10.5, color: "#FFFFFF", fontWeight: "700" },
});
