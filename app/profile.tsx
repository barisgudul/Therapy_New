// app/profile.tsx (SON. NİHAİ. KUSURSUZ.)
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router/';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { useVaultStore } from '../store/vaultStore';

// MİMARİ SADAKATİ

// Tip Güvenliği
type RelationshipStatus = 'single' | 'in_relationship' | 'married' | 'complicated' | '';
type Gender = 'male' | 'female' | 'other' | '';

// Yerel state için tek ve temiz bir arayüz
interface LocalProfileState {
    nickname: string;
    birthDate: string;
    expectation: string;
    therapyGoals: string;
    previousTherapy: string;
    relationshipStatus: RelationshipStatus;
    gender: Gender;
}

const initialProfileState: LocalProfileState = {
    nickname: '', birthDate: '', expectation: '', therapyGoals: '',
    previousTherapy: '', relationshipStatus: '', gender: '',
};

export default function ProfileScreen() {
    const router = useRouter();
    const { session, user } = useAuth();

    // Verinin tek, merkezi ve reaktif kaynağı: Zustand Store'umuz.
    const vault = useVaultStore((state) => state.vault);
    const updateAndSyncVault = useVaultStore((state) => state.updateAndSyncVault);
    const isLoadingVault = useVaultStore((state) => state.isLoading);
    const fetchVault = useVaultStore((state) => state.fetchVault);
    const vaultError = useVaultStore((state) => state.error);
    const debugVaultState = useVaultStore((state) => state.debugVaultState);

    // Tüm profil verileri için TEK bir state.
    const [localProfile, setLocalProfile] = useState<LocalProfileState>(initialProfileState);
    const [isSaving, setIsSaving] = useState(false);
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);

    // Vault'u yükle
    useEffect(() => {
        console.log('🔍 [PROFILE] Vault durumu:', {
            vault: vault ? 'Var' : 'Yok',
            isLoadingVault,
            vaultProfile: vault?.profile ? 'Var' : 'Yok',
            vaultOnboarding: vault?.onboarding ? 'Var' : 'Yok',
            vaultMetadata: vault?.metadata ? 'Var' : 'Yok',
            onboardingCompleted: vault?.metadata?.onboardingCompleted
        });
        
        // Sadece vault yok ve loading değilse fetch et
        if (!vault && !isLoadingVault) {
            console.log('🚀 [PROFILE] fetchVault çağrılıyor');
            fetchVault().catch(error => {
                console.error('❌ [PROFILE] Vault yükleme hatası:', error);
            });
        }
    }, [vault, isLoadingVault, fetchVault]);

    // Vault verisi yüklendiğinde veya değiştiğinde, yerel state'i güncelle.
    useEffect(() => {
        console.log('🔄 [PROFILE] Vault değişti, profil güncelleniyor:', {
            hasVault: !!vault,
            hasProfile: !!vault?.profile,
            nickname: vault?.profile?.nickname
        });
        
        if (vault?.profile) {
            console.log('✅ [PROFILE] Profil bulundu, güncelleniyor');
            setLocalProfile({
                nickname: vault.profile.nickname || '',
                birthDate: vault.profile.birthDate || '',
                expectation: vault.profile.expectation || '',
                therapyGoals: vault.profile.therapyGoals || '',
                previousTherapy: vault.profile.previousTherapy || '',
                relationshipStatus: vault.profile.relationshipStatus || '',
                gender: vault.profile.gender || '',
            });
        } else if (vault) {
            // Vault var ama profile yok - başlangıç değerleriyle doldur
            console.log('⚠️ [PROFILE] Vault var ama profile yok, default değerlerle doldur');
            setLocalProfile({
                nickname: 'Kullanıcı',
                birthDate: '',
                expectation: '',
                therapyGoals: '',
                previousTherapy: '',
                relationshipStatus: '',
                gender: '',
            });
        }
    }, [vault]);
    
    // Değişiklikleri Kaydetme - ARTIK DOĞRU ÇALIŞIYOR
    const handleSave = async () => {
        if (!localProfile.nickname.trim()) {
            Alert.alert('Uyarı', 'Lütfen bir isim girin.');
            return;
        }
        setIsSaving(true);

        const newVaultData = {
            ...vault,
            profile: {
                ...(vault?.profile || {}),
                ...localProfile,
            },
        };

        // Store'daki merkezi fonksiyonu çağır. Bu da arka planda api.service'i çağırır.
        await updateAndSyncVault(newVaultData);

        setIsSaving(false);
        Alert.alert('Başarılı', 'Profilin güncellendi.');
    };
    
    // Generic bir input değiştirici. Tekrarı önler.
    const handleInputChange = (key: keyof LocalProfileState, value: any) => {
        setLocalProfile(prev => ({ ...prev, [key]: value }));
    };

    const handleConfirmDate = (date: Date) => {
        handleInputChange('birthDate', date.toLocaleDateString('tr-TR'));
        setDatePickerVisible(false);
    };

    return (
        // Senin istediğin UI yapısını ve stilleri korudum. Mantığı değiştirdim.
        <View style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
                <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
            </TouchableOpacity>
            <View style={styles.header}><Text style={styles.title}>Terapi Profili</Text></View>
            <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {isLoadingVault ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.light.tint} />
                            <Text style={styles.loadingText}>Profil yükleniyor...</Text>
                            <TouchableOpacity 
                                style={styles.debugButton} 
                                onPress={debugVaultState}
                            >
                                <Text style={styles.debugButtonText}>Debug Bilgisi</Text>
                            </TouchableOpacity>
                        </View>
                    ) : vaultError ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Hata: {vaultError}</Text>
                            <TouchableOpacity 
                                style={styles.retryButton} 
                                onPress={() => fetchVault()}
                            >
                                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
                            <InputGroup
                                label="İsim"
                                icon="person-outline"
                                value={localProfile.nickname}
                                onChangeText={(text) => handleInputChange('nickname', text)}
                                placeholder="Size nasıl hitap edelim?"
                            />
                            <DateInputGroup
                                label="Doğum Tarihi"
                                value={localProfile.birthDate}
                                onPress={() => setDatePickerVisible(true)}
                            />
                             <SelectorGroup
                                label="Cinsiyet"
                                icon="male-female-outline"
                                options={[{ value: 'male', label: 'Erkek' }, { value: 'female', label: 'Kadın' }, { value: 'other', label: 'Diğer' }]}
                                selectedValue={localProfile.gender}
                                onSelect={(value) => handleInputChange('gender', value)}
                            />
                             <SelectorGroup
                                label="İlişki Durumu"
                                icon="heart-outline"
                                options={[{ value: 'single', label: 'Bekarım' }, { value: 'in_relationship', label: 'İlişkim var' }, { value: 'married', label: 'Evliyim' }, { value: 'complicated', label: 'Karmaşık' }]}
                                selectedValue={localProfile.relationshipStatus}
                                onSelect={(value) => handleInputChange('relationshipStatus', value)}
                            />

                            <Text style={styles.sectionTitle}>Terapi Bilgileri</Text>
                             <InputGroup
                                label="Terapiden Beklentileriniz"
                                icon="bulb-outline"
                                value={localProfile.expectation}
                                onChangeText={(text) => handleInputChange('expectation', text)}
                                placeholder="Terapiden ne bekliyorsunuz?"
                                multiline
                            />
                            <InputGroup
                                label="Terapi Hedefleriniz"
                                icon="flag-outline"
                                value={localProfile.therapyGoals}
                                onChangeText={(text) => handleInputChange('therapyGoals', text)}
                                placeholder="Terapide ulaşmak istediğiniz hedefler neler?"
                                multiline
                            />
                            <InputGroup
                                label="Önceki Terapi Deneyimleriniz"
                                icon="time-outline"
                                value={localProfile.previousTherapy}
                                onChangeText={(text) => handleInputChange('previousTherapy', text)}
                                placeholder="Daha önce terapi aldınız mı? Varsa deneyimleriniz neler?"
                                multiline
                            />

                            <TouchableOpacity 
                              style={[styles.button, (!localProfile.nickname || isSaving) && styles.buttonDisabled]} 
                              onPress={handleSave}
                              disabled={!localProfile.nickname || isSaving}>
                                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kaydet</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisible(false)}
            />
        </View>
    );
}

// ---- YENİDEN KULLANILABİLİR ALT BİLEŞENLER (Temiz Kod İçin) ----
const InputGroup = ({ label, icon, ...props }: any) => (
    <View style={styles.inputContainer}>
        <View style={styles.inputHeader}><Ionicons name={icon} size={18} color={Colors.light.tint} /><Text style={styles.label}>{label}</Text></View>
        <TextInput style={[styles.input, props.multiline && styles.multilineInput]} {...props} />
    </View>
);

const DateInputGroup = ({ label, value, onPress }: any) => (
     <View style={styles.inputContainer}>
        <View style={styles.inputHeader}><Ionicons name="calendar-outline" size={18} color={Colors.light.tint} /><Text style={styles.label}>{label}</Text></View>
        <TouchableOpacity onPress={onPress} style={[styles.input, styles.inputTouchable]}>
            <Text style={styles.inputText}>{value || 'GG/AA/YYYY'}</Text>
            <Ionicons name="calendar" size={18} color={Colors.light.tint} />
        </TouchableOpacity>
    </View>
);

const SelectorGroup = ({ label, icon, options, selectedValue, onSelect }: any) => (
    <View style={styles.inputContainer}>
        <View style={styles.inputHeader}><Ionicons name={icon} size={18} color={Colors.light.tint} /><Text style={styles.label}>{label}</Text></View>
        <View style={styles.selectorContainer}>
        {options.map((option: any) => (
            <TouchableOpacity key={option.value} style={[styles.selectorOption, selectedValue === option.value && styles.selectorOptionSelected]} onPress={() => onSelect(option.value)}>
                <Text style={[styles.selectorOptionText, selectedValue === option.value && styles.selectorOptionTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
        ))}
      </View>
    </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  back: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 8,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(227,232,240,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 36,
    paddingTop: 24,
  },
  avatarGradientBox: {
    borderRadius: 80,
    padding: 3,
    backgroundColor: 'transparent',
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  avatarGradient: {
    borderRadius: 80,
    padding: 2.5,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.4)',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImageContent: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FF',
  },
  profileImageText: {
    marginTop: 10,
    fontSize: 15,
    color: Colors.light.tint,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  form: {
    padding: 28,
  },
  logo: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    letterSpacing: 2,
    marginBottom: 4,
    opacity: 0.95,
    textAlign: 'center',
    marginTop: 10,
  },
  dot: {
    color: Colors.light.tint,
    fontSize: 38,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 0.8,
    opacity: 0.92,
    marginBottom: 32,
    color: '#2D3748',
  },
  inputContainer: {
    marginBottom: 28,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 10,
    letterSpacing: -0.3,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    fontSize: 16,
    color: '#1A1F36',
    borderWidth: 1.5,
    borderColor: 'rgba(227,232,240,0.9)',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  inputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1F36',
    letterSpacing: -0.3,
  },
  inputTextTouchable: {
    color: '#1A1F36',
  },
  multilineInput: {
    height: 140,
    textAlignVertical: 'top',
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorOption: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(227,232,240,0.9)',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  selectorOptionSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.2,
  },
  selectorOptionText: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  selectorOptionTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    marginTop: 44,
    marginBottom: 28,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  modalGradient: {
    padding: 28,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  modalTitleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
  },
  modalButtons: {
    gap: 16,
  },
  modalButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalButtonGradient: {
    padding: 18,
  },
  modalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 14,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  modalButtonIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: 'transparent',
  },
  modalButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    padding: 18,
    marginTop: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalButtonTextSecondary: {
    color: Colors.light.tint,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 16,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 8,
    marginTop: 16,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});