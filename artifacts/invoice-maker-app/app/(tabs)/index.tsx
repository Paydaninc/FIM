import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMe } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { ONBOARDING_KEY } from "@/constants/storage";

function formatDisplay(raw: string): string {
  if (!raw) return "$0";
  const num = parseFloat(raw);
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: raw.includes(".") ? Math.min((raw.split(".")[1] ?? "").length, 2) : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

const PAD = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

export default function ChargeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: me } = useGetMe();
  const [raw, setRaw] = useState("");

  const dollars = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const handleKey = (key: string) => {
    Haptics.selectionAsync();
    if (key === "⌫") {
      setRaw(prev => prev.slice(0, -1));
      return;
    }
    if (key === "." && raw.includes(".")) return;
    if (key === "." && !raw) { setRaw("0."); return; }
    const parts = raw.split(".");
    if (parts[1] !== undefined && parts[1].length >= 2) return;
    if (raw === "0" && key !== ".") { setRaw(key); return; }
    setRaw(prev => prev + key);
  };

  const handleCharge = (mode: "cash" | "card") => {
    if (dollars <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/quick-checkout",
      params: { amount: raw, mode },
    });
  };

  const businessName = me?.businessName || "there";

  // First-time onboarding redirect: if user has no business name and hasn't
  // dismissed onboarding, redirect them to set up their profile.
  useEffect(() => {
    if (!me) return;
    if (me.businessName) return; // already set up
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) {
        router.replace("/onboarding");
      }
    });
  }, [me]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {getGreeting()},
          </Text>
          <Text style={[styles.bizName, { color: colors.foreground }]} numberOfLines={1}>
            {businessName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={[styles.settingsBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="settings" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Amount display */}
      <View style={styles.amountWrap}>
        <Text
          style={[styles.amount, { color: dollars > 0 ? colors.foreground : colors.mutedForeground }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatDisplay(raw)}
        </Text>
        {raw ? (
          <TouchableOpacity onPress={() => setRaw("")} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: colors.mutedForeground }]}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>Enter an amount</Text>
        )}
      </View>

      {/* Numpad */}
      <View style={styles.pad}>
        {PAD.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.key, key === "⌫" && { backgroundColor: colors.muted }]}
            onPress={() => handleKey(key)}
            activeOpacity={0.6}
          >
            {key === "⌫" ? (
              <Feather name="delete" size={22} color={colors.foreground} />
            ) : (
              <Text style={[styles.keyText, { color: colors.foreground }]}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Charge buttons */}
      <View style={[styles.actions, { paddingBottom: bottomPad + 16 }]}>
        <View style={styles.chargeRow}>
          <TouchableOpacity
            style={[
              styles.chargeBtn,
              { backgroundColor: dollars > 0 ? "#16a34a" : colors.muted, flex: 1 },
            ]}
            onPress={() => handleCharge("cash")}
            disabled={dollars <= 0}
            activeOpacity={0.8}
          >
            <Feather name="dollar-sign" size={20} color={dollars > 0 ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.chargeBtnText, { color: dollars > 0 ? "#fff" : colors.mutedForeground }]}>
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chargeBtn,
              { backgroundColor: dollars > 0 ? colors.primary : colors.muted, flex: 1 },
            ]}
            onPress={() => handleCharge("card")}
            disabled={dollars <= 0}
            activeOpacity={0.8}
          >
            <Feather name="credit-card" size={20} color={dollars > 0 ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.chargeBtnText, { color: dollars > 0 ? "#fff" : colors.mutedForeground }]}>
              Card
            </Text>
          </TouchableOpacity>
        </View>

        {/* Invoice / Estimate shortcuts */}
        <View style={styles.shortcutRow}>
          <TouchableOpacity
            style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/new-invoice");
            }}
            activeOpacity={0.75}
          >
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={[styles.shortcutText, { color: colors.foreground }]}>Create Invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/new-estimate");
            }}
            activeOpacity={0.75}
          >
            <Feather name="clipboard" size={16} color={colors.success} />
            <Text style={[styles.shortcutText, { color: colors.foreground }]}>Create Estimate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bizName: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 1, maxWidth: 220 },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  amountWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  amount: {
    fontSize: 72,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  tapHint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 6,
  },
  key: {
    width: "31%",
    aspectRatio: 1.8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  keyText: { fontSize: 26, fontFamily: "Inter_400Regular" },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  chargeRow: {
    flexDirection: "row",
    gap: 10,
  },
  chargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 18,
  },
  chargeBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  shortcutRow: {
    flexDirection: "row",
    gap: 10,
  },
  shortcut: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
  },
  shortcutText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
