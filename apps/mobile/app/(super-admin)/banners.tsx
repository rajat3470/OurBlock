import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeBanner } from "../../src/types";
import { superAdminService } from "../../src/services/superAdminService";

type BannerDraft = {
  title: string;
  subtitle: string;
  imageUrl: string;
  tagText: string;
  ctaText: string;
  ctaRoute: string;
  societyId: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_DRAFT: BannerDraft = {
  title: "",
  subtitle: "",
  imageUrl: "",
  tagText: "TRENDING IN YOUR SOCIETY",
  ctaText: "",
  ctaRoute: "",
  societyId: "global",
  sortOrder: "100",
  isActive: true,
};

export default function SuperAdminBannersScreen() {
  const [items, setItems] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BannerDraft>(EMPTY_DRAFT);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await superAdminService.getBanners();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b) => {
      const haystack = [b.title, b.subtitle, b.societyId, b.tagText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setModalVisible(true);
  };

  const openEdit = (banner: HomeBanner) => {
    setEditingId(banner.id);
    setDraft({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      tagText: banner.tagText || "TRENDING IN YOUR SOCIETY",
      ctaText: banner.ctaText || "",
      ctaRoute: banner.ctaRoute || "",
      societyId: banner.societyId || "global",
      sortOrder: String(banner.sortOrder ?? 100),
      isActive: Boolean(banner.isActive),
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!draft.imageUrl.trim()) {
      Alert.alert("Validation", "Image URL is required");
      return;
    }

    const payload = {
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      imageUrl: draft.imageUrl.trim(),
      tagText: draft.tagText.trim(),
      ctaText: draft.ctaText.trim(),
      ctaRoute: draft.ctaRoute.trim(),
      societyId: (draft.societyId || "global").trim() || "global",
      sortOrder: Number(draft.sortOrder || 100),
      isActive: draft.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await superAdminService.updateBanner(editingId, payload);
      } else {
        await superAdminService.createBanner(payload);
      }
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const remove = (banner: HomeBanner) => {
    Alert.alert("Delete Banner", `Delete \"${banner.title}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await superAdminService.deleteBanner(banner.id);
            await load();
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to delete banner");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2563EB", "#4F46E5"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Home Banners</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, tag, society"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No banners found</Text>
              <Text style={styles.emptySub}>Create a banner to control home promotions without app release.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} contentFit="cover" />
              <View style={styles.cardBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.statusChip, item.isActive ? styles.statusOn : styles.statusOff]}>
                    <Text style={[styles.statusText, item.isActive ? styles.statusOnText : styles.statusOffText]}>
                      {item.isActive ? "Active" : "Off"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.societyId || "global"} · sort {item.sortOrder ?? 100}</Text>
                {item.subtitle ? <Text style={styles.cardSub} numberOfLines={2}>{item.subtitle}</Text> : null}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, item.isActive ? styles.toggleOffBtn : styles.toggleOnBtn]}
                    onPress={async () => {
                      try {
                        await superAdminService.updateBanner(item.id, { isActive: !item.isActive });
                        await load();
                      } catch (e: any) {
                        Alert.alert("Error", e?.message || "Failed to update banner");
                      }
                    }}
                  >
                    <Text style={[styles.toggleText, item.isActive ? styles.toggleOffText : styles.toggleOnText]}>
                      {item.isActive ? "Disable" : "Enable"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(item)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit Banner" : "Create Banner"}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={[0]}
            keyExtractor={() => "form"}
            contentContainerStyle={styles.formContent}
            renderItem={() => (
              <>
                <Label text="Title" />
                <TextInput style={styles.input} value={draft.title} onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))} />

                <Label text="Subtitle" />
                <TextInput style={styles.input} value={draft.subtitle} onChangeText={(v) => setDraft((d) => ({ ...d, subtitle: v }))} />

                <Label text="Image URL" />
                <TextInput style={styles.input} value={draft.imageUrl} onChangeText={(v) => setDraft((d) => ({ ...d, imageUrl: v }))} autoCapitalize="none" />

                <Label text="Tag Text" />
                <TextInput style={styles.input} value={draft.tagText} onChangeText={(v) => setDraft((d) => ({ ...d, tagText: v }))} />

                <Label text="CTA Text" />
                <TextInput style={styles.input} value={draft.ctaText} onChangeText={(v) => setDraft((d) => ({ ...d, ctaText: v }))} />

                <Label text="CTA Route (optional)" />
                <TextInput style={styles.input} value={draft.ctaRoute} onChangeText={(v) => setDraft((d) => ({ ...d, ctaRoute: v }))} />

                <Label text="Society ID (use 'global' for all)" />
                <TextInput style={styles.input} value={draft.societyId} onChangeText={(v) => setDraft((d) => ({ ...d, societyId: v }))} autoCapitalize="none" />

                <Label text="Sort Order" />
                <TextInput
                  style={styles.input}
                  value={draft.sortOrder}
                  onChangeText={(v) => setDraft((d) => ({ ...d, sortOrder: v.replace(/[^0-9]/g, "") }))}
                  keyboardType="number-pad"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active</Text>
                  <Switch value={draft.isActive} onValueChange={(v) => setDraft((d) => ({ ...d, isActive: v }))} />
                </View>

                <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={save}>
                  {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Save Banner</Text>}
                </TouchableOpacity>
              </>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  addBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  addBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  searchWrap: { padding: 14 },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#0F172A",
  },
  listContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 130, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bannerImage: { width: "100%", height: 130 },
  cardBody: { padding: 12, gap: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1E293B" },
  cardMeta: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  cardSub: { fontSize: 13, color: "#334155" },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusOn: { backgroundColor: "#DCFCE7" },
  statusOff: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusOnText: { color: "#166534" },
  statusOffText: { color: "#991B1B" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  editBtn: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  editText: { color: "#1D4ED8", fontWeight: "700", fontSize: 12 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  toggleOnBtn: { backgroundColor: "#DCFCE7" },
  toggleOffBtn: { backgroundColor: "#FEF2F2" },
  toggleText: { fontWeight: "700", fontSize: 12 },
  toggleOnText: { color: "#166534" },
  toggleOffText: { color: "#991B1B" },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  deleteText: { color: "#991B1B", fontWeight: "700", fontSize: 12 },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 50, paddingHorizontal: 22 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#334155" },
  emptySub: { marginTop: 8, fontSize: 13, color: "#64748B", textAlign: "center" },
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: "#0F172A" },
  closeText: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  formContent: { padding: 16, paddingBottom: 30 },
  label: { marginTop: 8, marginBottom: 6, fontSize: 13, fontWeight: "700", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  switchRow: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  saveBtn: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
