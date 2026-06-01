import { Feather } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export function UpdateBanner() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const checkAndFetch = async () => {
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch {
      // silently ignore — banner will show next time if check succeeds
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === "active"
        ) {
          checkAndFetch();
        }
        appState.current = nextState;
      },
    );
    return () => subscription.remove();
  }, []);

  // When a check reveals an available update (e.g. from ON_LOAD),
  // ensure it is fully downloaded so the banner can appear.
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable, isUpdatePending]);

  if (!isUpdatePending || dismissed) return null;

  const handleReload = async () => {
    setReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setReloading(false);
      Alert.alert(
        "Couldn't apply update",
        "Please close and reopen the app to install the latest version.",
      );
    }
  };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
      ]}
    >
      <Feather
        name="download-cloud"
        size={18}
        color={colors.primaryForeground}
        style={styles.icon}
      />
      <Text
        style={[styles.message, { color: colors.primaryForeground }]}
        numberOfLines={1}
      >
        Update available — tap to reload
      </Text>

      <Pressable
        onPress={handleReload}
        disabled={reloading}
        accessibilityLabel="Reload now to apply update"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.reloadButton,
          {
            backgroundColor: colors.primaryForeground,
            opacity: pressed || reloading ? 0.8 : 1,
          },
        ]}
      >
        {reloading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.reloadText, { color: colors.primary }]}>
            Reload now
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setDismissed(true)}
        accessibilityLabel="Dismiss update banner"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.dismissButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="x" size={18} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  reloadButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  reloadText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
