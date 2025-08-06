// app/(settings)/profile.tsx (YENİLENMİŞ - TASARIM ODAKLI VERSİYON)

// =================================================================
// === 1. ADIM: GEREKLİ İMPORTLAR (Tüm özellikler için) ===
// =================================================================
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSubscription } from '../../hooks/useSubscription';
import { useVaultStore } from '../../store/vaultStore';

// Bu veriler artık merkezi /theme klasöründen gelmeli.
// Şimdilik buraya fallback olarak ekliyoruz.
const AppTheme = {
  colors: {
    background: '#F8F9FF', text: '#1E293B', textSecondary: '#64748B',
    primary: '#5B21B6', primaryLight: '#EDE9FE', white: '#FFFFFF',
    border: '#E2E8F0', error: '#BE123C',
  }
};

// =================================================================
// === 2. ADIM: TİPLER ve YARDIMCILAR ===
// =================================================================

type RelationshipStatus = 'single' | 'in_relationship' | 'married' | 'complicated' | '';

interface LocalProfileState {
  nickname: string;
  birthDateISO: string;
  relationshipStatus: RelationshipStatus;
}

const initialProfileState: LocalProfileState = {
  nickname: '', birthDateISO: '', relationshipStatus: ''
};


// =================================================================
// === 3. ADIM: YENİ NESİL, ŞIK ve ZARİF COMPONENT'LER ===
// =================================================================

// SelectorGroup component'i - İlişki durumu seçimi için
const SelectorGroup: FC<{ label: string; options: { value: RelationshipStatus; label: string }[]; selectedValue: RelationshipStatus; onSelect: (value: RelationshipStatus) => void; }> = memo(function SelectorGroup({ label, options, selectedValue, onSelect }) {
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.selectorContainer}>
                {options.map((option) => (
                    <Pressable
                        key={option.value}
                        style={({ pressed }) => [styles.chip, selectedValue === option.value && styles.chipSelected, pressed && { opacity: 0.8 }]}
                        onPress={() => onSelect(option.value)}
                    >
                        <Text style={[styles.chipText, selectedValue === option.value && styles.chipTextSelected]}>{option.label}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
});

// settings.tsx'teki FeaturedCard'ın bir varyasyonu
const FeaturedCard: FC = memo(function FeaturedCard() {
    const { planName, isPremium } = useSubscription();
    const router = useRouter();

    // PERFORMANS: planMeta objesi sadece planName değiştiğinde yeniden hesaplanır
    const planMeta = useMemo(() => ({
        Premium: { icon: 'diamond', color: '#5B21B6', gradient: ['#F5D0FE', '#E9D5FF'] as const },
        '+Plus': { icon: 'star', color: '#075985', gradient: ['#E0F2FE', '#BAE6FD'] as const },
        Free: { icon: 'person-circle', color: '#475569', gradient: [AppTheme.colors.white, '#F1F5F9'] as const },
    }[planName] || { icon: 'person-circle', color: '#475569', gradient: [AppTheme.colors.white, '#F1F5F9'] as const }
    ), [planName]);
    return (
        <Pressable onPress={() => router.push('/(settings)/subscription')} style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}>
            <LinearGradient colors={planMeta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            <View style={styles.featuredIconContainer}>
                <Ionicons name={planMeta.icon as keyof typeof Ionicons.glyphMap} size={28} color={planMeta.color} />
            </View>
            <View style={styles.featuredTextContainer}>
                <Text style={[styles.featuredLabel, { color: planMeta.color }]}>{planName} Plan</Text>
                <Text style={[styles.featuredSubtitle, { color: planMeta.color }]}>
                    {isPremium ? "Tüm ayrıcalıklara sahipsin" : "Daha fazla özellik için yükselt"}
                </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={planMeta.color} />
        </Pressable>
    );
});


interface InputGroupProps extends TextInputProps { label: string; }
const InputGroup: FC<InputGroupProps> = memo(function InputGroup({ label, ...props }) {
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <TextInput style={styles.input} placeholderTextColor={AppTheme.colors.textSecondary} {...props} />
        </View>
    );
});


const SaveButton: FC<{ onPress: () => void; isSaving: boolean; isDisabled: boolean; }> = memo(function SaveButton({ onPress, isSaving, isDisabled }) {
    return (
        <Pressable onPress={onPress} disabled={isDisabled || isSaving} style={({ pressed }) => [styles.button, (isDisabled || isSaving) && styles.buttonDisabled, pressed && styles.cardPressed]}>
            {isSaving ? <ActivityIndicator color={AppTheme.colors.white} /> : <Text style={styles.buttonText}>Değişiklikleri Kaydet</Text>}
        </Pressable>
    );
});

// =================================================================
// === 4. ADIM: ZARİF ANA COMPONENT ===
// =================================================================

export default function ProfileScreen() {
    const { vault, updateAndSyncVault, fetchVault, isLoading: isLoadingVault, error: vaultError } = useVaultStore();
    const router = useRouter();

    const [localProfile, setLocalProfile] = useState<LocalProfileState>(initialProfileState);
    const [isSaving, setIsSaving] = useState(false);

    // Input handler'ı artık generic ve tip güvenli
    const handleInputChange = <K extends keyof LocalProfileState>(key: K, value: LocalProfileState[K]) => {
        setLocalProfile(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => { if (!vault && !isLoadingVault) fetchVault() }, [vault, isLoadingVault, fetchVault]);
    useEffect(() => {
        if (vault?.profile) {
            const profileData = vault.profile as Record<string, unknown>;
            setLocalProfile({
                nickname: typeof profileData.nickname === 'string' ? profileData.nickname : '',
                birthDateISO: (profileData.birthDateISO || profileData.birthDate || '') as string,
                relationshipStatus: (profileData.relationshipStatus || '') as RelationshipStatus,
            });
        }
    }, [vault]);

    const handleSave = useCallback(async () => {
        if (!localProfile.nickname.trim()) {
            Toast.show({ type: 'error', text1: 'İsim alanı boş bırakılamaz.' });
            return;
        }
        setIsSaving(true);
        Keyboard.dismiss();
        try {
            const newVaultData = { ...vault, profile: { ...(vault?.profile || {}), ...localProfile } };
            await updateAndSyncVault(newVaultData);
            Toast.show({ type: 'success', text1: 'Başarılı!', text2: 'Profilin güncellendi.' });
            // KULLANICI DENEYİMİ: Toast mesajını görmesi için 1 saniye bekle
            setTimeout(() => {
                if (router.canGoBack()) {
                    router.back();
                }
            }, 1000);
        } catch (error) {
            console.error('[PROFILE_SAVE_ERROR]', error);
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Profil güncellenirken bir sorun oluştu.' });
        } finally {
            setIsSaving(false);
        }
    }, [localProfile, vault, updateAndSyncVault, router]);
    
    const renderContent = () => {
        if (isLoadingVault && !vault) {
            return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={AppTheme.colors.primary} />;
        }
        if (vaultError) {
            return <Text style={styles.errorText}>Profil yüklenemedi. Lütfen tekrar deneyin.</Text>;
        }
        return (
            <View>
                <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
                <InputGroup
                    label="İsim"
                    value={localProfile.nickname}
                    onChangeText={(text) => handleInputChange('nickname', text)}
                    placeholder="Size nasıl hitap etmemizi istersiniz?"
                    returnKeyType="done"
                    autoCapitalize="words"
                />

                <SelectorGroup
                    label="İlişki Durumu"
                    options={[
                        { value: 'single', label: 'Bekarım' },
                        { value: 'in_relationship', label: 'İlişkim var' },
                        { value: 'married', label: 'Evliyim' },
                        { value: 'complicated', label: 'Karışık' }
                    ]}
                    selectedValue={localProfile.relationshipStatus}
                    onSelect={(value) => handleInputChange('relationshipStatus', value)}
                />

                <SaveButton
                    onPress={handleSave}
                    isSaving={isSaving}
                    isDisabled={!localProfile.nickname.trim()}
                />
            </View>
        );
    };

    return (
        <LinearGradient colors={['#F9FAFB', '#F8F9FF']} style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* HEADER ŞİMDİ SCROLL'UN DIŞINDA */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={AppTheme.colors.text} />
                    </Pressable>
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Profil & Tercihler</Text>
                    </View>
                    {/* Başlığın sağ tarafını boş bırakarak ortalanmasını sağlıyoruz */}
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView 
                    contentContainerStyle={styles.contentContainer} 
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag">
                    <Text style={styles.pageSubtitle}>Yolculuğunu kendine özel kıl.</Text>
                    
                    {renderContent()}

                    <View style={styles.divider} />

                    <FeaturedCard />

                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

// =================================================================
// === 5. ADIM: YENİ, DAHA ZARİF STİLLER ===
// =================================================================
const styles = StyleSheet.create({
    container: { flex: 1 },
    // Header artık sabit ve scroll'dan bağımsız
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contentContainer: { paddingHorizontal: 24, paddingBottom: 50 },
    backButton: { padding: 8 },
    pageHeader: { flex: 1, alignItems: 'center' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: AppTheme.colors.text },
    pageSubtitle: { fontSize: 18, color: AppTheme.colors.textSecondary, marginBottom: 40, textAlign: 'center' },
    sectionTitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: AppTheme.colors.text, 
        marginBottom: 24, 
        paddingBottom: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: AppTheme.colors.border 
    },
    
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '600', color: AppTheme.colors.textSecondary, marginBottom: 12 },
    input: {
        backgroundColor: AppTheme.colors.white, borderRadius: 16, padding: 20,
        fontSize: 18, color: AppTheme.colors.text, borderWidth: 1,
        borderColor: AppTheme.colors.border, shadowColor: "#A0AEC0",
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
    },

    button: {
        backgroundColor: AppTheme.colors.primary, borderRadius: 20, padding: 20,
        alignItems: 'center', marginTop: 16, shadowColor: AppTheme.colors.primary,
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10
    },
    buttonDisabled: { backgroundColor: '#A5B4FC', shadowOpacity: 0.1 },
    buttonText: { color: AppTheme.colors.white, fontSize: 18, fontWeight: 'bold' },
    cardPressed: { transform: [{ scale: 0.98 }] },
    
    divider: { height: 1, backgroundColor: AppTheme.colors.border, marginVertical: 40 },
    
    featuredCard: {
        width: '100%', borderRadius: 28, padding: 24, flexDirection: 'row',
        alignItems: 'center', overflow: 'hidden', marginBottom: 32,
        shadowColor: "#A0AEC0", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 10
    },
    featuredIconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: AppTheme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    featuredTextContainer: { flex: 1 },
    featuredLabel: { fontSize: 18, fontWeight: 'bold' },
    featuredSubtitle: { fontSize: 14, marginTop: 4, opacity: 0.8 },
    
    errorText: { textAlign: 'center', color: AppTheme.colors.error, fontSize: 16 },

    // Selector (çip) stilleri
    selectorContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
        paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30,
        backgroundColor: AppTheme.colors.white, borderWidth: 1,
        borderColor: AppTheme.colors.border, marginRight: 12, marginBottom: 12
    },
    chipSelected: { backgroundColor: AppTheme.colors.primaryLight, borderColor: AppTheme.colors.primary },
    chipText: { fontSize: 16, fontWeight: '600', color: AppTheme.colors.textSecondary },
    chipTextSelected: { color: AppTheme.colors.primary },
});