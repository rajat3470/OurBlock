import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { HomeBanner } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN_H = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;

interface PromoBannerProps {
  banners: HomeBanner[];
}

function BannerCard({ banner }: { banner: HomeBanner }) {
  const accentStart = banner.theme?.accentStart ?? "#F6B853";
  const accentEnd = banner.theme?.accentEnd ?? "#E0A030";
  const textColor = banner.theme?.textColor ?? "#FFFFFF";

  const handlePress = () => {
    if (banner.ctaRoute) {
      try {
        router.push(banner.ctaRoute as any);
      } catch {
        router.push("/(user)/(tabs)/businesses");
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.cardWrap}
      activeOpacity={0.9}
      onPress={handlePress}
      disabled={!banner.ctaRoute}
    >
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[accentStart, accentEnd] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardImage}
        />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.65)"]}
        style={styles.overlay}
      >
        {banner.tagText ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{banner.tagText}</Text>
          </View>
        ) : null}
        <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {banner.title}
        </Text>
        {banner.subtitle ? (
          <Text style={[styles.subtitle, { color: textColor }]} numberOfLines={2}>
            {banner.subtitle}
          </Text>
        ) : null}
        {banner.ctaText ? (
          <View style={styles.ctaPill}>
            <Text style={styles.ctaText}>{banner.ctaText}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function PromoBanner({ banners }: PromoBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item }: { item: HomeBanner }) => <BannerCard banner={item} />,
    []
  );

  if (banners.length === 0) return null;

  if (banners.length === 1) {
    return (
      <View style={[styles.container, { paddingHorizontal: CARD_MARGIN_H }]}>
        <BannerCard banner={banners[0]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={banners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: CARD_MARGIN_H }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  cardWrap: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 16,
  },
  tagPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
    opacity: 0.9,
  },
  ctaPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B2E22",
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#084C3D",
    borderRadius: 4,
  },
});
