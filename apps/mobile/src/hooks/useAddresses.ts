import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { userAppService } from "@services/userAppService";
import { dataCache } from "@services/dataCache";
import { Address } from "@/types";
import content from "@/content/addresses.json";

/**
 * Encapsulates all logic for the address list screen: fetching, refreshing,
 * setting a default, deleting, and navigation.
 */
export const useAddresses = () => {
  const toast = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAddresses = useCallback(async (skipCache = false) => {
    try {
      if (skipCache) dataCache.invalidate("addresses");
      const data = await dataCache.get(
        "addresses",
        2 * 60 * 1000,
        () => userAppService.getAddresses(),
      );
      setAddresses(data);
    } catch (error: any) {
      toast.show(error?.message || content.list.errors.load, { type: "danger" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddresses(true);
  }, [fetchAddresses]);

  const handleSetDefault = useCallback(
    async (addressId: string) => {
      try {
        await userAppService.setDefaultAddress(addressId);
        fetchAddresses(true);
      } catch (error: any) {
        toast.show(error?.message || content.list.errors.setDefault, { type: "danger" });
      }
    },
    [fetchAddresses, toast]
  );

  const handleDelete = useCallback(
    (addressId: string) => {
      Alert.alert(content.list.deleteConfirm.title, content.list.deleteConfirm.message, [
        { text: content.list.deleteConfirm.cancel, style: "cancel" },
        {
          text: content.list.deleteConfirm.confirm,
          style: "destructive",
          onPress: async () => {
            try {
              await userAppService.deleteAddress(addressId);
              fetchAddresses(true);
            } catch (error: any) {
              toast.show(error?.message || content.list.errors.delete, { type: "danger" });
            }
          },
        },
      ]);
    },
    [fetchAddresses, toast]
  );

  const goToAdd = useCallback(() => router.push("/(user)/add-address"), []);
  const goToEdit = useCallback(
    (addressId: string) => router.push(`/(user)/add-address?id=${addressId}`),
    []
  );
  const goBack = useCallback(() => router.push("/(user)/profile"), []);

  return {
    addresses,
    loading,
    refreshing,
    handleRefresh,
    handleSetDefault,
    handleDelete,
    goToAdd,
    goToEdit,
    goBack,
  };
};
