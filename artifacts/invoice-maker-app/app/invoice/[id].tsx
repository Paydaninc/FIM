import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useCreateInvoicePaymentLink,
  useDeleteInvoice,
  useGetInvoice,
  useMarkInvoicePaid,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import {
  formatCurrency,
  formatDate,
  statusBg,
  statusFg,
  statusLabel,
} from "@/utils/format";

type PayModal = "collect" | "tapToPay" | "markPaid" | null;

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const numId = Number(id);
  const isWeb = Platform.OS === "web";

  const { data: invoice, isLoading, refetch } = useGetInvoice(numId);
  const { mutateAsync: createPaymentLink, isPending: generatingLink } = useCreateInvoicePaymentLink();
  const { mutateAsync: markInvoicePaid, isPending: markingPaid } = useMarkInvoicePaid();
  const { mutateAsync: deleteInvoice, isPending: deleting } = useDeleteInvoice();

  const [payModal, setPayModal] = useState<PayModal>(null);
  const [payNote, setPayNote] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank" | "check">("cash");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading || !invoice) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const topPad = isWeb ? 67 : insets.top;
  const isPaid = invoice.status === "paid";
  const items = invoice.lineItems ?? [];

  const openPaymentLink = async (methods?: string[]) => {
    try {
      const result = await createPaymentLink({
        id: numId,
        data: methods ? { paymentMethods: methods } : undefined,
      });
      const url = result.url;
      setPaymentUrl(url ?? null);
      return url;
    } catch {
      // If Stripe not connected, fall back to public pay link
      const publicUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/pay/${invoice.publicToken}`;
      setPaymentUrl(publicUrl);
      return publicUrl;
    }
  };

  const handleCollect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = await openPaymentLink(["card"]);
    if (url) {
      await Linking.openURL(url);
      setPayModal(null);
    }
  };

  const handleTapToPay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPayModal("tapToPay");
    await openPaymentLink(["card"]);
  };

  const handleBankTransfer = async () => {
    const url = await openPaymentLink(["us_bank_account"]);
    if (url) {
      await Linking.openURL(url);
      setPayModal(null);
    }
  };

  const handleMarkPaid = async () => {
    try {
      await markInvoicePaid({ id: numId, data: { paymentMethod: payMethod as "cash" | "card" | "check", note: payNote || undefined } });
      await qc.invalidateQueries({ queryKey: ["getInvoice"] });
      await qc.invalidateQueries({ queryKey: ["listInvoices"] });
      await refetch();
      setPayModal(null);
      setPayNote("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to mark invoice as paid.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInvoice({ id: numId });
      await qc.invalidateQueries({ queryKey: ["listInvoices"] });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to delete invoice.");
    }
  };

  const publicUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/pay/${invoice.publicToken}`;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          #{invoice.invoiceNumber ?? "Invoice"}
        </Text>
        <TouchableOpacity onPress={() => setShowDelete(true)}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.badge, { backgroundColor: statusBg(invoice.status) }]}>
            <Text style={[styles.badgeText, { color: statusFg(invoice.status) }]}>
              {statusLabel(invoice.status)}
            </Text>
          </View>
        </View>

        {/* Customer */}
        {invoice.customer && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/customer/${invoice.customer!.id}`)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Bill To</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {invoice.customer.companyName || invoice.customer.fullName}
            </Text>
            {invoice.customer.email && (
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{invoice.customer.email}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Dates */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Created</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]}>
                {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Line Items</Text>
          {items.map((item, i) => (
            <View
              key={i}
              style={[
                styles.lineItem,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View style={styles.lineLeft}>
                <Text style={[styles.lineDesc, { color: colors.foreground }]}>{item.description}</Text>
                <Text style={[styles.lineQty, { color: colors.mutedForeground }]}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={[styles.lineTotal, { color: colors.foreground }]}>
                {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}

          {/* Subtotal / tax / total */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {invoice.subtotal != null && invoice.total !== invoice.subtotal && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
          )}
          {(invoice.taxRate ?? 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax ({invoice.taxRate}%)</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency((invoice.taxAmount ?? 0))}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              {formatCurrency(invoice.total ?? 0)}
            </Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{invoice.notes}</Text>
          </View>
        )}

        {/* Share link */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>Payment Link</Text>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]} numberOfLines={1}>{publicUrl}</Text>
          <View style={styles.linkBtns}>
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={async () => {
                await Clipboard.setStringAsync(publicUrl);
                Alert.alert("Copied", "Payment link copied to clipboard.");
              }}
            >
              <Feather name="copy" size={14} color={colors.foreground} />
              <Text style={[styles.linkBtnText, { color: colors.foreground }]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => Linking.openURL(publicUrl)}
            >
              <Feather name="external-link" size={14} color={colors.foreground} />
              <Text style={[styles.linkBtnText, { color: colors.foreground }]}>Open</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar */}
      {!isPaid ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {/* Tap to Pay - prominent */}
          <TouchableOpacity
            style={[styles.tapBtn, { backgroundColor: colors.primary }]}
            onPress={handleTapToPay}
            disabled={generatingLink}
            activeOpacity={0.85}
          >
            {generatingLink && payModal === "tapToPay" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={20} color="#fff" />
                <Text style={styles.tapBtnText}>Tap to Pay</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryBtns}>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleCollect}
              disabled={generatingLink}
            >
              <Feather name="credit-card" size={16} color={colors.foreground} />
              <Text style={[styles.secBtnText, { color: colors.foreground }]}>Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleBankTransfer}
              disabled={generatingLink}
            >
              <Feather name="dollar-sign" size={16} color={colors.foreground} />
              <Text style={[styles.secBtnText, { color: colors.foreground }]}>Bank</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => setPayModal("markPaid")}
            >
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.secBtnText, { color: colors.foreground }]}>Mark Paid</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.paidBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.paidBadge, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.paidText, { color: colors.success }]}>Paid</Text>
          </View>
        </View>
      )}

      {/* Tap to Pay Modal — Terminal-style in-person collection */}
      <Modal visible={payModal === "tapToPay"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.tapIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="zap" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Tap to Pay</Text>
            <Text style={[styles.payAmount, { color: colors.primary }]}>
              {formatCurrency(invoice.total ?? 0)}
            </Text>

            {/* NFC/Terminal note */}
            <View style={[styles.terminalNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="smartphone" size={16} color={colors.mutedForeground} />
              <Text style={[styles.terminalNoteText, { color: colors.mutedForeground }]}>
                Stripe Terminal NFC requires a dev build. Use the payment link below for now.
              </Text>
            </View>

            {generatingLink ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : paymentUrl ? (
              <View style={styles.urlActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Linking.openURL(paymentUrl);
                    setPayModal(null);
                  }}
                >
                  <Feather name="external-link" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>Open Payment Page</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtnOutline, { borderColor: colors.border }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(paymentUrl);
                    Alert.alert("Copied", "Payment link copied.");
                  }}
                >
                  <Feather name="copy" size={18} color={colors.foreground} />
                  <Text style={[styles.modalBtnOutlineText, { color: colors.foreground }]}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity style={styles.modalClose} onPress={() => { setPayModal(null); setPaymentUrl(null); }}>
              <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mark Paid Modal */}
      <Modal visible={payModal === "markPaid"} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mark as Paid</Text>
            <Text style={[styles.payAmount, { color: colors.success }]}>
              {formatCurrency(invoice.total ?? 0)}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(["cash", "card", "bank", "check"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodChip,
                    {
                      backgroundColor: payMethod === m ? colors.primary : colors.muted,
                      borderColor: payMethod === m ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text style={[styles.methodText, { color: payMethod === m ? "#fff" : colors.foreground }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Note (optional)</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Paid at job site"
              placeholderTextColor={colors.mutedForeground}
              value={payNote}
              onChangeText={setPayNote}
            />

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.success }]}
              onPress={handleMarkPaid}
              disabled={markingPaid}
            >
              {markingPaid ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>Confirm Payment</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPayModal(null)}>
              <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDelete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Delete Invoice</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Delete</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowDelete(false)}>
              <Text style={[styles.modalCloseText, { color: colors.mutedForeground }]}>Cancel</Text>
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
  statusRow: { flexDirection: "row" },
  badge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  cardLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 16, fontFamily: "Inter_500Medium" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  datesRow: { flexDirection: "row", gap: 32 },
  dateBlock: { gap: 4 },
  lineItem: { paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lineLeft: { flex: 1, marginRight: 12 },
  lineDesc: { fontSize: 15, fontFamily: "Inter_400Regular" },
  lineQty: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lineTotal: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginVertical: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  linkText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  linkBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  linkBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  tapBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  tapBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  secondaryBtns: { flexDirection: "row", gap: 8 },
  secBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  secBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  paidBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, alignItems: "center" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  paidText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    margin: 24,
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#94a3b8", marginBottom: 8 },
  tapIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  payAmount: { fontSize: 32, fontFamily: "Inter_700Bold" },
  urlActions: { width: "100%", gap: 8 },
  modalBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalBtnOutline: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnOutlineText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  modalClose: { paddingVertical: 10 },
  modalCloseText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  terminalNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    width: "100%",
  },
  terminalNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", alignSelf: "flex-start" },
  methodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignSelf: "flex-start" },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  methodText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  noteInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
