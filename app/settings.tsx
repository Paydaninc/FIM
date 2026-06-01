import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import {
  useGetMe,
  useGetSettings,
  useGetStripeStatus,
  useStartStripeOnboarding,
  useUpdateSettings,
  useListAgreements,
  useCreateAgreement,
  useUpdateAgreement,
  useDeleteAgreement,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/clerk-expo";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { user } = useUser();
  const { data: settings, isLoading } = useGetSettings();
  const { data: stripeStatus } = useGetStripeStatus();
  const { data: agreements } = useListAgreements();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings();
  const { mutateAsync: startStripeOnboarding, isPending: connectingStripe } = useStartStripeOnboarding();
  const { mutateAsync: createAgreement, isPending: creatingAgreement } = useCreateAgreement();
  const { mutateAsync: deleteAgreement } = useDeleteAgreement();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [newAgreementName, setNewAgreementName] = useState("");
  const [newAgreementContent, setNewAgreementContent] = useState("");
  const [showNewAgreement, setShowNewAgreement] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwPending, setPwPending] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName ?? "");
      setPhone(settings.phone ?? "");
      setAddress(settings.address ?? "");
      setEmail(settings.email ?? "");
      setDefaultNotes(settings.defaultNotes ?? "");
    }
  }, [settings]);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const handleSave = async () => {
    try {
      await updateSettings({
        data: {
          businessName: businessName || undefined,
          phone: phone || undefined,
          address: address || undefined,
          email: email || undefined,
          defaultNotes: defaultNotes || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["getSettings"] });
      Alert.alert("Saved", "Settings updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  const handleChangePassword = async () => {
    if (!pwNext || pwNext !== pwConfirm) {
      Alert.alert("Error", "New passwords don't match.");
      return;
    }
    if (pwNext.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    if (!user) return;
    setPwPending(true);
    try {
      await (user as any).updatePassword({ currentPassword: pwCurrent, newPassword: pwNext });
      setPwCurrent(""); setPwNext(""); setPwConfirm("");
      Alert.alert("Success", "Password updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err?.errors?.[0]?.longMessage || err?.message || "Failed to update password.");
    } finally {
      setPwPending(false);
    }
  };

  const handleAddAgreement = async () => {
    if (!newAgreementName.trim() || !newAgreementContent.trim()) return;
    try {
      await createAgreement({ data: { name: newAgreementName.trim(), content: newAgreementContent.trim() } });
      await qc.invalidateQueries({ queryKey: ["listAgreements"] });
      setNewAgreementName("");
      setNewAgreementContent("");
      setShowNewAgreement(false);
      Alert.alert("Saved", "Agreement saved.");
    } catch {
      Alert.alert("Error", "Failed to save agreement.");
    }
  };

  const handleDeleteAgreement = (id: number, name: string) => {
    Alert.alert("Delete Agreement", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteAgreement({ id });
            await qc.invalidateQueries({ queryKey: ["listAgreements"] });
          } catch {
            Alert.alert("Error", "Failed to delete agreement.");
          }
        }
      }
    ]);
  };

  const handleConnectStripe = async () => {
    try {
      const result = await startStripeOnboarding();
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch {
      Alert.alert("Error", "Failed to start Stripe onboarding.");
    }
  };

  const stripeConnected = stripeStatus?.stripeOnboardingComplete && stripeStatus?.stripeChargesEnabled;

  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Business Info</Text>

        <Field label="Business Name" value={businessName} onChangeText={setBusinessName} placeholder="My Business LLC" colors={colors} />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="hello@mybusiness.com" colors={colors} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" colors={colors} keyboardType="phone-pad" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Main St, City, State" colors={colors} multiline />
        <Field label="Default Notes" value={defaultNotes} onChangeText={setDefaultNotes} placeholder="Thank you for your business!" colors={colors} multiline />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Payments</Text>

        <View style={[styles.stripeCard, { backgroundColor: stripeConnected ? colors.success + "10" : colors.card, borderColor: stripeConnected ? colors.success + "40" : colors.border }]}>
          <View style={styles.stripeRow}>
            <View style={[styles.stripeIcon, { backgroundColor: stripeConnected ? colors.success + "20" : colors.muted }]}>
              <Feather
                name={stripeConnected ? "check-circle" : "credit-card"}
                size={22}
                color={stripeConnected ? colors.success : colors.mutedForeground}
              />
            </View>
            <View style={styles.stripeInfo}>
              <Text style={[styles.stripeTitle, { color: colors.foreground }]}>
                {stripeConnected ? "Stripe Connected" : "Connect Stripe"}
              </Text>
              <Text style={[styles.stripeSub, { color: colors.mutedForeground }]}>
                {stripeConnected
                  ? "You can accept card payments and payment links"
                  : "Accept card payments, Apple Pay & Google Pay"}
              </Text>
            </View>
          </View>
          {!stripeConnected && (
            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: colors.primary }]}
              onPress={handleConnectStripe}
              disabled={connectingStripe}
              activeOpacity={0.8}
            >
              {connectingStripe ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.connectBtnText}>Connect Stripe Account</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Security / Password change */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>Security</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, marginBottom: 10 }]}
            placeholder="Current password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={pwCurrent}
            onChangeText={setPwCurrent}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, marginBottom: 10 }]}
            placeholder="New password (min 8 chars)"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={pwNext}
            onChangeText={setPwNext}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, marginBottom: 12 }]}
            placeholder="Confirm new password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={pwConfirm}
            onChangeText={setPwConfirm}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: !pwCurrent || !pwNext || !pwConfirm ? colors.muted : colors.foreground, opacity: pwPending ? 0.7 : 1 }]}
            onPress={handleChangePassword}
            disabled={!pwCurrent || !pwNext || !pwConfirm || pwPending}
            activeOpacity={0.8}
          >
            {pwPending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.connectBtnText, { color: colors.background }]}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>Agreements</Text>
        <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
          Attach a contract to invoices — customers must e-sign before paying.
        </Text>

        {(agreements || []).map((a: any) => (
          <View key={a.id} style={[styles.agreementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.agreementHeader}>
              <Text style={[styles.agreementName, { color: colors.foreground }]} numberOfLines={1}>{a.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteAgreement(a.id, a.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.agreementPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{a.content}</Text>
          </View>
        ))}

        {showNewAgreement ? (
          <View style={[styles.agreementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[fieldStyles.label, { color: colors.foreground }]}>Name</Text>
            <TextInput
              style={[fieldStyles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, marginBottom: 12 }]}
              placeholder="e.g. Standard Service Contract"
              placeholderTextColor={colors.mutedForeground}
              value={newAgreementName}
              onChangeText={setNewAgreementName}
            />
            <Text style={[fieldStyles.label, { color: colors.foreground }]}>Contract Text</Text>
            <TextInput
              style={[fieldStyles.input, fieldStyles.multiline, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, minHeight: 120, marginBottom: 12 }]}
              placeholder="Paste your contract text here..."
              placeholderTextColor={colors.mutedForeground}
              value={newAgreementContent}
              onChangeText={setNewAgreementContent}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.agreementBtns}>
              <TouchableOpacity
                style={[styles.saveBtnSmall, { backgroundColor: colors.primary }]}
                onPress={handleAddAgreement}
                disabled={creatingAgreement || !newAgreementName.trim() || !newAgreementContent.trim()}
              >
                {creatingAgreement ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnSmallText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtnSmall, { borderColor: colors.border }]}
                onPress={() => { setShowNewAgreement(false); setNewAgreementName(""); setNewAgreementContent(""); }}
              >
                <Text style={[styles.cancelBtnSmallText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addAgreementBtn, { borderColor: colors.border }]}
            onPress={() => setShowNewAgreement(true)}
          >
            <Text style={[styles.addAgreementText, { color: colors.primary }]}>+ Add Agreement</Text>
          </TouchableOpacity>
        )}
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
        autoCapitalize={autoCapitalize ?? "sentences"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
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
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    marginLeft: 2,
  },
  agreementCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  agreementHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  agreementName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  agreementPreview: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  deleteText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  agreementBtns: { flexDirection: "row", gap: 10 },
  saveBtnSmall: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  saveBtnSmallText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cancelBtnSmall: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  cancelBtnSmallText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  addAgreementBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  addAgreementText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stripeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  stripeRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  stripeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stripeInfo: { flex: 1 },
  stripeTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  stripeSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  connectBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  connectBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
