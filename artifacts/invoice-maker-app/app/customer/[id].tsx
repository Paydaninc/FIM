import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetCustomer,
  useGetCustomerStats,
  useListInvoices,
} from "@workspace/api-client-react";
import { InvoiceCard } from "@/components/InvoiceCard";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, initials } from "@/utils/format";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const numId = Number(id);
  const isWeb = Platform.OS === "web";

  const { data: customer, isLoading } = useGetCustomer(numId);
  const { data: stats } = useGetCustomerStats(numId);
  const { data: invoices = [] } = useListInvoices({ customerId: numId, limit: 20 });

  if (isLoading || !customer) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const displayName = customer.companyName || customer.fullName || "Customer";
  const topPad = isWeb ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.newInvoiceBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/new-invoice?customerId=${numId}`);
            }}
          >
            <Feather name="file-text" size={14} color="#fff" />
            <Text style={styles.newInvoiceBtnText}>Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newEstimateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/new-estimate?customerId=${numId}`);
            }}
          >
            <Feather name="clipboard" size={14} color={colors.foreground} />
            <Text style={[styles.newInvoiceBtnText, { color: colors.foreground }]}>Estimate</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(displayName)}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
        {customer.companyName && customer.fullName && (
          <Text style={[styles.subName, { color: colors.mutedForeground }]}>{customer.fullName}</Text>
        )}
        <View style={styles.contactRow}>
          {customer.email ? (
            <View style={[styles.contactChip, { backgroundColor: colors.muted }]}>
              <Feather name="mail" size={13} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{customer.email}</Text>
            </View>
          ) : null}
          {customer.phone ? (
            <View style={[styles.contactChip, { backgroundColor: colors.muted }]}>
              <Feather name="phone" size={13} color={colors.mutedForeground} />
              <Text style={[styles.contactText, { color: colors.mutedForeground }]}>{customer.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <StatBox label="Total Revenue" value={formatCurrency(stats.totalRevenue)} colors={colors} />
          <StatBox label="Invoices" value={String(stats.totalInvoices ?? 0)} colors={colors} />
          <StatBox label="Paid" value={String(stats.paidInvoices ?? 0)} colors={colors} accent={colors.success} />
          <StatBox label="Unpaid" value={String(stats.unpaidInvoices ?? 0)} colors={colors} accent={colors.warning} />
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Invoices</Text>
      {invoices.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No invoices yet</Text>
        </View>
      ) : (
        invoices.map((inv) => (
          <InvoiceCard
            key={inv.id}
            invoice={inv}
            onPress={() => router.push(`/invoice/${inv.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, colors, accent }: { label: string; value: string; colors: any; accent?: string }) {
  return (
    <View style={[statStyles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[statStyles.value, { color: accent ?? colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  value: { fontSize: 15, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  actionBtns: { flexDirection: "row", gap: 8 },
  newInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newEstimateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  newInvoiceBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heroSection: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subName: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contactText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
