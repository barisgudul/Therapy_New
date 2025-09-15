// app/(guest)/recall.tsx
import { useRouter } from "expo-router";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function Recall() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Az önceki raporuna geri dönelim mi?
      </Text>
      <Text style={styles.subtitle}>
        2 önerin kilitliydi. 1 dakikada kaydedip açıyoruz.
      </Text>
      <Pressable onPress={() => router.replace("/(guest)/softwall")} style={styles.button}>
        <Text style={styles.buttonText}>Devam Et</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
