import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
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
import {
  useGetMe,
  useGetStripeStatus,
  useStartStripeOnboarding,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

import { ONBOARDING_KEY } from "@/constants/storage";

type Step = "business" | "stripe";

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: me } = useGetMe();
  const { data: stripeStatus } = useGetStripeStatus();
  const { mutateAsync: updateSettings, isPending: saving } = useUpdateSettings();
  const { mutateAsync: startStripeOnboarding, isPending: connectingStripe } = useStartStripeOnboarding();

  const [step, setStep] = useState<Step>("business");
  const [businessName, setBusinessName] = useState(me?.businessName ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [address, setAddress] = useState(me?.address ?? "");

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const stripeConnected = stripeStatus?.stripeOnboardingComplete && stripeStatus?.stripeChargesEnabled;

  const handleSaveBusiness = async () => {
    if (!businessName.trim()) {
      Alert.alert("Business name required", "Please enter your business name.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateSettings({
        data: {
          businessName: businessName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: ["getMe"] });
      await qc.invalidateQueries({ queryKey: ["getSettings"] });
      setStep("stripe");
    } catch {
      Alert.alert("Error", "Failed to save business info. Please try again.");
    }
  };

  const handleConnectStripe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await startStripeOnboarding();
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch {
      Alert.alert("Error", "Failed to start Stripe onboarding.");
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "done");
    router.replace("/(tabs)");
  };

  if (step === "stripe") {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: topPad + 48, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="credit-card" size={32} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>Accept card payments?</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Connect a free Stripe account to charge customers by card. If you already have one, you can link it here.
          </Text>

          {stripeConnected ? (
            <View style={[styles.connectedBadge, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.connectedText, { color: colors.success }]}>Stripe is connected</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.stripeBtn, { backgroundColor: "#635bff" }]}
              onPress={handleConnectStripe}
              disabled={connectingStripe}
              activeOpacity={0.85}
            >
              {connectingStripe ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="zap" size={20} color="#fff" />
                  <Text style={styles.stripeBtnText}>Connect Stripe Account</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={[styles.benefitList]}>
            {[
              "Accept Visa, Mastercard, Amex",
              "Instant payment links on every invoice",
              "Payouts to your bank account",
              "No monthly fees — pay per transaction",
            ].map((b) => (
              <View key={b} style={styles.benefitRow}>
                <Feather name="check" size={15} color={colors.success} />
                <Text style={[styles.benefitText, { color: colors.mutedForeground }]}>{b}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {stripeConnected ? "Get Started" : "I'll set this up later"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="briefcase" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Set up your business</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          This appears on your invoices and estimates. You can always change it later in Settings.
        </Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Business Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. John's Plumbing LLC"
              placeholderTextColor={colors.mutedForeground}
              value={businessName}
              onChangeText={setBusinessName}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="(555) 000-0000"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Business Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="you@yourbusiness.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Address</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="123 Main St, City, State 00000"
              placeholderTextColor={colors.mutedForeground}
              value={address}
              onChangeText={setAddress}
              multiline
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSaveBusiness}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleFinish}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 32 },
  form: { gap: 16, marginBottom: 24 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  multiline: { minHeight: 80, paddingTop: 13 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  stripeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  stripeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
  },
  connectedText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  benefitList: { gap: 10, marginBottom: 32 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
});
