// components/settings/FeaturedCard.tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../../hooks/useSubscription';

export const FeaturedCard = () => {
    const { t } = useTranslation();
    const { isPremium, planName, loading } = useSubscription();
    const router = useRouter();

    const cardMeta = isPremium ? {
        icon: 'diamond' as const,
        label: t('settings.featuredCard.premium_label', { planName }),
        subtitle: t('settings.featuredCard.premium_subtitle'),
        gradient: ["#EDE9FE", "#F0F9FF"] as const,
        iconColor: "#5B21B6"
    } : {
        icon: 'sparkles-outline' as const,
        label: t('settings.featuredCard.free_label'),
        subtitle: t('settings.featuredCard.free_subtitle'),
        gradient: ["#EDE9FE", "#F0F9FF"] as const,
        iconColor: "#5B21B6"
    };

    if (loading) {
        return <View style={[styles.featuredCard, styles.skeletonCard]}><ActivityIndicator /></View>;
    }

    return (
        <Pressable
            onPress={() => router.push("/(settings)/subscription")}
            style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}
        >
            <LinearGradient
                colors={cardMeta.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.featuredIconContainer, { backgroundColor: 'rgba(255,255,255,0.8)' }]}>
                <Ionicons name={cardMeta.icon} size={32} color={cardMeta.iconColor} />
            </View>
            <View style={styles.featuredTextContainer}>
                <Text style={[styles.featuredLabel, { color: cardMeta.iconColor }]}>{cardMeta.label}</Text>
                <Text style={[styles.featuredSubtitle, { color: cardMeta.iconColor, opacity: 0.8 }]}>{cardMeta.subtitle}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={cardMeta.iconColor} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    featuredCard: {
        width: "100%",
        backgroundColor: "#F3F4FF",
        borderRadius: 28,
        padding: 24,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        marginBottom: 32,
        shadowColor: "#A0AEC0",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    cardPressed: { transform: [{ scale: 0.97 }], shadowOpacity: 0.1 },
    featuredIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.8)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    featuredTextContainer: { flex: 1 },
    featuredLabel: { fontSize: 18, fontWeight: "bold", color: "#4C1D95" },
    featuredSubtitle: {
        fontSize: 14,
        color: "#6D28D9",
        marginTop: 4,
        opacity: 0.8,
    },
    skeletonCard: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
});
