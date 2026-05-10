import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  setLoading,
  setError,
  setSocieties,
  setSelectedSocietyId,
  setBusinesses,
  setFeaturedProducts,
  setOrders,
  setStats,
  toggleFavoriteBusiness,
} from "@store/slices/userAppSlice";
import { userAppService } from "@services/userAppService";

export const useUserApp = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.userApp);

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

        dispatch(setBusinesses(feed.businesses));
        dispatch(setFeaturedProducts(feed.featuredProducts));
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

  const loadMyOrders = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await userAppService.getMyOrders();
      dispatch(setOrders(response.data));
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load orders";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
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
    const preferredSocietyId = state.selectedSocietyId ?? societies?.[0]?.id;

    if (preferredSocietyId) {
      await selectSociety(preferredSocietyId);
    }
  }, [loadSocieties, selectSociety, state.selectedSocietyId]);

  return {
    ...state,
    initializeHome,
    loadSocieties,
    selectSociety,
    loadMyOrders,
    toggleFavorite,
  };
};
