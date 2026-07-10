import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { useAuth } from "./useAuth";
import { societyService } from "@services/societyService";
import { userAppService } from "@services/userAppService";
import { Society } from "@/types";

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: RegisterForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  password: "",
  confirmPassword: "",
};

export interface RegisterErrors extends Partial<RegisterForm> {
  societyId?: string;
}

export function useUserRegistration() {
  const { register } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileImageDataUrl, setProfileImageDataUrl] = useState<string | null>(null);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [selectedSocietyName, setSelectedSocietyName] = useState("");
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);
  const [societySearch, setSocietySearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoadingSocieties(true);
      try {
        const res = await societyService.getSocieties(1, 100);
        setSocieties(res.data);
      } catch {
        // Non-fatal — user can still try submitting; server will validate
      } finally {
        setLoadingSocieties(false);
      }
    };
    fetch();
  }, []);

  const filteredSocieties = useMemo(
    () =>
      societies.filter(
        (s) =>
          s.name.toLowerCase().includes(societySearch.toLowerCase()) ||
          s.city.toLowerCase().includes(societySearch.toLowerCase())
      ),
    [societies, societySearch]
  );

  const setField = useCallback((key: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const e: RegisterErrors = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone))
      e.phone = "Enter a valid 10-digit mobile number";
    if (!form.addressLine.trim()) e.addressLine = "Address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "State is required";
    if (!form.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(form.pincode.trim()))
      e.pincode = "Enter a valid 6-digit pincode";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!selectedSocietyId) e.societyId = "Please select your society";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, selectedSocietyId]);

  const clearSocietyError = useCallback(() => {
    setErrors((prev) => ({ ...prev, societyId: undefined }));
  }, []);

  const selectSociety = useCallback(
    (society: Society) => {
      setSelectedSocietyId(society.id);
      setSelectedSocietyName(society.name);
      clearSocietyError();
      setShowSocietyPicker(false);
      setSocietySearch("");
    },
    [clearSocietyError]
  );

  const handleRegister = useCallback(async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await register(
        {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          societyId: selectedSocietyId,
        },
        "user"
      );

      try {
        await userAppService.addAddress({
          type: "home",
          name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          street: form.addressLine.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          phone: form.phone.trim(),
          isDefault: true,
        });
      } catch {
        toast.show(
          "Address save failed. You can add it from Profile > Manage Addresses.",
          { type: "danger" }
        );
      }

      if (profileImageUri && profileImageDataUrl) {
        try {
          await userAppService.updateProfile({ profileImageUrl: profileImageDataUrl });
        } catch {
          toast.show(
            "Profile photo upload failed. You can upload it later from Profile.",
            { type: "danger" }
          );
        }
      }

      router.replace({
        pathname: "/(user)/verify-phone",
        params: { fromRegistration: "1" },
      });
    } catch (err: any) {
      toast.show(
        err?.response?.data?.error ||
          err?.message ||
          "Registration failed. Please try again.",
        { type: "danger" }
      );
    } finally {
      setIsLoading(false);
    }
  }, [form, selectedSocietyId, profileImageUri, profileImageDataUrl, register, toast, validate]);

  const handlePickProfileImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.show("Please allow photo library access.", { type: "warning" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selected = result.assets[0];
        setProfileImageUri(selected.uri);
        if (selected.base64) {
          const mimeType = selected.mimeType || "image/jpeg";
          setProfileImageDataUrl(`data:${mimeType};base64,${selected.base64}`);
        }
      }
    } catch {
      toast.show("Could not open image picker.", { type: "danger" });
    }
  }, [toast]);

  return {
    form,
    errors,
    setField,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    isLoading,
    profileImageUri,
    handlePickProfileImage,
    societies,
    loadingSocieties,
    selectedSocietyId,
    selectedSocietyName,
    showSocietyPicker,
    setShowSocietyPicker,
    societySearch,
    setSocietySearch,
    filteredSocieties,
    selectSociety,
    handleRegister,
  };
}
