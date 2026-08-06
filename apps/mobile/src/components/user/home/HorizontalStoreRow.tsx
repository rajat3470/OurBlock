import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Business } from "@/types";
import { getBusinessStatus } from "@utils/businessStatus";
import { categoryEmoji, getFirstImage } from "@hooks/useHomeScreen";
import content from "@/content/home.json";

interface HorizontalStoreRowProps {
  title: string;
  list: Business[];
  onViewAll: () => void;
  onPressStore: (id: string) => void;
}

export function HorizontalStoreRow({
  title,
  list,
  onViewAll,
  onPressStore,
}: HorizontalStoreRowProps) {
  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>{content.sections.viewAll}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={styles.hRow}
      >
        {list.map((biz) => {
          const status = getBusinessStatus(biz);
          const img = getFirstImage(biz.bannerUrl ?? biz.imageUrl);
          return (
            <TouchableOpacity
              key={biz.id}
              style={styles.oaCard}
              activeOpacity={0.9}
              onPress={() => onPressStore(biz.id)}
            >
              <View style={styles.oaImageWrap}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.oaImage} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#D1FAE5", "#A7F3D0"]} style={styles.oaFallback}>
                    <Text style={styles.oaFallbackEmoji}>{categoryEmoji(biz.category)}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.oaBody}>
                <View style={styles.oaLogo}>
                  <Text style={styles.oaLogoEmoji}>{categoryEmoji(biz.category)}</Text>
                </View>
                <View style={styles.oaInfo}>
                  <Text style={styles.oaName} numberOfLines={1}>
                    {biz.name}
                  </Text>
                  <Text style={styles.oaCategory} numberOfLines={1}>
                    {biz.category}
                  </Text>
                </View>
                <View style={styles.oaRatingCol}>
                  <View style={styles.oaRatingPill}>
                    <Ionicons name="star" size={11} color="#0E9F6E" />
                    <Text style={styles.oaRatingText}>{Number(biz.rating || 0).toFixed(1)}</Text>
                  </View>
                  <View style={styles.oaStatusRow}>
                    <View
                      style={[
                        styles.oaStatusDot,
                        status === "open"
                          ? styles.dotOpen
                          : status === "paused"
                            ? styles.dotPaused
                            : styles.dotClosed,
                      ]}
                    />
                    <Text style={styles.oaStatusText}>
                      {status === "open"
                        ? content.status.open
                        : status === "paused"
                          ? content.status.paused
                          : content.status.closed}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 16, color: "#0F172A", fontWeight: "800" },
  viewAllText: { fontSize: 12, color: "#0E9F6E", fontWeight: "700" },
  hRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  oaCard: {
    width: 252,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  oaImageWrap: { width: "100%", height: 112, backgroundColor: "#F1F5F9" },
  oaImage: { width: "100%", height: "100%" },
  oaFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  oaFallbackEmoji: { fontSize: 40 },
  oaBody: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
  oaLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  oaLogoEmoji: { fontSize: 18 },
  oaInfo: { flex: 1 },
  oaName: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  oaCategory: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
    textTransform: "capitalize",
  },
  oaRatingCol: { alignItems: "flex-end", gap: 3 },
  oaRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  oaRatingText: { fontSize: 11.5, fontWeight: "800", color: "#0E9F6E" },
  oaStatusRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  oaStatusDot: { width: 7, height: 7, borderRadius: 4 },
  dotOpen: { backgroundColor: "#16A34A" },
  dotPaused: { backgroundColor: "#F59E0B" },
  dotClosed: { backgroundColor: "#9CA3AF" },
  oaStatusText: { fontSize: 10.5, fontWeight: "700", color: "#64748B" },
});
