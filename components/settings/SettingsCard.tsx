// components/settings/SettingsCard.tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ icon, label, onPress }) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
        <View style={styles.cardIconContainer}>
            <Ionicons name={icon} size={28} color="#1E293B" />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    card: {
        width: "48%", // Izgarada iki sütun oluşturur
        aspectRatio: 1, // Kare olmasını sağlar
        backgroundColor: "#FFFFFF",
        borderRadius: 28,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#C0C8D6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardPressed: { transform: [{ scale: 0.97 }], shadowOpacity: 0.1 },
    cardIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        textAlign: "center",
    },
});
