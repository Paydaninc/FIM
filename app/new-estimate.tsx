import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
import { useCreateEstimate, useGetMe, useListCustomers } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/utils/format";

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function NewEstimateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: me } = useGetMe();
  const { mutateAsync: createEstimate, isPending } = useCreateEstimate();
  const { data: customers = [] } = useListCustomers({ limit: 200 });

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    if (me?.defaultNotes && !notes) setNotes(me.defaultNotes);
  }, [me]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        [c.name, c.company, c.email].join(" ").toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const subtotal = items.reduce((sum, i) => {
    return sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0);
  }, 0);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.unitPrice) > 0);
    if (validItems.length === 0) {
      Alert.alert("Add items", "Please add at least one line item with a price.");
      return;
    }
    try {
      const est = await createEstimate({
        data: {
          customerId: customerId ?? undefined,
          lineItems: validItems.map((i) => ({
            description: i.description.trim(),
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
          })),
          notes: notes.trim() || undefined,
          expiryDate: expiryDate || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["listEstimates"] });
      router.replace(`/estimate/${est.id}`);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create estimate");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Estimate</Text>
        <TouchableOpacity onPress={handleSave} disabled={isPending} style={{ opacity: isPending ? 0.5 : 1 }}>
          {isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
                  {(selectedCustomer.company || selectedCustomer.name || "?")[0].toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {selectedCustomer.company || selectedCustomer.name}
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

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Expiry Date (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          value={expiryDate}
          onChangeText={setExpiryDate}
        />

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
                <TouchableOpacity onPress={() => setItems((p) => p.filter((_, i) => i !== index))} style={{ padding: 6 }}>
                  <Feather name="x" size={16} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.itemNumbers}>
              <View style={styles.numField}>
                <Text style={[styles.numLabel, { color: colors.mutedForeground }]}>Qty</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                  value={item.quantity}
                  onChangeText={(v) => updateItem(index, "quantity", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.numField, { flex: 2 }]}>
                <Text style={[styles.numLabel, { color: colors.mutedForeground }]}>Price</Text>
                <TextInput
                  style={[styles.numInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  value={item.unitPrice}
                  onChangeText={(v) => updateItem(index, "unitPrice", v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.numField}>
                <Text style={[styles.numLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.numTotal, { color: colors.foreground }]}>
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: colors.border }]}
          onPress={() => setItems((p) => [...p, { description: "", quantity: "1", unitPrice: "" }])}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addItemText, { color: colors.primary }]}>Add Item</Text>
        </TouchableOpacity>

        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(subtotal)}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Any notes for this estimate..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

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
              placeholder="Search..."
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
                  onPress={() => { setCustomerId(item.id); setShowCustomerPicker(false); setCustomerSearch(""); }}
                >
                  <Text style={[styles.pickerName, { color: colors.foreground }]}>{item.company || item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
            <TouchableOpacity style={styles.clearCustomer} onPress={() => { setCustomerId(null); setShowCustomerPicker(false); }}>
              <Text style={[{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular" }]}>No customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 16 },
  customerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, padding: 14 },
  customerSelected: { flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  customerAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  customerEmpty: { flexDirection: "row", alignItems: "center", gap: 8 },
  customerPlaceholder: { fontSize: 15, fontFamily: "Inter_400Regular" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, gap: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemDesc: { flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  itemNumbers: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  numField: { flex: 1, gap: 4 },
  numLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  numInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  numTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 10, textAlign: "center" },
  addItemBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", paddingVertical: 12, marginBottom: 16 },
  addItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalCard: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  totalAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  notesInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 40 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pickerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pickerSearch: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 12 },
  pickerItem: { paddingVertical: 13, borderBottomWidth: 1 },
  pickerName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  clearCustomer: { paddingVertical: 14, alignItems: "center" },
});
