import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  setLoading,
  setError,
  setBusinessProfile,
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setOrders,
  updateOrder,
  setStats,
  setAnalytics,
  setSelectedOrderId,
  setSelectedProductId,
} from "@store/slices/businessOwnerSlice";
import { businessOwnerService } from "@services/businessOwnerService";
import { markPendingWrite, clearPendingWrite } from "@services/pendingWrites";
import { Business, Product, Order } from "@/types";
import { store } from "@store/index";

/** Extract a human-readable message from any thrown value (including AxiosError). */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    // AxiosError: the real message is in response.data.error or response.data.message
    const axiosErr = err as any;
    const apiMsg =
      axiosErr?.response?.data?.error ||
      axiosErr?.response?.data?.message;
    if (apiMsg && typeof apiMsg === "string") return apiMsg;
    if (axiosErr instanceof Error) return axiosErr.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function isActiveSession(userId: string | undefined): boolean {
  return Boolean(userId) && store.getState().auth.user?.id === userId;
}

export const useBusinessOwner = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.businessOwner);

  const loadBusinessProfile = useCallback(async () => {
    const requestUserId = store.getState().auth.user?.id;
    dispatch(setLoading(true));
    try {
      const business = await businessOwnerService.getMyBusiness();
      if (isActiveSession(requestUserId)) dispatch(setBusinessProfile(business));
    } catch (err: unknown) {
      if (isActiveSession(requestUserId)) {
        const message = extractErrorMessage(err, "Failed to load business profile");
        dispatch(setError(message));
      }
      throw err;
    } finally {
      if (isActiveSession(requestUserId)) dispatch(setLoading(false));
    }
  }, [dispatch]);

  const loadProducts = useCallback(async () => {
    const requestUserId = store.getState().auth.user?.id;
    dispatch(setLoading(true));
    try {
      const response = await businessOwnerService.getMyProducts();
      if (isActiveSession(requestUserId)) dispatch(setProducts(response.data));
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Failed to load products");
      if (isActiveSession(requestUserId)) dispatch(setError(message));
      throw new Error(message);
    } finally {
      if (isActiveSession(requestUserId)) dispatch(setLoading(false));
    }
  }, [dispatch]);

  const createProduct = useCallback(
    async (data: Partial<Product>) => {
      dispatch(setLoading(true));
      try {
        const product = await businessOwnerService.createProduct(data);
        dispatch(addProduct(product));
        return product;
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to create product");
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const editProduct = useCallback(
    async (id: string, data: Partial<Product>) => {
      dispatch(setLoading(true));
      try {
        const product = await businessOwnerService.updateProduct(id, data);
        dispatch(updateProduct(product));
        return product;
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to update product");
        dispatch(setError(message));
        throw new Error(message);
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const removeProductById = useCallback(
    async (id: string) => {
      dispatch(setLoading(true));
      try {
        await businessOwnerService.deleteProduct(id);
        dispatch(removeProduct(id));
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to delete product");
        dispatch(setError(message));
        throw new Error(message);
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const requestUserId = store.getState().auth.user?.id;
    const silent = options?.silent === true;
    if (!silent) {
      dispatch(setLoading(true));
    }
    try {
      const response = await businessOwnerService.getMyOrders();
      if (isActiveSession(requestUserId)) dispatch(setOrders(response.data));
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Failed to load orders");
      if (isActiveSession(requestUserId)) dispatch(setError(message));
      throw new Error(message);
    } finally {
      if (!silent && isActiveSession(requestUserId)) {
        dispatch(setLoading(false));
      }
    }
  }, [dispatch]);

  const changeOrderStatus = useCallback(
    async (
      orderId: string,
      status: Order["status"],
      options?: { deliveryPartnerId?: string }
    ) => {
      markPendingWrite(orderId);
      dispatch(setLoading(true));
      try {
        // Persist assignment first so the delivery-partner Firestore listener
        // sees the order immediately (even if the status endpoint is older).
        if (options?.deliveryPartnerId) {
          const assigned = await businessOwnerService.assignDeliveryPartner(
            orderId,
            options.deliveryPartnerId
          );
          dispatch(updateOrder(assigned));
        }
        const order = await businessOwnerService.updateOrderStatus(
          orderId,
          status,
          options
        );
        dispatch(updateOrder(order));
        return order;
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to update order status");
        dispatch(setError(message));
        throw err;
      } finally {
        clearPendingWrite(orderId);
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const rejectOrder = useCallback(
    async (orderId: string, reason: string) => {
      markPendingWrite(orderId);
      dispatch(setLoading(true));
      try {
        const order = await businessOwnerService.rejectOrder(orderId, reason);
        dispatch(updateOrder(order));
        return order;
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to reject order");
        dispatch(setError(message));
        throw err;
      } finally {
        clearPendingWrite(orderId);
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const assignDeliveryPartner = useCallback(
    async (orderId: string, partnerId: string | null) => {
      markPendingWrite(orderId);
      try {
        const order = await businessOwnerService.assignDeliveryPartner(orderId, partnerId);
        dispatch(updateOrder(order));
        return order;
      } catch (err: unknown) {
        const message = extractErrorMessage(err, "Failed to assign delivery partner");
        dispatch(setError(message));
        throw err;
      } finally {
        clearPendingWrite(orderId);
      }
    },
    [dispatch]
  );

  const loadStats = useCallback(async () => {
    const requestUserId = store.getState().auth.user?.id;
    dispatch(setLoading(true));
    try {
      const stats = await businessOwnerService.getMyStats();
      if (isActiveSession(requestUserId)) dispatch(setStats(stats));
    } catch (err: unknown) {
      if (isActiveSession(requestUserId)) {
        const message = extractErrorMessage(err, "Failed to load stats");
        dispatch(setError(message));
      }
      throw err;
    } finally {
      if (isActiveSession(requestUserId)) dispatch(setLoading(false));
    }
  }, [dispatch]);

  const loadAnalytics = useCallback(async () => {
    const requestUserId = store.getState().auth.user?.id;
    try {
      const data = await businessOwnerService.getAnalytics();
      if (isActiveSession(requestUserId)) dispatch(setAnalytics(data));
    } catch { /* non-blocking */ }
  }, [dispatch]);

  const toggleTakingOrders = useCallback(async (taking: boolean) => {
    const profile = state.businessProfile;
    if (profile) {
      markPendingWrite(profile.id);
      dispatch(setBusinessProfile({ ...profile, isTakingOrders: taking } as Business));
    }
    try {
      const result = await businessOwnerService.toggleTakingOrders(taking);
      if (profile) {
        dispatch(setBusinessProfile({ ...profile, isTakingOrders: result?.isTakingOrders ?? taking } as Business));
      }
    } catch (err: unknown) {
      if (profile) {
        dispatch(setBusinessProfile({ ...profile, isTakingOrders: !taking } as Business));
      }
      const message = extractErrorMessage(err, "Failed to update order availability");
      dispatch(setError(message));
      throw err;
    } finally {
      if (profile) clearPendingWrite(profile.id);
    }
  }, [dispatch, state.businessProfile]);

  const selectOrder = useCallback(
    (orderId: string | null) => {
      dispatch(setSelectedOrderId(orderId));
    },
    [dispatch]
  );

  const selectProduct = useCallback(
    (productId: string | null) => {
      dispatch(setSelectedProductId(productId));
    },
    [dispatch]
  );

  return {
    ...state,
    loadBusinessProfile,
    loadProducts,
    createProduct,
    editProduct,
    removeProductById,
    loadOrders,
    changeOrderStatus,
    rejectOrder,
    assignDeliveryPartner,
    loadStats,
    loadAnalytics,
    toggleTakingOrders,
    selectOrder,
    selectProduct,
  };
};
