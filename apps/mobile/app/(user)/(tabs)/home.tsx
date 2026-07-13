import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useHomeScreen } from "@hooks/useHomeScreen";
import { HomeHero } from "@components/user/home/HomeHero";
import { CategoryTiles } from "@components/user/home/CategoryTiles";
import { HorizontalStoreRow } from "@components/user/home/HorizontalStoreRow";
import { PromoBanner } from "@components/user/home/PromoBanner";
import { DishList } from "@components/user/home/DishList";
import { StoreList } from "@components/user/home/StoreList";

import { useAppSelector } from "../../../src/hooks/useRedux";
import { useUserApp } from "../../../src/hooks/useUserApp";
import { ORDER_FEES } from "../../../src/constants";
import { Business, Product } from "../../../src/types";
import { StoreListSkeleton } from "../../../src/components/Skeleton";
import { useSocketEvent } from "../../../src/hooks/useSocket";
import content from "@/content/home.json";

// const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

// function getBusinessStatus(business: Business): "open" | "paused" | "closed" {
//   if (business.status !== "active") return "closed";
//   let withinHours = true;
//   if (business.operatingHours) {
//     const now = new Date();
//     const dayKey = DAYS[now.getDay()];
//     const hours = business.operatingHours[dayKey];
//     if (!hours || hours.isClosed) {
//       withinHours = false;
//     } else {
//       const pad = (n: number) => n.toString().padStart(2, "0");
//       const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
//       withinHours = currentTime >= hours.open && currentTime < hours.close;
//     }
//   }
//   if (!withinHours) return "closed";
//   if (business.isTakingOrders === false) return "paused";
//   return "open";
// }

// function categoryEmoji(category: string) {
//   const key = category.toLowerCase();
//   if (key.includes("grocery")) return "🛒";
//   if (key.includes("pharmacy")) return "💊";
//   if (key.includes("restaurant")) return "🍽️";
//   if (key.includes("cafe")) return "☕";
//   if (key.includes("electronics")) return "📱";
//   return "🏬";
// }

// function getFirstImage(url?: string) {
//   return url && url.trim().length > 0 ? url : null;
// }

export default function UserHome() {
  // Destructure everything generated and handled by the home screen hook
  const {
    user,
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
    goToAddresses,
    goToProfile,
    goToCart,
    goToBusiness,
    goToDish,
  } = useHomeScreen();

  // Get user app methods to hook into global socket updates or manual re-initialization
  const { initializeHome } = useUserApp();

  // Refresh businesses on every focus so suspended/unsuspended changes reflect immediately
  useFocusEffect(
    useCallback(() => {
      initializeHome().catch(() => null);
    }, [initializeHome])
  );

  // Listen for business suspension events via socket (if socket server is configured)
  useSocketEvent<{ businessId: string; status: string; suspensionReason?: string }>(
    "business:suspended",
    (data) => {
      // Refresh the businesses list to hide the suspended business immediately
      initializeHome().catch(() => null);
      
      // Show alert to user if they were viewing this business
      Alert.alert(
        "Business Unavailable",
        data.suspensionReason || "This business is currently unavailable.",
        [{ text: "OK" }]
      );
    }
  );

  // Listen for business status changes (pause/resume)
  useSocketEvent<{ businessId: string; isTakingOrders?: boolean; status?: string }>(
    "business:status",
    () => {
      // Refresh to reflect status changes immediately
      initializeHome().catch(() => null);
    }
  );

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
        contentContainerStyle={{ paddingBottom: 24 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
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
          entrance={entrance}
          cartCount={cartCount}
          goToBusiness={goToBusiness}
          goToCart={goToCart}
        />
      </ScrollView>
    </View>
  );
}