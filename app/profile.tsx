// app/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
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
import { getUserVault, updateUserVault, VaultData } from '../services/vault.service';

type RelationshipStatus = 'single' | 'in_relationship' | 'married' | 'complicated' | '';
type Gender = 'male' | 'female' | 'other' | '';


export default function ProfileScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [expectation, setExpectation] = useState('');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [therapyGoals, setTherapyGoals] = useState('');
  const [previousTherapy, setPreviousTherapy] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('');
  const [gender, setGender] = useState<Gender>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  // State'lerin yanına vault ekle
  const [vault, setVault] = useState<VaultData | null>(null);

  const relationshipOptions = [
    { value: 'single', label: 'Bekarım' },
    { value: 'in_relationship', label: 'İlişkim var' },
    { value: 'married', label: 'Evliyim' },
    { value: 'complicated', label: 'Karmaşık' },
  ];

  const genderOptions = [
    { value: 'male', label: 'Erkek' },
    { value: 'female', label: 'Kadın' },
    { value: 'other', label: 'Diğer' },
  ];


  useEffect(() => {
    loadProfile();
  }, []);

  // YENİ loadProfile FONKSİYONU
  const loadProfile = async () => {
    try {
      const userVault = await getUserVault(); // Merkezi hafızadan oku
      if (userVault) {
        setVault(userVault); // İlerde lazım olur diye tüm vault'u sakla
        const profileData = userVault.profile || {}; // Vault içinde profile objesi yoksa diye kontrol
        setNickname(profileData.nickname || '');
        setBirthDate(profileData.birthDate || '');
        setExpectation(profileData.expectation || '');
        setTherapyGoals(profileData.therapyGoals || '');
        setPreviousTherapy(profileData.previousTherapy || '');
        setRelationshipStatus(profileData.relationshipStatus || '');
        setGender(profileData.gender || '');
        setProfileImage(profileData.profileImage || null);
      }
    } catch (error) {
      console.error('Vault profili yüklenemedi:', error);
    }
  };

  // YENİ handleSave FONKSİYONU
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir isim girin.');
      return;
    }
    try {
      setIsLoading(true);
      const goalsArray = therapyGoals.split(',').map(g => g.trim()).filter(Boolean);
      // Güncel Vault'u temel alarak yeni bir vault nesnesi oluştur.
      const newVault: VaultData = {
        ...vault, // Önceki Vault verilerini koru (traits, memories vs.)
        profile: { // Profil verilerini bu alana yaz
          nickname,
          birthDate,
          expectation,
          therapyGoals,
          previousTherapy,
          relationshipStatus,
          gender,
          profileImage,
          goals: goalsArray,
          interests: [], // Bu alanı da korumuş olduk
        }
      };
      await updateUserVault(newVault); // Tek fonksiyonla sunucuya gönder!
      Alert.alert('Başarılı', 'Profilin güncellendi.', [
        { text: 'Tamam', onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const showDatePicker = () => {
    setDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleConfirmDate = (date: Date) => {
    const today = new Date();
    if (date > today) {
      Alert.alert('Hata', 'Gelecek bir tarih seçemezsiniz.');
      return;
    }
    const formattedDate = date.toLocaleDateString('tr-TR');
    setBirthDate(formattedDate);
    hideDatePicker();
  };

  const showImagePickerOptions = () => {
    setShowImagePickerModal(true);
  };

  const pickImage = async () => {
    try {
      setShowImagePickerModal(false);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setPermissionMessage('Profil fotoğrafı çekebilmek için kamera izni gereklidir.');
        setShowPermissionModal(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf çekilirken hata oluştu:', error);
      setPermissionMessage('Fotoğraf çekilirken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowPermissionModal(true);
    }
  };

  const pickFromGallery = async () => {
    try {
      setShowImagePickerModal(false);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPermissionMessage('Galeriden fotoğraf seçebilmek için galeri izni gereklidir.');
        setShowPermissionModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Galeriden fotoğraf seçilirken hata oluştu:', error);
      setPermissionMessage('Galeriden fotoğraf seçilirken bir hata oluştu. Lütfen tekrar deneyin.');
      setShowPermissionModal(true);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    icon: string,
    multiline = false,
    onPress?: () => void
  ) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputHeader}>
        <Ionicons name={icon as any} size={18} color={Colors.light.tint} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <TouchableOpacity 
        onPress={onPress}
        style={[styles.input, onPress && styles.inputTouchable]}
        disabled={!onPress}
      >
        <TextInput
          style={[styles.inputText, onPress && styles.inputTextTouchable]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={!onPress}
        />
        {onPress && (
          <Ionicons name="calendar" size={18} color={Colors.light.tint} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSelector = (
    label: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: any) => void,
    icon: string
  ) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputHeader}>
        <Ionicons name={icon as any} size={18} color={Colors.light.tint} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.selectorContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorOption,
              selectedValue === option.value && styles.selectorOptionSelected
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.selectorOptionText,
              selectedValue === option.value && styles.selectorOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 1}} 
        style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Terapi Profili</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageContainer}>
            <View style={styles.avatarGradientBox}>
              <LinearGradient colors={[Colors.light.tint, 'rgba(255,255,255,0.9)']} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 1}} 
                  style={styles.avatarGradient}>
                <TouchableOpacity 
                  style={styles.profileImage}
                  onPress={showImagePickerOptions}
                >
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImageContent} />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={36} color={Colors.light.tint} />
                      <Text style={styles.profileImageText}>Fotoğraf Ekle</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.logo}>therapy<Text style={styles.dot}>.</Text></Text>
            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
            {renderInput('Terapide Kullanmak İstediğiniz İsim', nickname, setNickname, 'Size nasıl hitap etmemi istersiniz?', 'person-outline')}
            {renderInput(
              'Doğum Tarihi',
              birthDate,
              setBirthDate,
              'GG/AA/YYYY',
              'calendar-outline',
              false,
              showDatePicker
            )}
            {renderSelector('Cinsiyet', genderOptions, gender, setGender, 'male-outline')}
            {renderSelector('İlişki Durumu', relationshipOptions, relationshipStatus, setRelationshipStatus, 'heart-outline')}

            <Text style={styles.sectionTitle}>Terapi Bilgileri</Text>
            {renderInput(
              'Terapiden Beklentileriniz',
              expectation,
              setExpectation,
              'Terapiden ne bekliyorsunuz?',
              'heart-outline',
              true
            )}
            {renderInput(
              'Terapi Hedefleriniz',
              therapyGoals,
              setTherapyGoals,
              'Terapide ulaşmak istediğiniz hedefler neler?',
              'flag-outline',
              true
            )}
            {renderInput(
              'Önceki Terapi Deneyimleriniz',
              previousTherapy,
              setPreviousTherapy,
              'Daha önce terapi aldınız mı? Varsa deneyimleriniz neler?',
              'time-outline',
              true
            )}

            <TouchableOpacity 
              style={[styles.button, !nickname && styles.buttonDisabled]} 
              onPress={handleSave}
              disabled={!nickname}
            >
              <Text style={styles.buttonText}>
                {nickname ? 'Kaydet' : 'İsim Girin'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
        maximumDate={new Date()}
        locale="tr"
        cancelTextIOS="İptal"
        confirmTextIOS="Tamam"
      />

      <Modal
        visible={showImagePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.logo}>therapy<Text style={styles.dot}>.</Text></Text>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Profil Fotoğrafı</Text>
                  <Text style={styles.modalSubtitle}>Profil fotoğrafınızı nasıl eklemek istersiniz?</Text>
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonPrimary]} 
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.light.tint, Colors.light.tint]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.modalButtonGradient}
                  >
                    <View style={styles.modalButtonContent}>
                      <View style={styles.modalButtonIconContainer}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.modalButtonIconGradient}
                        >
                          <Ionicons name="camera" size={24} color="#fff" />
                        </LinearGradient>
                      </View>
                      <Text style={styles.modalButtonText}>Fotoğraf Çek</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonPrimary]} 
                  onPress={pickFromGallery}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[Colors.light.tint, Colors.light.tint]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.modalButtonGradient}
                  >
                    <View style={styles.modalButtonContent}>
                      <View style={styles.modalButtonIconContainer}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.modalButtonIconGradient}
                        >
                          <Ionicons name="images" size={24} color="#fff" />
                        </LinearGradient>
                      </View>
                      <Text style={styles.modalButtonText}>Galeriden Seç</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonSecondary]} 
                  onPress={() => setShowImagePickerModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>İptal</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bilgi</Text>
            <Text style={styles.modalSubtitle}>{permissionMessage}</Text>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonPrimary]} 
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={styles.modalButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

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
});