// app/agentic-test.tsx
/*
🚨 FAZ 0: STABİLİZASYON - BU SAYFA GEÇİCİ OLARAK DEVRE DIŞI
Ana beyin sistemi stabilizasyon için durduruldu
Gemini 2.5 Pro anlaşması: Maliyet optimizasyonu ve kararlılık öncelik
*/

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AgenticTestScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.warningContainer}>
                <Text style={styles.warningTitle}>🚨 FAZ 0: STABİLİZASYON</Text>

                <Text style={styles.warningText}>
                    Agentic Core sistemi maliyet optimizasyonu için geçici
                    olarak devre dışı bırakılmıştır.
                </Text>

                <Text style={styles.warningText}>
                    📋 Şu anda: Geleneksel handler sistemi aktif
                </Text>

                <Text style={styles.warningText}>
                    🎯 FAZ 1: Stratejik Sorgu Yönlendirici ile geri gelecektir
                </Text>

                <Text style={styles.warningText}>
                    🚀 FAZ 2: Kontrollü hibrit pipeline sistemi kurulacak
                </Text>

                <View style={styles.statusContainer}>
                    <Text style={styles.statusTitle}>💰 TASARRUF DURUMU</Text>
                    <Text style={styles.statusText}>
                        • Ana beyin çağrıları: ❌ DURDURULDU
                    </Text>
                    <Text style={styles.statusText}>
                        • DNA işleme: ❌ DURDURULDU
                    </Text>
                    <Text style={styles.statusText}>
                        • Hafıza embedding: ❌ DURDURULDU
                    </Text>
                    <Text style={styles.statusText}>
                        • Geleneksel handler: ✅ AKTİF
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: 20,
    },
    warningContainer: {
        backgroundColor: "#FFF3CD",
        borderRadius: 12,
        padding: 24,
        borderWidth: 2,
        borderColor: "#F59E0B",
        alignItems: "center",
    },
    warningTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#D97706",
        marginBottom: 16,
        textAlign: "center",
    },
    warningText: {
        fontSize: 16,
        color: "#92400E",
        marginBottom: 12,
        textAlign: "center",
        lineHeight: 24,
    },
    statusContainer: {
        marginTop: 24,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        padding: 16,
        width: "100%",
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#374151",
        marginBottom: 12,
        textAlign: "center",
    },
    statusText: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 6,
        fontFamily: "monospace",
    },
});
