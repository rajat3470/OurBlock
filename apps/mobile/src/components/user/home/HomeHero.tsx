import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "@/types";
import content from "@/content/home.json";
import { brand, colors, fonts } from "@/constants/theme";

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

export function HomeHero({
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
    <View style={[styles.heroWrap, { paddingTop: insets.top + 14 }]}>
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
              <Ionicons name="location" size={16} color={brand.primary} />
              <Text style={styles.heroLocation} numberOfLines={1}>
                {selectedSocietyName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={brand.primary} />
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
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={content.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
            <Ionicons name="storefront-outline" size={13} color={brand.primary} />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {safeBusinessesCount}
              {content.hero.storesSuffix}
            </Text>
          </View>
          <View style={styles.heroInfoPill}>
            <Ionicons name="shield-checkmark-outline" size={13} color={brand.primary} />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {content.hero.secureCheckout}
            </Text>
          </View>
          <View style={styles.heroInfoPill}>
            <Ionicons name="wallet-outline" size={13} color={brand.primary} />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {content.hero.minPrefix}
              {minimumOrder}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: brand.creamAlt,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroBrand: {
    fontSize: 12,
    fontFamily: fonts.uiBold,
    color: brand.muted,
    letterSpacing: 0.2,
  },
  heroDeliverLabel: {
    marginTop: 8,
    fontSize: 11.5,
    color: brand.muted,
    fontFamily: fonts.uiMedium,
  },
  heroLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  heroLocation: {
    fontSize: 19,
    fontFamily: fonts.display,
    color: colors.textPrimary,
    maxWidth: 240,
  },
  profileChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: brand.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileChipText: { fontSize: 16, fontFamily: fonts.uiBold, color: brand.primary },
  searchWrap: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, fontFamily: fonts.regular },
  heroInfoRow: { marginTop: 12, flexDirection: "row", gap: 6 },
  heroInfoPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heroInfoText: { fontSize: 10.5, color: brand.primary, fontFamily: fonts.uiBold },
});
