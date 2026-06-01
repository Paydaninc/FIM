import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { initials } from "@/utils/format";

interface Customer {
  id: number;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
}

interface Props {
  customer: Customer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: Props) {
  const colors = useColors();
  const displayName = customer.company || customer.name || "Unknown";
  const subName = customer.company && customer.name ? customer.name : customer.email;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {initials(displayName)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
          {subName ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subName}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
});
