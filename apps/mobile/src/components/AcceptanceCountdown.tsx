import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatRemaining } from "../utils/orderAcceptance";

interface AcceptanceCountdownProps {
  /** Epoch-ms deadline after which the order auto-rejects. */
  deadlineMs: number;
  /** Fired once, when the countdown first reaches 0 (e.g. to refetch orders). */
  onExpire?: () => void;
  /** Compact renders a small inline pill; default renders a labelled banner. */
  compact?: boolean;
  style?: ViewStyle;
}

function remainingFrom(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

/**
 * Live "accept within" countdown. Owns its own 1s ticker so parent lists don't
 * re-render every second. Turns red in the final 10s and calls `onExpire` once.
 */
export default function AcceptanceCountdown({
  deadlineMs,
  onExpire,
  compact = false,
  style,
}: AcceptanceCountdownProps) {
  const [remaining, setRemaining] = useState(() => remainingFrom(deadlineMs));
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    setRemaining(remainingFrom(deadlineMs));

    const tick = () => {
      const next = remainingFrom(deadlineMs);
      setRemaining(next);
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, onExpire]);

  const urgent = remaining <= 10;
  const color = urgent ? "#DC2626" : "#B45309";
  const bg = urgent ? "#FEF2F2" : "#FFFBEB";
  const border = urgent ? "#FECACA" : "#FDE68A";

  if (compact) {
    return (
      <View style={[styles.pill, { backgroundColor: bg, borderColor: border }, style]}>
        <Ionicons name="time-outline" size={13} color={color} />
        <Text style={[styles.pillText, { color }]}>{formatRemaining(remaining)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }, style]}>
      <Ionicons name="time-outline" size={16} color={color} />
      <Text style={[styles.bannerText, { color }]}>
        {remaining > 0
          ? `Respond within ${formatRemaining(remaining)} or it auto-rejects`
          : "Auto-rejecting…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "800" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: { fontSize: 13, fontWeight: "700" },
});
