import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { userAppService } from "@services/userAppService";
import content from "@/content/addresses.json";

export type AddressType = "home" | "work" | "other";

export interface AddressFormValues {
  type: AddressType;
  name: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressFormValues = {
  type: "home",
  name: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  isDefault: false,
};

/**
 * Encapsulates all logic for the add/edit address screen: loading an existing
 * address, field updates, validation, saving, and navigation.
 */
export const useAddressForm = () => {
  const params = useLocalSearchParams();
  const addressId = params.id as string | undefined;
  const isEdit = !!addressId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddressFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(user)/(tabs)/addresses");
    }
  }, []);

  const fetchAddress = useCallback(async () => {
    if (!addressId) return;
    setLoading(true);
    try {
      const addresses = await userAppService.getAddresses();
      const address = addresses.find((a) => a.id === addressId);
      if (address) {
        setForm({
          type: address.type,
          name: address.name || "",
          street: address.street,
          landmark: address.landmark || "",
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
          isDefault: address.isDefault,
        });
      }
    } catch {
      Alert.alert(content.form.alerts.errorTitle, content.form.alerts.loadError);
      goBack();
    } finally {
      setLoading(false);
    }
  }, [addressId, goBack]);

  useEffect(() => {
    if (isEdit) {
      fetchAddress();
    } else {
      setForm(EMPTY_FORM);
      setErrors({});
    }
  }, [addressId, isEdit, fetchAddress]);

  const setField = useCallback(
    (key: keyof AddressFormValues, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
    },
    []
  );

  const validate = useCallback((): boolean => {
    const { validation } = content.form;
    const newErrors: Record<string, string> = {};

    if (!form.street.trim()) newErrors.street = validation.street;
    if (!form.city.trim()) newErrors.city = validation.city;
    if (!form.state.trim()) newErrors.state = validation.state;
    if (!form.pincode.trim()) newErrors.pincode = validation.pincodeRequired;
    else if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = validation.pincodeInvalid;
    if (!form.phone.trim()) newErrors.phone = validation.phoneRequired;
    else if (!/^[6-9]\d{9}$/.test(form.phone)) newErrors.phone = validation.phoneInvalid;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit && addressId) {
        await userAppService.updateAddress(addressId, form);
        Alert.alert(content.form.alerts.successTitle, content.form.alerts.editSuccess);
      } else {
        await userAppService.addAddress(form);
        Alert.alert(content.form.alerts.successTitle, content.form.alerts.addSuccess);
      }
      goBack();
    } catch (error: any) {
      Alert.alert(content.form.alerts.errorTitle, error?.message || content.form.alerts.loadError);
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, addressId, form, goBack]);

  return {
    isEdit,
    loading,
    saving,
    form,
    errors,
    setField,
    handleSave,
    goBack,
  };
};
