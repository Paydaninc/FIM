import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatShortDate, statusBg, statusFg, statusLabel } from "@/utils/format";

interface Estimate {
  id: number;
  estimateNumber: string | null;
  status: string;
  total: number | null;
  expiryDate?: string | null;
  customer?: { fullName: string; companyName?: string | null } | null;
}

interface Props {
  estimate: Estimate;
  onPress: () => void;
}

export function EstimateCard({ estimate, onPress }: Props) {
  const colors = useColors();
  const customerName = estimate.customer?.companyName || estimate.customer?.fullName || "No customer";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.num, { color: colors.foreground }]}>
            #{estimate.estimateNumber ?? "—"}
          </Text>
          <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>
            {customerName}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatCurrency(estimate.total ?? 0)}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusBg(estimate.status) }]}>
            <Text style={[styles.badgeText, { color: statusFg(estimate.status) }]}>
              {statusLabel(estimate.status)}
            </Text>
          </View>
        </View>
      </View>
      {estimate.expiryDate && (
        <Text style={[styles.expiry, { color: colors.mutedForeground }]}>
          Expires {formatShortDate(estimate.expiryDate)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: { flex: 1, marginRight: 12 },
  right: { alignItems: "flex-end" },
  num: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  expiry: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
});
