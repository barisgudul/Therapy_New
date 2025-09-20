// components/dream/CrossConnectionsCard.tsx

import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COSMIC_COLORS } from "../../constants/Colors";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
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
                <Text style={styles.cardTitle}>{t('dream.components.cross.title')}</Text>
            </View>

            <View style={styles.connectionsContainer}>
                {connections.map((item, index) => (
                    <View key={index} style={styles.connectionItem}>
                        {/* 🔥🔥🔥 TEK DEĞİŞİKLİK BURADA 🔥🔥🔥 */}
                        <View style={styles.connectionHeader}>
                            <Ionicons
                                name="link-outline"
                                size={20}
                                color={COSMIC_COLORS.accent}
                                style={styles.connectionIcon}
                            />
                            <Text style={styles.connectionText}>
                                {item.connection}
                            </Text>
                        </View>
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
        gap: 24,
    },
    connectionItem: {
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: COSMIC_COLORS.cardBorder,
    },
    // 🔥 YENİ EKLENEN STİLLER
    connectionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    connectionIcon: {
        marginRight: 10,
        marginTop: 3,
    },
    // 🔥 DEĞİŞEN STİLLER
    connectionText: {
        flex: 1, // Uzun metinler için eklendi
        color: COSMIC_COLORS.textPrimary,
        fontSize: 17,
        fontWeight: "500",
        lineHeight: 25,
    },
    evidenceText: {
        color: COSMIC_COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 23,
        fontStyle: "italic",
        paddingLeft: 30, // İkonla hizalamak için eklendi
    },
});
