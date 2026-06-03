import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateQuickCheckout } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const QUICK_AMOUNTS = [25, 50, 75, 100, 150, 200, 250, 500];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function QuickCheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Params from the charge screen
  const params = useLocalSearchParams<{ amount?: string; mode?: string }>();
  const initialAmount = params.amount ?? "";
  const initialMode = (params.mode === "cash" || params.mode === "card") ? params.mode : null;

  const [raw, setRaw] = useState(initialAmount);
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  // For cash mode: show receipt immediately
  const [cashPaid, setCashPaid] = useState(initialMode === "cash" && parseFloat(initialAmount) > 0);

  const { mutateAsync: createCheckout, isPending } = useCreateQuickCheckout();
  const dollars = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;

  const handleGenerate = async () => {
    if (dollars <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount greater than $0.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await createCheckout({
        data: {
          amount: dollars,
          description: description.trim() || null,
          customerName: customerName.trim() || null,
          customerEmail: customerEmail.trim() || null,
        },
      });
      setCheckoutUrl(result.url);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to create checkout. Make sure Stripe is connected.";
      Alert.alert("Error", msg);
    }
  };

  const handleCashPaid = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCashPaid(true);
  };

  const handleReset = () => {
    setCheckoutUrl(null);
    setCashPaid(false);
    setRaw("");
    setDescription("");
    setCustomerName("");
    setCustomerEmail("");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ── CASH RECEIPT SCREEN ────────────────────────────────────────────────
  if (cashPaid) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cash Received</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.successContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.successIcon, { backgroundColor: "#dcfce7" }]}>
            <Feather name="check-circle" size={40} color="#16a34a" />
          </View>
          <Text style={[styles.successLabel, { color: colors.mutedForeground }]}>Paid in cash</Text>
          <Text style={[styles.successAmount, { color: colors.foreground }]}>{formatCurrency(dollars)}</Text>
          {description ? (
            <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>{description}</Text>
          ) : null}
          {customerName ? (
            <Text style={[styles.successCustomer, { color: colors.mutedForeground }]}>
              from {customerName}
            </Text>
          ) : null}

          <View style={[styles.receiptBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptKey, { color: colors.mutedForeground }]}>Amount</Text>
              <Text style={[styles.receiptVal, { color: colors.foreground }]}>{formatCurrency(dollars)}</Text>
            </View>
            <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptKey, { color: colors.mutedForeground }]}>Method</Text>
              <Text style={[styles.receiptVal, { color: colors.foreground }]}>Cash</Text>
            </View>
            {customerName ? (
              <>
                <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptKey, { color: colors.mutedForeground }]}>Customer</Text>
                  <Text style={[styles.receiptVal, { color: colors.foreground }]}>{customerName}</Text>
                </View>
              </>
            ) : null}
            {description ? (
              <>
                <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptKey, { color: colors.mutedForeground }]}>For</Text>
                  <Text style={[styles.receiptVal, { color: colors.foreground }]}>{description}</Text>
                </View>
              </>
            ) : null}
            <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptKey, { color: colors.mutedForeground }]}>Date</Text>
              <Text style={[styles.receiptVal, { color: colors.foreground }]}>
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
            <Text style={[styles.resetBtnText, { color: colors.mutedForeground }]}>New Transaction</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── CARD CHECKOUT READY SCREEN ─────────────────────────────────────────
  if (checkoutUrl) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment Link Ready</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.successContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.successIcon, { backgroundColor: "#dbeafe" }]}>
            <Feather name="credit-card" size={36} color="#2563eb" />
          </View>
          <Text style={[styles.successAmount, { color: colors.foreground }]}>{formatCurrency(dollars)}</Text>
          {description ? (
            <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>{description}</Text>
          ) : null}
          {customerName ? (
            <Text style={[styles.successCustomer, { color: colors.mutedForeground }]}>for {customerName}</Text>
          ) : null}

          <View style={[styles.urlBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.urlText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {checkoutUrl}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL(checkoutUrl)}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Payment Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={async () => {
              await Clipboard.setStringAsync(checkoutUrl);
              Alert.alert("Copied", "Payment link copied to clipboard.");
            }}
            activeOpacity={0.8}
          >
            <Feather name="copy" size={18} color={colors.foreground} />
            <Text style={[styles.outlineBtnText, { color: colors.foreground }]}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
            <Text style={[styles.resetBtnText, { color: colors.mutedForeground }]}>New Checkout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── ENTRY FORM ─────────────────────────────────────────────────────────
  const isCashMode = initialMode === "cash";
  const isCardMode = initialMode === "card";

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isCashMode ? "Cash Payment" : isCardMode ? "Card Payment" : "Quick Checkout"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Amount display */}
        <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Amount</Text>
          <View style={styles.amountInputRow}>
            <Text style={[styles.dollarSign, { color: dollars > 0 ? colors.foreground : colors.mutedForeground }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={raw}
              onChangeText={setRaw}
              autoFocus={!initialAmount}
            />
          </View>

          {/* Quick amount chips — only show if no amount was pre-filled */}
          {!initialAmount && (
            <View style={styles.quickGrid}>
              {QUICK_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: dollars === a ? colors.primary : colors.muted,
                      borderColor: dollars === a ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRaw(String(a));
                  }}
                >
                  <Text style={[styles.quickChipText, { color: dollars === a ? "#fff" : colors.foreground }]}>
                    ${a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Optional fields */}
        <View style={[styles.fieldsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.fieldsSectionLabel, { color: colors.mutedForeground }]}>Optional Details</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Lawn service, HVAC repair..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Customer Name</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="John Smith"
              placeholderTextColor={colors.mutedForeground}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>
          {!isCashMode && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Customer Email</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="john@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {/* Action buttons */}
        {isCashMode ? (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              { backgroundColor: dollars > 0 ? "#16a34a" : colors.muted },
            ]}
            onPress={handleCashPaid}
            disabled={dollars <= 0}
            activeOpacity={0.8}
          >
            <Feather name="dollar-sign" size={20} color={dollars > 0 ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.generateBtnText, { color: dollars > 0 ? "#fff" : colors.mutedForeground }]}>
              Mark as Cash Paid
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              { backgroundColor: dollars > 0 ? colors.primary : colors.muted },
            ]}
            onPress={handleGenerate}
            disabled={dollars <= 0 || isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="credit-card" size={20} color={dollars > 0 ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.generateBtnText, { color: dollars > 0 ? "#fff" : colors.mutedForeground }]}>
                  Generate Payment Link
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          {isCashMode
            ? "A receipt will be shown for your records."
            : "No invoice created — perfect for quick on-the-spot payments."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, gap: 12 },
  amountCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  amountLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  amountInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dollarSign: { fontSize: 36, fontFamily: "Inter_700Bold" },
  amountInput: { fontSize: 52, fontFamily: "Inter_700Bold", flex: 1, padding: 0, minWidth: 0 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  quickChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  fieldsSectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 4,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  footnote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 16 },
  // Success / receipt screens
  successContent: { alignItems: "center", paddingHorizontal: 24, paddingTop: 32, gap: 12 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  successAmount: { fontSize: 48, fontFamily: "Inter_700Bold" },
  successDesc: { fontSize: 16, fontFamily: "Inter_400Regular" },
  successCustomer: { fontSize: 14, fontFamily: "Inter_400Regular" },
  receiptBox: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 0,
    marginTop: 8,
  },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  receiptDivider: { height: 1 },
  receiptKey: { fontSize: 13, fontFamily: "Inter_400Regular" },
  receiptVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  urlBox: { borderRadius: 10, borderWidth: 1, padding: 12, width: "100%", marginTop: 8 },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    justifyContent: "center",
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
