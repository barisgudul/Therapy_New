// components/dream/CrossConnectionsCard.tsx

import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COSMIC_COLORS } from "../../constants/Colors";

// Component'in dışarıdan alacağı veri tipleri
interface Connection {
    connection: string;
    evidence: string;
}

interface CrossConnectionsCardProps {
    connections?: Connection[];
}

export default function CrossConnectionsCard(
    { connections }: CrossConnectionsCardProps,
) {
    // Eğer bağlantı yoksa, bu kartı hiç gösterme.
    if (!connections || connections.length === 0) {
        return null;
    }

    return (
        <MotiView
            style={styles.card}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 400 }}
        >
            <View style={styles.cardHeader}>
                <Ionicons
                    name="git-network-outline"
                    size={24}
                    color={COSMIC_COLORS.accent}
                />
                <Text style={styles.cardTitle}>Geçmişten Gelen Yankılar</Text>
            </View>

            <View style={styles.connectionsContainer}>
                {connections.map((item, index) => (
                    <View key={index} style={styles.connectionItem}>
                        <Text style={styles.connectionText}>
                            🔗 {item.connection}
                        </Text>
                        <Text style={styles.evidenceText}>{item.evidence}</Text>
                    </View>
                ))}
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COSMIC_COLORS.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COSMIC_COLORS.cardBorder,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    cardTitle: {
        color: COSMIC_COLORS.textPrimary,
        fontSize: 20,
        fontWeight: "600",
        marginLeft: 12,
    },
    connectionsContainer: {
        gap: 24, // Her bağlantı arasına boşluk koy
    },
    connectionItem: {
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: COSMIC_COLORS.cardBorder,
    },
    connectionText: {
        color: COSMIC_COLORS.textPrimary,
        fontSize: 17,
        fontWeight: "500",
        lineHeight: 25,
        marginBottom: 8,
    },
    evidenceText: {
        color: COSMIC_COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 23,
        fontStyle: "italic",
    },
});
