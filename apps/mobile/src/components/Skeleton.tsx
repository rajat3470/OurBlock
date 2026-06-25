import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle, Easing } from "react-native";

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
};

/** A single shimmering placeholder block. */
export function Skeleton({ width = "100%", height = 14, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.45, 0.85, 0.45],
  });

  return (
    <Animated.View
      style={[
        { width: width as ViewStyle["width"], height, borderRadius, backgroundColor: "#E5E7EB", opacity },
        style,
      ]}
    />
  );
}

/** Vertical list of menu-item skeleton rows for the store page. */
export function MenuSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.menuWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.menuRow}>
          <View style={styles.menuTextCol}>
            <Skeleton width={42} height={14} borderRadius={4} />
            <Skeleton width="70%" height={16} style={{ marginTop: 10 }} />
            <Skeleton width={70} height={14} style={{ marginTop: 10 }} />
            <Skeleton width="90%" height={12} style={{ marginTop: 10 }} />
          </View>
          <Skeleton width={104} height={104} borderRadius={14} />
        </View>
      ))}
    </View>
  );
}

/** Horizontal row of store-card skeletons for the home dashboard. */
export function StoreRowSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <View style={styles.storeRow}>
      {Array.from({ length: cards }).map((_, i) => (
        <View key={i} style={styles.storeCard}>
          <Skeleton width={150} height={96} borderRadius={14} />
          <Skeleton width={120} height={14} style={{ marginTop: 10 }} />
          <Skeleton width={80} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

/** Vertical list of full-width store-card skeletons for the home store list. */
export function StoreListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.listWrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listCard}>
          <Skeleton width="100%" height={140} borderRadius={0} />
          <View style={styles.listCardBody}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={13} style={{ marginTop: 10 }} />
            <Skeleton width="80%" height={12} style={{ marginTop: 10 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menuWrap: { paddingHorizontal: 16, paddingTop: 12 },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F1F3",
  },
  menuTextCol: { flex: 1, paddingRight: 16 },
  storeRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
  storeCard: { width: 150 },
  listWrap: { paddingHorizontal: 16, paddingTop: 4 },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EEF0F2",
  },
  listCardBody: { padding: 14 },
});
