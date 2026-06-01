import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useConvertEstimateToInvoice,
  useDeleteEstimate,
  useGetEstimate,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate, statusBg, statusFg, statusLabel } from "@/utils/format";

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const numId = Number(id);
  const isWeb = Platform.OS === "web";

  const { data: estimate, isLoading } = useGetEstimate(numId);
  const { mutateAsync: convertToInvoice, isPending: converting } = useConvertEstimateToInvoice();
  const { mutateAsync: deleteEstimate, isPending: deleting } = useDeleteEstimate();

  const [showDelete, setShowDelete] = useState(false);

  if (isLoading || !estimate) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const topPad = isWeb ? 67 : insets.top;
  const items = (estimate.lineItems ?? []) as Array<{ description: string; quantity: number; unitPrice: number; total: number }>;

  const handleConvert = async () => {
    Alert.alert("Convert to Invoice", "This will create a new invoice based on this estimate.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Convert",
        onPress: async () => {
          try {
            const inv = await convertToInvoice({ id: numId });
            await qc.invalidateQueries({ queryKey: ["listEstimates"] });
            router.replace(`/invoice/${inv.id}`);
          } catch {
            Alert.alert("Error", "Failed to convert estimate.");
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate({ id: numId });
      await qc.invalidateQueries({ queryKey: ["listEstimates"] });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to delete estimate.");
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          #{estimate.estimateNumber ?? "Estimate"}
        </Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusRow]}>
          <View style={[styles.badge, { backgroundColor: statusBg(estimate.status) }]}>
            <Text style={[styles.badgeText, { color: statusFg(estimate.status) }]}>
              {statusLabel(estimate.status)}
            </Text>
          </View>
        </View>

        {estimate.customer && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Customer</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {estimate.customer.company || estimate.customer.name}
            </Text>
            {estimate.customer.email && (
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{estimate.customer.email}</Text>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Created</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]}>
                {estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Line Items</Text>
          {items.map((item, i) => (
            <View key={i} style={[styles.lineItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.lineLeft}>
                <Text style={[styles.lineDesc, { color: colors.foreground }]}>{item.description}</Text>
                <Text style={[styles.lineQty, { color: colors.mutedForeground }]}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={[styles.lineTotal, { color: colors.foreground }]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              {formatCurrency(estimate.total ?? 0)}
            </Text>
          </View>
        </View>

        {estimate.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{estimate.notes}</Text>
          </View>
        )}
      </ScrollView>

      {estimate.status !== "converted" && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.convertBtn, { backgroundColor: colors.primary }]}
            onPress={handleConvert}
            disabled={converting}
            activeOpacity={0.8}
          >
            {converting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="file-text" size={18} color="#fff" />
                <Text style={styles.convertBtnText}>Convert to Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Delete Estimate</Text>
            <Text style={[styles.modalText, { color: colors.mutedForeground }]}>
              This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Delete</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDelete(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  badge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  cardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 16, fontFamily: "Inter_500Medium" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  datesRow: { flexDirection: "row", gap: 24 },
  dateBlock: { gap: 4 },
  lineItem: { paddingVertical: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  lineLeft: { flex: 1, marginRight: 12 },
  lineDesc: { fontSize: 15, fontFamily: "Inter_400Regular" },
  lineQty: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lineTotal: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actions: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  convertBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  convertBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  modalBox: { borderRadius: 16, borderWidth: 1, padding: 24, width: "100%", gap: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalCancel: { alignItems: "center", paddingVertical: 8 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
