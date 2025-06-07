import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { checkAndUpdateBadges } from '../utils/badges';
import { getProfileData, isProfileComplete } from '../utils/helpers';

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

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNickname(parsed.nickname || '');
        setBirthDate(parsed.birthDate || '');
        setExpectation(parsed.expectation || '');
        setTherapyGoals(parsed.therapyGoals || '');
        setPreviousTherapy(parsed.previousTherapy || '');
        setRelationshipStatus(parsed.relationshipStatus || '');
        setGender(parsed.gender || '');
        setProfileImage(parsed.profileImage || null);
      }
    } catch (error) {
      console.error('Profil yüklenemedi:', error);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir isim girin.');
      return;
    }

    try {
      setIsLoading(true);
      
      const data = {
        nickname,
        birthDate,
        expectation,
        therapyGoals,
        previousTherapy,
        relationshipStatus,
        gender,
        orientation,
        profileImage
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(data));

      // Rozetleri kontrol et ve güncelle
      const profileData = await getProfileData(); // Profil verilerini al
      
      await checkAndUpdateBadges('profile', {
        hasPhoto: !!profileData.profileImage,
        hasBio: !!(profileData.expectation || profileData.therapyGoals || profileData.previousTherapy),
        hasGoals: !!profileData.therapyGoals,
        profileComplete: isProfileComplete(profileData),
        customizedProfile: !!profileData.profileImage || !!profileData.nickname || !!profileData.birthDate
      });

      Alert.alert('Başarılı', 'Profil kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Profil kaydedilemedi.');
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera izni gereklidir.');
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
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Fotoğraf Çek',
      'Profil fotoğrafı için yeni bir fotoğraf çekin',
      [
        {
          text: 'Fotoğraf Çek',
          onPress: () => pickImage(),
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
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
    <LinearGradient colors={['#F8F9FF', '#ECEFF4']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.title}>Terapi Profili</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.profileImageContainer}>
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
          </View>

          <View style={styles.form}>
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
                {nickname ? 'Terapiye Başla' : 'İsim Girin'}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.4,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: 6,
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginTop: 28,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 6,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#1A1F36',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1F36',
    letterSpacing: -0.2,
  },
  inputTextTouchable: {
    color: '#1A1F36',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectorOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8ECF4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 2,
    elevation: 1,
  },
  selectorOptionSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.08,
  },
  selectorOptionText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  selectorOptionTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
    shadowOpacity: 0.04,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});