import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { societyService, AreaInfo } from "../../src/services/societyService";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { Society } from "../../src/types/index";
import { colors, fonts, brand } from "../../src/constants/theme";
import MmScreen from "../../src/components/ui/MmScreen";
import MmButton from "../../src/components/ui/MmButton";

type Step = "area" | "society";

const NO_SHOPS_LINES = [
  "Looks like your mohalla is playing hide & seek with shops! 🙈",
  "No shops have joined your society yet — but hey, every great marketplace starts with zero.",
  "Share mohallaMitr with your favourite local dukaan wala and they'll be here before you can say 'samosa'! 🥟",
];

export default function UserSocietySelectScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const toast = useToast();

  const [step, setStep] = useState<Step>("area");
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [societies, setSocieties] = useState<(Society & { activeBusinesses?: number })[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState<AreaInfo | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selectedSociety, setSelectedSociety] = useState<(Society & { activeBusinesses?: number }) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await societyService.getAreas();
        setAreas(res.data);
      } catch {
        toast.show("Failed to load areas", { type: "danger" });
      } finally {
        setLoadingAreas(false);
      }
    })();
  }, [toast]);

  const handleAreaSelect = useCallback(async (area: AreaInfo) => {
    setSelectedArea(area);
    setStep("society");
    setSearch("");
    setSelectedId("");
    setSelectedSociety(null);
    setLoadingSocieties(true);
    try {
      const res = await societyService.getSocieties(1, 100, area.city);
      setSocieties(res.data);
    } catch {
      toast.show("Failed to load societies", { type: "danger" });
    } finally {
      setLoadingSocieties(false);
    }
  }, [toast]);

  const handleBack = useCallback(() => {
    setStep("area");
    setSearch("");
    setSelectedId("");
    setSelectedSociety(null);
  }, []);

  const filteredAreas = useMemo(
    () =>
      areas.filter(
        (a) =>
          a.city.toLowerCase().includes(search.toLowerCase()) ||
          a.state.toLowerCase().includes(search.toLowerCase())
      ),
    [areas, search]
  );

  const filteredSocieties = useMemo(
    () =>
      societies.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase())
      ),
    [societies, search]
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

  const hasNoShops = selectedSociety && (selectedSociety.activeBusinesses ?? 0) === 0;

  return (
    <MmScreen showBack={step === "society"} onBack={step === "society" ? handleBack : undefined}>
      {step === "area" ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Where do you{"\n"}live?</Text>
            <Text style={styles.subtitle}>
              Select your area so we can show you nearby shops and services.
            </Text>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or state..."
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {loadingAreas ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={brand.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredAreas}
              keyExtractor={(item) => `${item.city}-${item.state}`}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedArea?.city === item.city;
                return (
                  <TouchableOpacity
                    style={[styles.areaItem, isSelected && styles.areaItemSelected]}
                    activeOpacity={0.8}
                    onPress={() => handleAreaSelect(item)}
                  >
                    <View style={[styles.areaIcon, isSelected && styles.areaIconSelected]}>
                      <Ionicons
                        name="location"
                        size={20}
                        color={isSelected ? "#FFF" : brand.primary}
                      />
                    </View>
                    <View style={styles.areaInfo}>
                      <Text style={[styles.areaName, isSelected && styles.areaNameSelected]}>
                        {item.city}
                      </Text>
                      <Text style={styles.areaMeta}>
                        {item.state} · {item.societyCount} {item.societyCount === 1 ? "society" : "societies"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Ionicons name="location-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No areas found</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different search term
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.stepBadge}>
              <Ionicons name="location" size={14} color={brand.primary} />
              <Text style={styles.stepBadgeText}>{selectedArea?.city}, {selectedArea?.state}</Text>
            </View>
            <Text style={styles.title}>Select your{"\n"}society</Text>
            <Text style={styles.subtitle}>
              Pick your housing society to see shops in your neighbourhood.
            </Text>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search society..."
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {loadingSocieties ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={brand.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredSocieties}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                const shopCount = (item as any).activeBusinesses ?? 0;
                return (
                  <TouchableOpacity
                    style={[styles.societyItem, isSelected && styles.societyItemSelected]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedId(item.id);
                      setSelectedSociety(item);
                    }}
                  >
                    <View style={[styles.societyIcon, isSelected && styles.societyIconSelected]}>
                      <Text style={styles.societyIconText}>🏘️</Text>
                    </View>
                    <View style={styles.societyInfo}>
                      <Text style={[styles.societyName, isSelected && styles.societyNameSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.societyMeta}>
                        {item.address} · {item.pincode}
                      </Text>
                      <View style={styles.shopBadge}>
                        <Ionicons
                          name={shopCount > 0 ? "storefront" : "storefront-outline"}
                          size={12}
                          color={shopCount > 0 ? "#059669" : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.shopBadgeText,
                            shopCount > 0 ? styles.shopBadgeActive : styles.shopBadgeEmpty,
                          ]}
                        >
                          {shopCount > 0
                            ? `${shopCount} active ${shopCount === 1 ? "shop" : "shops"}`
                            : "No shops yet"}
                        </Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.societyIconText}>🏘️</Text>
                  <Text style={styles.emptyText}>No societies found</Text>
                </View>
              }
            />
          )}

          <View style={styles.footer}>
            {hasNoShops ? (
              <View style={styles.noShopsCard}>
                <Text style={styles.noShopsEmoji}>🏪</Text>
                {NO_SHOPS_LINES.map((line, i) => (
                  <Text
                    key={i}
                    style={i === 0 ? styles.noShopsTitle : styles.noShopsBody}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
            {selectedSociety ? (
              <Text style={styles.selectedLabel}>{selectedSociety.name}</Text>
            ) : null}
            <MmButton
              label={hasNoShops ? "Continue anyway" : "Continue"}
              onPress={handleContinue}
              loading={saving}
              disabled={!selectedId || saving}
            />
          </View>
        </>
      )}
    </MmScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
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
    maxWidth: 300,
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: brand.soft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  stepBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: brand.primary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Area cards
  areaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  areaItemSelected: {
    borderColor: brand.primary,
    backgroundColor: brand.soft,
  },
  areaIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: brand.soft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  areaIconSelected: {
    backgroundColor: brand.primary,
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  areaNameSelected: {
    color: brand.primaryDark,
  },
  areaMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Society cards
  societyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  societyItemSelected: {
    borderColor: brand.accentDark,
    backgroundColor: brand.accentSoft,
  },
  societyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  societyIconSelected: {
    backgroundColor: brand.accentSoft,
  },
  societyIconText: {
    fontSize: 20,
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
    marginBottom: 4,
  },
  shopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shopBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  shopBadgeActive: {
    color: "#059669",
  },
  shopBadgeEmpty: {
    color: colors.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: brand.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
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

  // No shops card
  noShopsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 6,
  },
  noShopsEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  noShopsTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: "#92400E",
    textAlign: "center",
    lineHeight: 22,
  },
  noShopsBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "#A16207",
    textAlign: "center",
    lineHeight: 19,
  },
});
