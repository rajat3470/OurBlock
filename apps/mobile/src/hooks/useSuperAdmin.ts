import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  setLoading,
  setStats,
  setSocieties,
  addSociety,
  updateSocietyItem,
  removeSociety,
  setAllBusinesses,
  updateBusinessItem,
  setAllUsers,
  updateUserItem,
  setError,
} from "@store/slices/superAdminSlice";
import { superAdminService, CreateBusinessOwnerPayload } from "@services/superAdminService";
import { Society } from "@/types";

export const useSuperAdmin = () => {
  const dispatch = useAppDispatch();
  const {
    stats,
    societies,
    allBusinesses,
    pendingBusinesses,
    allUsers,
    isLoading,
    error,
  } = useAppSelector((state) => state.superAdmin);

  const loadStats = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const data = await superAdminService.getStats();
      dispatch(setStats(data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load stats";
      dispatch(setError(message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const loadSocieties = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await superAdminService.getAllSocieties();
      dispatch(setSocieties(response.data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load societies";
      dispatch(setError(message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const createSociety = useCallback(
    async (data: Partial<Society>) => {
      dispatch(setLoading(true));
      try {
        const society = await superAdminService.createSociety(data);
        dispatch(addSociety(society));
        return society;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create society";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const updateSociety = useCallback(
    async (id: string, data: Partial<Society>) => {
      dispatch(setLoading(true));
      try {
        const society = await superAdminService.updateSociety(id, data);
        dispatch(updateSocietyItem(society));
        return society;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update society";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const deleteSociety = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        await superAdminService.deleteSociety(id);
        dispatch(removeSociety(id));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete society";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadBusinesses = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await superAdminService.getAllBusinesses();
      dispatch(setAllBusinesses(response.data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load businesses";
      dispatch(setError(message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const verifyBusiness = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        const business = await superAdminService.verifyBusiness(id);
        dispatch(updateBusinessItem(business));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to verify business";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const rejectBusiness = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        const business = await superAdminService.rejectBusiness(id);
        dispatch(updateBusinessItem(business));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to reject business";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadUsers = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await superAdminService.getAllUsers();
      dispatch(setAllUsers(response.data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load users";
      dispatch(setError(message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const suspendUser = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        const user = await superAdminService.suspendUser(id);
        dispatch(updateUserItem(user));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to suspend user";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const activateUser = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        const user = await superAdminService.activateUser(id);
        dispatch(updateUserItem(user));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to activate user";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const createBusinessOwner = useCallback(
    async (data: CreateBusinessOwnerPayload) => {
      dispatch(setLoading(true));
      try {
        const result = await superAdminService.createBusinessOwner(data);
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create business owner";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const recentSocieties = [...societies]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return {
    stats,
    societies,
    recentSocieties,
    allBusinesses,
    pendingBusinesses,
    allUsers,
    isLoading,
    error,
    loadStats,
    loadSocieties,
    createSociety,
    updateSociety,
    deleteSociety,
    loadBusinesses,
    verifyBusiness,
    rejectBusiness,
    loadUsers,
    suspendUser,
    activateUser,
    createBusinessOwner,
  };
};
