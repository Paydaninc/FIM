import { useAuth, useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMe, useGetStripeStatus } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { initials } from "@/utils/format";

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: me } = useGetMe();
  const { data: stripeStatus } = useGetStripeStatus();

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  };

  const businessName = me?.businessName || user?.fullName || "Your Business";
  const email = me?.email || user?.primaryEmailAddress?.emailAddress || "";

  const stripeConnected = stripeStatus?.connected && stripeStatus?.chargesEnabled;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>More</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {initials(businessName)}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{businessName}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{email}</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Tools</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem
          icon="zap"
          label="Quick Checkout"
          sublabel="Collect payment without an invoice"
          colors={colors}
          iconColor={colors.primary}
          onPress={() => router.push("/quick-checkout")}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem
          icon="settings"
          label="Business Settings"
          colors={colors}
          onPress={() => router.push("/settings")}
        />
        <Divider colors={colors} />
        <MenuItem
          icon={stripeConnected ? "check-circle" : "credit-card"}
          label={stripeConnected ? "Stripe Connected" : "Connect Stripe"}
          sublabel={stripeConnected ? "Payments enabled" : "Accept online payments"}
          colors={colors}
          iconColor={stripeConnected ? colors.success : colors.primary}
          onPress={() => router.push("/settings")}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Support</Text>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MenuItem
          icon="help-circle"
          label="Help & Support"
          colors={colors}
          onPress={() => {}}
        />
      </View>

      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.destructive + "40" }]}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  colors,
  onPress,
  iconColor,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  colors: any;
  onPress: () => void;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: (iconColor ?? colors.primary) + "15" }]}>
        <Feather name={icon as any} size={18} color={iconColor ?? colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.menuSublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  menuSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: 1, marginLeft: 62 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 8,
  },
  signOutText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
