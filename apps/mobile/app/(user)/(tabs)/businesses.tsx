import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BusinessListCard from "@components/BusinessListCard";
import { NativeAdCard } from "@components/NativeAdCard";
import { useBusinessesScreen } from "@hooks/useBusinessesScreen";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import content from "@/content/businesses.json";

export default function UserBusinesses() {
  const insets = useSafeAreaInsets();
  const {
    businesses,
    filteredBusinesses,
    productMatchesByBusiness,
    favoriteBusinessIds,
    toggleFavorite,
    searchQuery,
    setSearchQuery,
    clearSearch,
    openBusiness,
  } = useBusinessesScreen();
  const { isNativeFeedEnabled, values: ffValues } = useFeatureFlags();

  const searchActive = searchQuery.trim().length > 0;
  const nthCard = ffValues.adsDensityEveryNthCard || 4;

  type ListItem = { type: "business"; data: typeof filteredBusinesses[0] } | { type: "ad"; key: string };
  const listData: ListItem[] = [];
  filteredBusinesses.forEach((biz, i) => {
    listData.push({ type: "business", data: biz });
    if (isNativeFeedEnabled && (i + 1) % nthCard === 0) {
      listData.push({ type: "ad", key: `ad-${i}` });
    }
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#084C3D", "#084C3D"]} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{content.header.title}</Text>
        <Text style={styles.headerSub}>{businesses.length} {content.header.subtitleSuffix}</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={content.searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.type === "business" ? item.data.id : item.key}
        renderItem={({ item }) => {
          if (item.type === "ad") {
            return <NativeAdCard style={{ marginBottom: 12 }} />;
          }
          return (
            <BusinessListCard
              business={item.data}
              isFavorite={favoriteBusinessIds.includes(item.data.id)}
              matchedItems={productMatchesByBusiness.get(item.data.id) ?? []}
              searchActive={searchActive}
              onPress={openBusiness}
              onToggleFavorite={toggleFavorite}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="storefront-outline" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.emptyTitle}>{content.empty.title}</Text>
            <Text style={styles.emptySubtitle}>{content.empty.subtitle}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBF6EC" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#FBF6EC",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#084C3D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
