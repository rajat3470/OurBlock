import { View, ScrollView } from "react-native";
import { useHomeScreen } from "@hooks/useHomeScreen";
import { HomeHero } from "@components/user/home/HomeHero";
import { CategoryTiles } from "@components/user/home/CategoryTiles";
import { HorizontalStoreRow } from "@components/user/home/HorizontalStoreRow";
import { PromoBanner } from "@components/user/home/PromoBanner";
import { DishList } from "@components/user/home/DishList";
import { StoreList } from "@components/user/home/StoreList";
import content from "@/content/home.json";

export default function UserHome() {
  const {
    user,
    cartCount,
    isLoading,
    safeBusinesses,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
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
    goToAddresses,
    goToProfile,
    goToCart,
    goToBusiness,
    goToDish,
  } = useHomeScreen();

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <HomeHero
        user={user}
        selectedSocietyName={selectedSocietyName}
        safeBusinessesCount={safeBusinesses.length}
        minimumOrder={minimumOrder}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        goToAddresses={goToAddresses}
        goToProfile={goToProfile}
        topRowH={topRowH}
        setTopRowH={setTopRowH}
        infoRowH={infoRowH}
        setInfoRowH={setInfoRowH}
        measured={measured}
        topRowHeight={topRowHeight}
        infoRowHeight={infoRowHeight}
        collapseOpacity={collapseOpacity}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          if (typeof scrollY.setValue === "function") {
            scrollY.setValue(offsetY);
          }
        }}
        scrollEventThrottle={8}
        bounces={false}
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
            <PromoBanner onPress={goToBusinesses} />
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
          cartCount={cartCount}
          goToBusiness={goToBusiness}
          goToCart={goToCart}
        />
      </ScrollView>
    </View>
  );
}
