import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateCustomer } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function NewCustomerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { mutateAsync: createCustomer, isPending } = useCreateCustomer();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter the customer's name.");
      return;
    }
    try {
      await createCustomer({
        data: {
          fullName: name.trim(),
          companyName: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          billingAddress: address.trim() || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["listCustomers"] });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create customer");
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Customer</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending || !name.trim()}
          style={{ opacity: isPending || !name.trim() ? 0.4 : 1 }}
        >
          {isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="Name *" value={name} onChangeText={setName} placeholder="John Smith" colors={colors} />
        <Field label="Company" value={company} onChangeText={setCompany} placeholder="Acme Corp" colors={colors} />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="john@example.com" colors={colors} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" colors={colors} keyboardType="phone-pad" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St, City, State" colors={colors} multiline />
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: any;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={[fieldStyles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground },
          multiline && fieldStyles.multiline,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  multiline: { minHeight: 80, paddingTop: 13 },
});

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
  saveBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 16, paddingTop: 20 },
});
