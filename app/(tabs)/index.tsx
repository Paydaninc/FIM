import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetDashboardSummary,
  useGetMe,
  useGetRecentInvoices,
} from "@workspace/api-client-react";
import { InvoiceCard } from "@/components/InvoiceCard";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/utils/format";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: me } = useGetMe();
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: recent = [], isLoading: loadingRecent, refetch: refetchRecent } = useGetRecentInvoices({ limit: 5 });

  const isLoading = loadingSummary || loadingRecent;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const businessName = me?.businessName || "there";

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (isWeb ? 84 : insets.bottom) + 32 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { refetchSummary(); refetchRecent(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting()},</Text>
          <Text style={[styles.businessName, { color: colors.foreground }]}>{businessName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/new-invoice");
          }}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Revenue Hero */}
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.heroLabel}>Revenue this month</Text>
        {loadingSummary ? (
          <ActivityIndicator color="rgba(255,255,255,0.7)" style={{ marginVertical: 8 }} />
        ) : (
          <Text style={styles.heroAmount}>
            {formatCurrency(summary?.revenueThisMonth ?? 0)}
          </Text>
        )}
        <Text style={styles.heroSub}>
          {formatCurrency(summary?.totalRevenue ?? 0)} total all time
        </Text>
      </View>

      {/* Quick Stats */}
      {summary && (
        <View style={styles.statsGrid}>
          <StatPill label="Paid" value={summary.paidInvoicesCount} color={colors.success} bg={colors.success + "15"} colors={colors} />
          <StatPill label="Unpaid" value={summary.unpaidInvoicesCount} color={colors.warning} bg={colors.warning + "15"} colors={colors} />
          <StatPill label="Overdue" value={summary.overdueInvoicesCount} color={colors.destructive} bg={colors.destructive + "15"} colors={colors} />
          <StatPill label="Draft" value={summary.draftInvoicesCount} color={colors.mutedForeground} bg={colors.muted} colors={colors} />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/new-invoice");
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="file-text" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>New Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/new-estimate");
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.success + "15" }]}>
            <Feather name="clipboard" size={20} color={colors.success} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>New Estimate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/new-customer");
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.warning + "15" }]}>
            <Feather name="user-plus" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Invoices */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Invoices</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/invoices")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      </View>

      {loadingRecent ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : recent.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="inbox" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No invoices yet</Text>
        </View>
      ) : (
        recent.map((inv) => (
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

function StatPill({
  label,
  value,
  color,
  bg,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  colors: any;
}) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: bg }]}>
      <Text style={[pillStyles.value, { color }]}>{value}</Text>
      <Text style={[pillStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center", gap: 2 },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  businessName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  heroLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginBottom: 6 },
  heroAmount: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
