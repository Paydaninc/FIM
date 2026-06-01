import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatShortDate, statusBg, statusFg, statusLabel } from "@/utils/format";

interface Invoice {
  id: number;
  invoiceNumber: string | null;
  status: string;
  total: number | null;
  dueDate?: string | null;
  customer?: { fullName: string; companyName?: string | null } | null;
}

interface Props {
  invoice: Invoice;
  onPress: () => void;
}

export function InvoiceCard({ invoice, onPress }: Props) {
  const colors = useColors();
  const customerName = invoice.customer?.companyName || invoice.customer?.fullName || "No customer";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.invoiceNum, { color: colors.foreground }]}>
            #{invoice.invoiceNumber ?? "—"}
          </Text>
          <Text style={[styles.customer, { color: colors.mutedForeground }]} numberOfLines={1}>
            {customerName}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatCurrency(invoice.total ?? 0)}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: statusBg(invoice.status) },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusFg(invoice.status) }]}>
              {statusLabel(invoice.status)}
            </Text>
          </View>
        </View>
      </View>
      {invoice.dueDate && (
        <Text style={[styles.due, { color: colors.mutedForeground }]}>
          Due {formatShortDate(invoice.dueDate)}
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
  invoiceNum: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  due: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
});
