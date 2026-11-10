import { View, ScrollView, Animated, RefreshControl, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useHomeScreen } from "@hooks/useHomeScreen";
import { useFeatureFlags } from "@hooks/useFeatureFlags";
import { HomeHero } from "@components/user/home/HomeHero";
import { CategoryTiles } from "@components/user/home/CategoryTiles";
import { HorizontalStoreRow } from "@components/user/home/HorizontalStoreRow";
import { PromoBanner } from "@components/user/home/PromoBanner";
import { DishList } from "@components/user/home/DishList";
import { StoreList } from "@components/user/home/StoreList";
import { brand, colors, fonts } from "@/constants/theme";
import content from "@/content/home.json";

export default function UserHome() {
  const {
    user,
    banners,
    cartCount,
    isLoading,
    safeBusinesses,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    entrance,
    scrollY,
    topRowH,
    setTopRowH,
    infoRowH,
    setInfoRowH,
    measured,
    topRowHeight,
    infoRowHeight,
    collapseOpacity,
    selectedSocietyName,
    categories,
    productMatchesByBusiness,
    filteredBusinesses,
    businessNameById,
    matchedDishes,
    orderAgainStores,
    favoriteStores,
    minimumOrder,
    goToBusinesses,
    goToChangeSociety,
    goToProfile,
    goToCart,
    goToBusiness,
    goToDish,
    refreshing,
    onRefresh,
  } = useHomeScreen();
  const { isNativeFeedEnabled, isHomeBannersEnabled, values: ffValues } = useFeatureFlags();

  if (!user?.societyId) {
    return <Redirect href="/(user)/change-society" />;
  }

  const hasNoShops = !isLoading && safeBusinesses.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#FBF6EC" }}>
      <HomeHero
        user={user}
        selectedSocietyName={selectedSocietyName}
        safeBusinessesCount={safeBusinesses.length}
        minimumOrder={minimumOrder}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        goToProfile={goToProfile}
        onChangeSociety={goToChangeSociety}
        topRowH={topRowH}
        setTopRowH={setTopRowH}
        infoRowH={infoRowH}
        setInfoRowH={setInfoRowH}
        measured={measured}
        topRowHeight={topRowHeight}
        infoRowHeight={infoRowHeight}
        collapseOpacity={collapseOpacity}
      />

      {hasNoShops ? (
        <View style={es.emptyWrap}>
          <View style={es.emptyCard}>
            <Text style={es.emptyIllustration}>{"🏪"}</Text>
            <Text style={es.emptyTitle}>
              {"Oops! It's a ghost town here 👻"}
            </Text>
            <Text style={es.emptyBody}>
              No shops have registered in your society yet. Be the hero of your
              mohalla — tell your favourite dukaan wala about mohallaMitr and
              they'll be here before you can say "samosa"! 🥟
            </Text>
            <TouchableOpacity
              style={es.changeBtn}
              activeOpacity={0.8}
              onPress={goToChangeSociety}
            >
              <Ionicons name="swap-horizontal" size={18} color="#FFF" />
              <Text style={es.changeBtnText}>Change Area / Society</Text>
            </TouchableOpacity>
            <Text style={es.emptyHint}>
              Shops will appear here once they register in your area.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#084C3D" />
          }
        >
          {searchQuery.trim().length === 0 ? (
            <>
              <CategoryTiles
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
              {orderAgainStores.length > 0 ? (
                <HorizontalStoreRow
                  title={content.sections.orderAgain}
                  list={orderAgainStores}
                  onViewAll={goToBusinesses}
                  onPressStore={goToBusiness}
                />
              ) : null}
              {isHomeBannersEnabled && banners.length > 0 ? (
                <PromoBanner banners={banners} />
              ) : null}
              {favoriteStores.length > 0 ? (
                <HorizontalStoreRow
                  title={content.sections.favorites}
                  list={favoriteStores}
                  onViewAll={goToBusinesses}
                  onPressStore={goToBusiness}
                />
              ) : null}
            </>
          ) : null}

          {searchQuery.trim().length > 0 && matchedDishes.length > 0 ? (
            <DishList
              dishes={matchedDishes}
              businessNameById={businessNameById}
              onPressDish={goToDish}
            />
          ) : null}

          <StoreList
            isLoading={isLoading}
            safeBusinesses={safeBusinesses}
            filteredBusinesses={filteredBusinesses}
            productMatchesByBusiness={productMatchesByBusiness}
            searchQuery={searchQuery}
            entrance={entrance}
            cartCount={cartCount}
            goToBusiness={goToBusiness}
            goToCart={goToCart}
            showNativeAds={isNativeFeedEnabled}
            adEveryNthCard={ffValues.adsDensityEveryNthCard || 4}
          />
        </ScrollView>
      )}
    </View>
  );
}

const es = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0B2E22",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIllustration: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  changeBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#FFF",
    fontWeight: "700",
  },
  emptyHint: {
    marginTop: 16,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
});
