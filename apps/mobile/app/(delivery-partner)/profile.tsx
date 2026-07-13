import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@hooks/useAuth";
import { useAppSelector } from "@hooks/useRedux";
import {
  deliveryPartnerService,
  DeliveryBusiness,
} from "@services/deliveryPartnerService";
import { colors } from "@/constants/theme";

export default function DeliveryPartnerProfile() {
  const insets = useSafeAreaInsets();
  const { logoutUser } = useAuth();
  const user = useAppSelector((s) => s.auth.user);
  const [business, setBusiness] = useState<DeliveryBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await deliveryPartnerService.getMe();
      setBusiness(res.data?.business ?? null);
    } catch {
      setBusiness(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#0891B2" />
        }
      >
        <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.hero}>
          <Text style={styles.heroEmoji}>🛵</Text>
          <Text style={styles.heroName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.heroPhone}>{user.phone}</Text> : null}
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Linked shop</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 12 }} color="#0891B2" />
          ) : business ? (
            <>
              <Text style={styles.shopName}>{business.name}</Text>
              {business.address ? (
                <Text style={styles.cardBody}>{business.address}</Text>
              ) : null}
              {business.phone ? (
                <Text style={styles.cardMeta}>Phone · {business.phone}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.cardBody}>
              No shop linked yet. Ask the business owner to recreate your partner login.
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logoutUser} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  heroEmoji: { fontSize: 36 },
  heroName: { marginTop: 10, fontSize: 22, fontWeight: "800", color: "#FFF" },
  heroEmail: { marginTop: 4, fontSize: 14, color: "rgba(255,255,255,0.9)" },
  heroPhone: { marginTop: 2, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase" },
  shopName: { marginTop: 8, fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  cardBody: { marginTop: 6, fontSize: 13, color: "#64748B", lineHeight: 19 },
  cardMeta: { marginTop: 6, fontSize: 13, color: "#0E7490", fontWeight: "600" },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontWeight: "800", fontSize: 15 },
});
