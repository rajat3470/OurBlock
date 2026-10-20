import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "react-native-toast-notifications";
import { societyService } from "../../src/services/societyService";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { Society } from "../../src/types/index";
import { colors, fonts, brand } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmButton from "../../src/components/ui/MmButton";

export default function UserSocietySelectScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const toast = useToast();

  const [societies, setSocieties] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await societyService.getSocieties(1, 100);
        setSocieties(res.data);
      } catch {
        toast.show("Failed to load societies", { type: "danger" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const filtered = societies.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleContinue = useCallback(async () => {
    if (!selectedId) {
      toast.show("Please select your society", { type: "warning" });
      return;
    }

    setSaving(true);
    try {
      await userAppService.updateProfile({ societyId: selectedId } as any);
      if (user) {
        const updated = { ...user, societyId: selectedId };
        dispatch(setUser(updated));
        await authStateService.updateUser(updated);
      }
      router.replace("/(user)/home");
    } catch (error: any) {
      toast.show(error.message || "Failed to save society", { type: "danger" });
    } finally {
      setSaving(false);
    }
  }, [selectedId, user, dispatch, toast]);

  return (
    <MmScreen showBack>
      <View style={styles.header}>
        <Text style={styles.title}>Select your{"\n"}society</Text>
        <Text style={styles.subtitle}>
          This helps us show you shops and services in your neighbourhood.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or city..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <TouchableOpacity
                style={[styles.societyItem, isSelected && styles.societyItemSelected]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedId(item.id);
                  setSelectedName(item.name);
                }}
              >
                <View style={styles.societyIcon}>
                  <Text style={styles.societyIconText}>🏘️</Text>
                </View>
                <View style={styles.societyInfo}>
                  <Text
                    style={[
                      styles.societyName,
                      isSelected && styles.societyNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.societyMeta}>
                    {item.city}, {item.state} · {item.pincode}
                  </Text>
                </View>
                {isSelected ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No societies found</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        {selectedName ? (
          <Text style={styles.selectedLabel}>{selectedName}</Text>
        ) : null}
        <MmButton
          label="Continue"
          onPress={handleContinue}
          loading={saving}
          disabled={!selectedId || saving}
        />
      </View>
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    maxWidth: 289,
  },
  searchWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  societyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  societyItemSelected: {
    borderColor: brand.accentDark,
    backgroundColor: brand.accentSoft,
  },
  societyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  societyIconText: {
    fontSize: 18,
  },
  societyInfo: {
    flex: 1,
  },
  societyName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  societyNameSelected: {
    color: brand.primaryDark,
  },
  societyMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  check: {
    fontSize: 16,
    fontWeight: "700",
    color: brand.accentDark,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  selectedLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
