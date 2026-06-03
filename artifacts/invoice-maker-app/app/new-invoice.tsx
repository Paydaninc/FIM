import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import { useCreateInvoice, useGetMe, useListCustomers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/utils/format";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

function calcTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
}

export default function NewInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { customerId: preselectedId } = useLocalSearchParams<{ customerId?: string }>();

  const { data: me } = useGetMe();
  const { mutateAsync: createInvoice, isPending } = useCreateInvoice();
  const { data: customers = [] } = useListCustomers({ limit: 200 });

  const [customerId, setCustomerId] = useState<number | null>(preselectedId ? Number(preselectedId) : null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [notes, setNotes] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(String(me?.defaultTaxRate ?? ""));
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (me?.defaultNotes && !notes) setNotes(me.defaultNotes);
    if (me?.defaultTaxRate && !taxRate) setTaxRate(String(me.defaultTaxRate));
  }, [me]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        [c.fullName, c.companyName, c.email].join(" ").toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const subtotal = calcTotal(items);
  const tax = taxEnabled && taxRate ? subtotal * (parseFloat(taxRate) / 100) : 0;
  const total = subtotal + tax;

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (asDraft = true) => {
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) {
      Alert.alert("Add items", "Please add at least one line item with a price.");
      return;
    }

    try {
      const lineItems = validItems.map((i) => ({
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 1,
        unitPrice: parseFloat(i.unitPrice) || 0,
        taxable: true,
      }));

      const inv = await createInvoice({
        data: {
          customerId: customerId ?? undefined,
          lineItems,
          notes: notes.trim() || undefined,
          taxRate: taxEnabled && taxRate ? parseFloat(taxRate) : undefined,
          dueDate: dueDate || undefined,
          status: asDraft ? "draft" : "sent",
        },
      });

      await qc.invalidateQueries({ queryKey: ["listInvoices"] });
      router.replace(`/invoice/${inv.id}`);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create invoice");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Invoice</Text>
        <TouchableOpacity onPress={() => handleSave(true)} disabled={isPending} style={{ opacity: isPending ? 0.5 : 1 }}>
          {isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Save Draft</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Customer */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Customer</Text>
        <TouchableOpacity
          style={[styles.customerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCustomerPicker(true)}
          activeOpacity={0.7}
        >
          {selectedCustomer ? (
            <View style={styles.customerSelected}>
              <View style={[styles.customerAvatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.customerAvatarText, { color: colors.primary }]}>
                  {(selectedCustomer.companyName || selectedCustomer.fullName || "?")[0].toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {selectedCustomer.companyName || selectedCustomer.fullName}
              </Text>
            </View>
          ) : (
            <View style={styles.customerEmpty}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <Text style={[styles.customerPlaceholder, { color: colors.mutedForeground }]}>Select customer</Text>
            </View>
          )}
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Due Date */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Due Date (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          value={dueDate}
          onChangeText={setDueDate}
        />

        {/* Line Items */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Line Items</Text>
        {items.map((item, index) => (
          <View key={index} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.itemDesc, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Description"
                placeholderTextColor={colors.mutedForeground}
                value={item.description}
                onChangeText={(v) => updateItem(index, "description", v)}
              />
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                  <Feather name="x" size={16} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.itemNumbers}>
              <View style={styles.itemNumField}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Qty</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                  value={item.quantity}
                  onChangeText={(v) => updateItem(index, "quantity", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.itemNumField, { flex: 2 }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Unit Price</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  value={item.unitPrice}
                  onChangeText={(v) => updateItem(index, "unitPrice", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.itemNumField}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.itemTotalText, { color: colors.foreground }]}>
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: colors.border }]}
          onPress={addItem}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addItemText, { color: colors.primary }]}>Add Item</Text>
        </TouchableOpacity>

        {/* Tax */}
        <View style={styles.taxRow}>
          <TouchableOpacity
            style={[styles.taxToggle, { backgroundColor: taxEnabled ? colors.primary : colors.muted, borderColor: taxEnabled ? colors.primary : colors.border }]}
            onPress={() => setTaxEnabled(!taxEnabled)}
          >
            <Text style={[styles.taxToggleText, { color: taxEnabled ? "#fff" : colors.mutedForeground }]}>
              Tax
            </Text>
          </TouchableOpacity>
          {taxEnabled && (
            <TextInput
              style={[styles.taxInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={taxRate}
              onChangeText={setTaxRate}
              keyboardType="decimal-pad"
            />
          )}
          {taxEnabled && (
            <Text style={[styles.taxSymbol, { color: colors.mutedForeground }]}>%</Text>
          )}
        </View>

        {/* Totals */}
        <View style={[styles.totalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrency(subtotal)}</Text>
          </View>
          {taxEnabled && taxRate && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Tax ({taxRate}%)</Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrency(tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandTotal, { color: colors.primary }]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Thank you for your business!"
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Bottom Save Buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.draftBtn, { borderColor: colors.border }]}
          onPress={() => handleSave(true)}
          disabled={isPending}
        >
          <Text style={[styles.draftBtnText, { color: colors.foreground }]}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleSave(false)}
          disabled={isPending}
        >
          <Feather name="send" size={16} color="#fff" />
          <Text style={styles.sendBtnText}>Create & Send</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.pickerSearch, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Search customers..."
              placeholderTextColor={colors.mutedForeground}
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoFocus
            />
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCustomerId(item.id);
                    setShowCustomerPicker(false);
                    setCustomerSearch("");
                  }}
                >
                  <Text style={[styles.pickerItemName, { color: colors.foreground }]}>
                    {item.companyName || item.fullName}
                  </Text>
                  {item.companyName && item.fullName && (
                    <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>{item.fullName}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.pickerEmpty, { color: colors.mutedForeground }]}>
                  No customers found
                </Text>
              }
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity
              style={[styles.noCustomerBtn]}
              onPress={() => {
                setCustomerId(null);
                setShowCustomerPicker(false);
                setCustomerSearch("");
              }}
            >
              <Text style={[styles.noCustomerText, { color: colors.mutedForeground }]}>
                Continue without customer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 16,
  },
  customerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  customerSelected: { flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  customerEmpty: { flexDirection: "row", alignItems: "center", gap: 8 },
  customerPlaceholder: { fontSize: 15, fontFamily: "Inter_400Regular" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDesc: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: { padding: 6 },
  itemNumbers: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  itemNumField: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  numInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  itemTotalText: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 10, textAlign: "center" },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 12,
    marginBottom: 16,
  },
  addItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  taxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  taxToggle: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  taxToggleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  taxInput: {
    width: 60,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  taxSymbol: { fontSize: 16 },
  totalsCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8, marginBottom: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  grandTotalRow: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  grandTotalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  grandTotal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  draftBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  draftBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sendBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 40,
  },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pickerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pickerSearch: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  pickerItem: { paddingVertical: 13, borderBottomWidth: 1 },
  pickerItemName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerItemSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  pickerEmpty: { paddingVertical: 20, textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
  noCustomerBtn: { paddingVertical: 14, alignItems: "center" },
  noCustomerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
