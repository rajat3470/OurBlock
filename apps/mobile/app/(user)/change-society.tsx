import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";
import { Ionicons } from "@expo/vector-icons";
import { societyService, AreaInfo } from "../../src/services/societyService";
import { userAppService } from "../../src/services/userAppService";
import { authStateService } from "../../src/services/authStateService";
import { useAppDispatch, useAppSelector } from "../../src/hooks/useRedux";
import { setUser } from "../../src/store/slices/authSlice";
import { useAuth } from "../../src/hooks/useAuth";
import { Society } from "../../src/types/index";
import { colors, fonts, brand } from "../../src/constants/theme";

type Step = "area" | "society";

const NO_SHOPS_LINES = [
  "Looks like your mohalla is playing hide & seek with shops! 🙈",
  "No shops have joined your society yet — but hey, every great marketplace starts with zero.",
  "Share mohallaMitr with your favourite local dukaan wala and they'll be here before you can say 'samosa'! 🥟",
];

export default function ChangeSocietyScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const toast = useToast();
  const { logoutUser } = useAuth();

  const [step, setStep] = useState<Step>("area");
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [societies, setSocieties] = useState<(Society & { activeBusinesses?: number })[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [areaError, setAreaError] = useState(false);
  const [societyError, setSocietyError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState<AreaInfo | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selectedSociety, setSelectedSociety] = useState<(Society & { activeBusinesses?: number }) | null>(null);
  const [browsingAll, setBrowsingAll] = useState(false);
  const [allSocieties, setAllSocieties] = useState<(Society & { activeBusinesses?: number })[]>([]);
  const loadedAreasRef = useRef(false);

  const isFirstTime = !user?.societyId;

  const loadAreas = useCallback(async () => {
    setLoadingAreas(true);
    setAreaError(false);
    try {
      const [areasRes, societiesRes] = await Promise.all([
        societyService.getAreas(),
        societyService.getSocieties(1, 200),
      ]);
      setAreas(areasRes.data);
      setAllSocieties(societiesRes.data);
    } catch {
      setAreaError(true);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  useEffect(() => {
    if (loadedAreasRef.current) return;
    loadedAreasRef.current = true;
    loadAreas();
  }, [loadAreas]);

  const loadSocieties = useCallback(async (city?: string) => {
    setLoadingSocieties(true);
    setSocietyError(false);
    try {
      const res = await societyService.getSocieties(1, 200, city);
      setSocieties(res.data);
    } catch {
      setSocietyError(true);
    } finally {
      setLoadingSocieties(false);
    }
  }, []);

  const handleAreaSelect = useCallback(async (area: AreaInfo) => {
    setSelectedArea(area);
    setBrowsingAll(false);
    setStep("society");
    setSearch("");
    setSelectedId("");
    setSelectedSociety(null);
    await loadSocieties(area.city);
  }, [loadSocieties]);

  const handleDirectSocietySelect = useCallback((society: Society & { activeBusinesses?: number }) => {
    setSelectedArea(null);
    setBrowsingAll(false);
    setStep("society");
    setSearch("");
    setSelectedId(society.id);
    setSelectedSociety(society);
    loadSocieties(society.city);
  }, [loadSocieties]);

  const handleBrowseAll = useCallback(async () => {
    setSelectedArea(null);
    setBrowsingAll(true);
    setStep("society");
    setSearch("");
    setSelectedId("");
    setSelectedSociety(null);
    await loadSocieties();
  }, [loadSocieties]);

  const handleBack = useCallback(() => {
    if (step === "society") {
      setStep("area");
      setSearch("");
      setSelectedId("");
      setSelectedSociety(null);
      setBrowsingAll(false);
    } else if (!isFirstTime) {
      router.back();
    }
  }, [step, isFirstTime]);

  const filteredAreas = useMemo(
    () =>
      areas.filter(
        (a) =>
          a.city.toLowerCase().includes(search.toLowerCase()) ||
          a.state.toLowerCase().includes(search.toLowerCase())
      ),
    [areas, search]
  );

  const searchMatchedSocieties = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return allSocieties.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.pincode.includes(q)
    );
  }, [allSocieties, search]);

  const filteredSocieties = useMemo(
    () => {
      const q = search.toLowerCase();
      if (!q) return societies;
      return societies.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.pincode.includes(q)
      );
    },
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
  const isSearching = search.trim().length > 0;

  // ---------------------------------------------------------------------------
  // Area step
  // ---------------------------------------------------------------------------
  const renderAreaStep = () => (
    <View style={styles.content}>
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
          placeholder="Search city, society or pincode..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
        />
        {isSearching ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loadingAreas ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.accent} />
          <Text style={styles.emptySubtext}>Loading areas...</Text>
        </View>
      ) : areaError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Failed to load areas</Text>
          <Text style={styles.emptySubtext}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadAreas}>
            <Ionicons name="refresh" size={16} color={brand.primary} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAreas}
          keyExtractor={(item) => `${item.city}-${item.state}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.areaItem}
              activeOpacity={0.8}
              onPress={() => handleAreaSelect(item)}
            >
              <View style={styles.areaIcon}>
                <Ionicons name="location" size={20} color={brand.primary} />
              </View>
              <View style={styles.areaInfo}>
                <Text style={styles.areaName}>{item.city}</Text>
                <Text style={styles.areaMeta}>
                  {item.state} · {item.societyCount} {item.societyCount === 1 ? "society" : "societies"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="location-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {isSearching
                  ? `No areas match "${search}"`
                  : "No areas available yet"}
              </Text>
              <Text style={styles.emptySubtext}>
                {isSearching
                  ? "Your city might be listed with a different name"
                  : "Societies haven't been registered yet"}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {searchMatchedSocieties.length > 0 ? (
                <View style={styles.matchedSocietiesWrap}>
                  <View style={styles.matchedHeader}>
                    <Ionicons name="business-outline" size={16} color={brand.primary} />
                    <Text style={styles.matchedHeaderText}>Matching societies</Text>
                  </View>
                  {searchMatchedSocieties.slice(0, 5).map((s) => {
                    const shopCount = s.activeBusinesses ?? 0;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.societyItem}
                        activeOpacity={0.8}
                        onPress={() => handleDirectSocietySelect(s)}
                      >
                        <View style={styles.societyIcon}>
                          <Text style={styles.societyIconText}>{"🏘️"}</Text>
                        </View>
                        <View style={styles.societyInfo}>
                          <Text style={styles.societyName}>{s.name}</Text>
                          <Text style={styles.societyMeta}>
                            {s.city}, {s.state} · {s.pincode}
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
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              <View style={styles.browseAllWrap}>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={styles.browseAllBtn}
                  activeOpacity={0.8}
                  onPress={handleBrowseAll}
                >
                  <Ionicons name="globe-outline" size={18} color={brand.primary} />
                  <Text style={styles.browseAllBtnText}>Browse all societies</Text>
                  <Ionicons name="chevron-forward" size={16} color={brand.primary} />
                </TouchableOpacity>
                <Text style={styles.browseAllHint}>
                  Can't find your area? Browse the full list and pick your society directly.
                </Text>
              </View>
            </>
          }
        />
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Society step
  // ---------------------------------------------------------------------------
  const renderSocietyStep = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        {browsingAll ? (
          <View style={styles.stepBadge}>
            <Ionicons name="globe-outline" size={14} color={brand.primary} />
            <Text style={styles.stepBadgeText}>All areas</Text>
          </View>
        ) : selectedArea ? (
          <View style={styles.stepBadge}>
            <Ionicons name="location" size={14} color={brand.primary} />
            <Text style={styles.stepBadgeText}>{selectedArea.city}, {selectedArea.state}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>Select your{"\n"}society</Text>
        <Text style={styles.subtitle}>
          Pick your housing society to see shops in your neighbourhood.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, address or pincode..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
        />
        {isSearching ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loadingSocieties ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.accent} />
          <Text style={styles.emptySubtext}>Loading societies...</Text>
        </View>
      ) : societyError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Failed to load societies</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadSocieties(browsingAll ? undefined : selectedArea?.city)}
          >
            <Ionicons name="refresh" size={16} color={brand.primary} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
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
                  <Text style={styles.societyIconText}>{"🏘️"}</Text>
                </View>
                <View style={styles.societyInfo}>
                  <Text style={[styles.societyName, isSelected && styles.societyNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={styles.societyMeta}>
                    {browsingAll
                      ? `${item.city}, ${item.state} · ${item.pincode}`
                      : `${item.address} · ${item.pincode}`}
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
              <Text style={styles.societyIconText}>{"🏘️"}</Text>
              <Text style={styles.emptyText}>
                {isSearching ? `No societies match "${search}"` : "No societies in this area"}
              </Text>
              <Text style={styles.emptySubtext}>
                {isSearching
                  ? "Try searching by name, address or pincode"
                  : "Try selecting a different area"}
              </Text>
            </View>
          }
        />
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {hasNoShops ? (
          <View style={styles.noShopsCard}>
            <Text style={styles.noShopsEmoji}>{"🏪"}</Text>
            {NO_SHOPS_LINES.map((line, i) => (
              <Text key={i} style={i === 0 ? styles.noShopsTitle : styles.noShopsBody}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {selectedSociety ? (
          <Text style={styles.selectedLabel}>{selectedSociety.name}</Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!selectedId || saving) && styles.continueBtnDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedId || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.continueBtnText}>
              {hasNoShops ? "Continue anyway" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        {(step === "society" || !isFirstTime) ? (
          <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <Text style={styles.topBarTitle}>
          {step === "area" ? "Select Area" : "Select Society"}
        </Text>
        {isFirstTime ? (
          <TouchableOpacity onPress={logoutUser} hitSlop={12} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={colors.red[600]} />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
      </View>

      {step === "area" ? renderAreaStep() : renderSocietyStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  logoutBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.red[600],
  },
  topBarTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 38,
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
    textAlign: "center",
    paddingHorizontal: 16,
  },
  emptySubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 16,
  },

  // Retry
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.primary,
  },
  retryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: brand.primary,
  },

  // Matched societies in area step
  matchedSocietiesWrap: {
    marginTop: 16,
    gap: 0,
  },
  matchedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  matchedHeaderText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: brand.primary,
  },

  // Browse all
  browseAllWrap: {
    marginTop: 16,
    alignItems: "center",
    gap: 12,
    paddingBottom: 24,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  browseAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: brand.primary,
    backgroundColor: brand.soft,
    width: "100%",
    justifyContent: "center",
  },
  browseAllBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: brand.primary,
    flex: 1,
  },
  browseAllHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 12,
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
  areaIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: brand.soft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    gap: 10,
  },
  selectedLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  continueBtn: {
    backgroundColor: brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
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
