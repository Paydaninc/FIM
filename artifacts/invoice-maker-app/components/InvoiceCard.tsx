import { Feather } from "@expo/vector-icons";
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

function statusBarColor(status: string): string {
  switch (status) {
    case "paid": return "#16a34a";
    case "overdue": return "#dc2626";
    case "sent": return "#2563eb";
    case "draft": return "#9ca3af";
    default: return "#9ca3af";
  }
}

export function InvoiceCard({ invoice, onPress }: Props) {
  const colors = useColors();
  const customerName = invoice.customer?.companyName || invoice.customer?.fullName || "No customer";
  const barColor = statusBarColor(invoice.status);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={[styles.statusBar, { backgroundColor: barColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.leftCol}>
            <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
              {customerName}
            </Text>
            <Text style={[styles.invoiceNum, { color: colors.mutedForeground }]}>
              Invoice #{invoice.invoiceNumber ?? "—"}
            </Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.amount, { color: colors.foreground }]}>
              {formatCurrency(invoice.total ?? 0)}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={[styles.badge, { backgroundColor: statusBg(invoice.status) }]}>
            <Text style={[styles.badgeText, { color: statusFg(invoice.status) }]}>
              {statusLabel(invoice.status)}
            </Text>
          </View>
          <View style={styles.metaRight}>
            {invoice.dueDate ? (
              <Text style={[styles.due, { color: colors.mutedForeground }]}>
                Due {formatShortDate(invoice.dueDate)}
              </Text>
            ) : null}
            <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    overflow: "hidden",
  },
  statusBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  leftCol: { flex: 1 },
  rightCol: { alignItems: "flex-end" },
  customer: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  invoiceNum: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  amount: { fontSize: 17, fontFamily: "Inter_700Bold" },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  metaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  due: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
