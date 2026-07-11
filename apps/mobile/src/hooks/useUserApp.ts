import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  setLoading,
  setError,
  setSocieties,
  setSelectedSocietyId,
  setBusinesses,
  setBanners,
  setFeaturedProducts,
  setOrders,
  setStats,
  toggleFavoriteBusiness,
} from "@store/slices/userAppSlice";
import { clearCart } from "@store/slices/cartSlice";
import { userAppService } from "@services/userAppService";
import { CreateOrderPayload } from "@/types";

export const useUserApp = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.userApp);
  const authUserSocietyId = useAppSelector((store) => store.auth.user?.societyId);

  const loadSocieties = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await userAppService.getSocieties();
      dispatch(setSocieties(response.data));
      if (!state.selectedSocietyId && response.data.length > 0) {
        dispatch(setSelectedSocietyId(response.data[0].id));
      }
      return response.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load societies";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, state.selectedSocietyId]);

  const selectSociety = useCallback(
    async (societyId: string) => {
      dispatch(setSelectedSocietyId(societyId));

      dispatch(setLoading(true));
      try {
        const feed = await userAppService.getHomeFeed(societyId);

        let businesses = Array.isArray(feed.businesses) ? feed.businesses : [];
        let featuredProducts = Array.isArray(feed.featuredProducts)
          ? feed.featuredProducts
          : [];

        // Backward-compatible fallback for older backend response shapes.
        if (businesses.length === 0) {
          const [bizFallback, featuredFallback] = await Promise.all([
            userAppService.getBusinessesBySociety(societyId).catch(() => []),
            userAppService.getFeaturedProducts(societyId).catch(() => []),
          ]);
          businesses = Array.isArray(bizFallback) ? bizFallback : [];
          if (featuredProducts.length === 0) {
            featuredProducts = Array.isArray(featuredFallback) ? featuredFallback : [];
          }
        }

        dispatch(setBusinesses(businesses));
        dispatch(setBanners(Array.isArray(feed.banners) ? feed.banners : []));
        dispatch(setFeaturedProducts(featuredProducts));
        dispatch(setStats(feed.stats));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load society data";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadMyOrders = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      dispatch(setLoading(true));
    }
    try {
      const response = await userAppService.getMyOrders();
      const orders = Array.isArray(response.data) ? response.data : [];
      dispatch(setOrders(orders));
      return orders;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load orders";
      dispatch(setError(message));
      throw err;
    } finally {
      if (!silent) {
        dispatch(setLoading(false));
      }
    }
  }, [dispatch]);

  const toggleFavorite = useCallback(
    (businessId: string) => {
      dispatch(toggleFavoriteBusiness(businessId));
    },
    [dispatch]
  );

  const initializeHome = useCallback(async () => {
    const societies = await loadSocieties();
    const preferredSocietyId =
      authUserSocietyId ?? state.selectedSocietyId ?? societies?.[0]?.id;

    if (authUserSocietyId && authUserSocietyId !== state.selectedSocietyId) {
      dispatch(setSelectedSocietyId(authUserSocietyId));
    }

    if (preferredSocietyId) {
      await selectSociety(preferredSocietyId);
    }
  }, [authUserSocietyId, dispatch, loadSocieties, selectSociety, state.selectedSocietyId]);

  const placeOrder = useCallback(
    async (payload: CreateOrderPayload) => {
      dispatch(setLoading(true));
      try {
        const order = await userAppService.createOrder(payload);
        dispatch(clearCart());
        // Firestore listener will deliver the new order automatically
        return order;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to place order";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const order = await userAppService.cancelOrder(orderId);
        // Firestore listener will deliver the status update automatically
        return order;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to cancel order";
        dispatch(setError(message));
        throw err;
      }
    },
    [dispatch]
  );

  return {
    ...state,
    initializeHome,
    loadSocieties,
    selectSociety,
    loadMyOrders,
    toggleFavorite,
    placeOrder,
    cancelOrder,
  };
};
