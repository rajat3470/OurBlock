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
  setSelectedOrderId,
  setSelectedProductId,
} from "@store/slices/businessOwnerSlice";
import { businessOwnerService } from "@services/businessOwnerService";
import { Product, Order } from "@types/index";

export const useBusinessOwner = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.businessOwner);

  const loadBusinessProfile = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const business = await businessOwnerService.getMyBusiness();
      dispatch(setBusinessProfile(business));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load business profile";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const loadProducts = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await businessOwnerService.getMyProducts();
      dispatch(setProducts(response.data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load products";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
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
        const message =
          err instanceof Error ? err.message : "Failed to create product";
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
        const message =
          err instanceof Error ? err.message : "Failed to update product";
        dispatch(setError(message));
        throw err;
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
        const message =
          err instanceof Error ? err.message : "Failed to delete product";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadOrders = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await businessOwnerService.getMyOrders();
      dispatch(setOrders(response.data));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load orders";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const changeOrderStatus = useCallback(
    async (orderId: string, status: Order["status"]) => {
      dispatch(setLoading(true));
      try {
        const order = await businessOwnerService.updateOrderStatus(orderId, status);
        dispatch(updateOrder(order));
        return order;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update order status";
        dispatch(setError(message));
        throw err;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const loadStats = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const stats = await businessOwnerService.getMyStats();
      dispatch(setStats(stats));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load stats";
      dispatch(setError(message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

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
    loadStats,
    selectOrder,
    selectProduct,
  };
};
