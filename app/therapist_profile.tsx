import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { commonStyles } from '../constants/Styles';

const therapists = {
  therapist1: {
    id: 'therapist1',
    name: 'Dr. Elif',
    title: 'AI Klinik Psikolog',
    photo: require('../assets/Terapist_1.jpg'),
    specialties: ['Duygusal zorluklar', 'Özşefkat', 'İlişki terapisi'],
    approach: 'Şefkatli ve duygusal, anaç tavırlı bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    philosophy: 'Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır.',
    style: 'Empati ve dinleme öncelikli, duygulara odaklanır',
    icon: 'heart-circle' as const,
    about: 'Ben Dr. Elif. Duyguların keşfi ve iyileşme yolculuğunda sana şefkatle eşlik ederim. Seanslarda her duygunun güvenle ifade edilebildiği, yargısız bir alan yaratırım. Stres, özgüven ve ilişki sorunlarında destek olurum.',
    methods: [
      'Bilişsel Davranışçı Terapi',
      'Çözüm Odaklı Terapi',
      'Motivasyonel Görüşme',
      'Mindfulness Teknikleri'
    ]
  },
  therapist3: {
    id: 'therapist3',
    name: 'Dr. Lina',
    title: 'AI Bilişsel Davranışçı Uzmanı',
    photo: require('../assets/Terapist_3.jpg'),
    specialties: ['Öz güven', 'Motivasyon', 'Yaşam hedefleri'],
    approach: 'Genç ruhlu ve motive edici bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    philosophy: 'Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır.',
    style: 'Enerjik ve pozitif yaklaşımım, danışanlarımı cesaretlendirir ve değişim için motive eder.',
    icon: 'heart-circle' as const,
    about: 'Selam! Ben Dr. Lina. Hayata pozitif bakışımla, güçlü yönlerini keşfetmen ve hedeflerine ulaşman için seni desteklerim. Seanslarımda motive edici, pratik ve genç bir enerji sunarım. Hedef belirleme ve değişim konularında yanındayım.',
    methods: [
      'Bilişsel Davranışçı Terapi',
      'Çözüm Odaklı Terapi',
      'Motivasyonel Görüşme',
      'Mindfulness Teknikleri'
    ]
  },
  coach1: {
    id: 'coach1',
    name: 'Coach Can',
    title: 'AI Yaşam Koçu',
    photo: require('../assets/coach-can.jpg'),
    specialties: ['Kişisel gelişim', 'Hedef belirleme', 'Performans artırma'],
    approach: 'Dinamik ve ilham verici bir koç olarak, danışanlarımın potansiyellerini ortaya çıkarmalarına ve hedeflerine ulaşmalarına yardımcı oluyorum. Her bireyin içinde keşfedilmeyi bekleyen bir güç olduğuna inanırım.',
    philosophy: 'Başarı, küçük adımların tutarlı bir şekilde atılmasıyla gelir.',
    style: 'Enerjik ve pratik yaklaşımım, danışanlarımı harekete geçirir ve hedeflerine ulaşmalarını sağlar.',
    icon: 'trophy' as const,
    about: 'Merhaba! Ben Coach Can. Yaşam koçluğu alanında uzmanlaşmış bir AI koçuyum. Dinamik ve ilham verici yaklaşımımla, potansiyelinizi ortaya çıkarmanıza ve hedeflerinize ulaşmanıza rehberlik ediyorum. Kişisel gelişim, kariyer planlaması ve performans artırma konularında yanınızdayım.',
    methods: [
      'Hedef Belirleme Teknikleri',
      'Performans Koçluğu',
      'Zaman Yönetimi',
      'Motivasyon Stratejileri'
    ]
  }
};

export default function TherapistProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const therapist = therapists[id as keyof typeof therapists];

  useEffect(() => {
    loadSelectedTherapist();
  }, []);

  const loadSelectedTherapist = async () => {
    try {
      const therapist = await AsyncStorage.getItem('selectedTherapist');
      setSelectedTherapist(therapist);
    } catch (error) {
      console.error('Terapist bilgisi yüklenemedi:', error);
    }
  };

  const selectTherapist = async () => {
    if (!therapist) return;
    try {
      await AsyncStorage.setItem('selectedTherapist', therapist.id);
      setSelectedTherapist(therapist.id);
      console.log('Terapist seçildi, yönlendiriliyor:', therapist.id);
      router.push({
        pathname: '/therapy_options',
        params: { therapistId: therapist.id }
      });
    } catch (error) {
      console.error('Terapist seçilemedi:', error);
    }
  };

  if (!therapist) {
    return (
      <LinearGradient colors={['#FFFFFF', '#F4F7FC']} style={commonStyles.container}>
        <Text>Terapist bulunamadı</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terapist Profili</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <Image 
            source={therapist.photo} 
            style={styles.profileImage}
          />
          <Text style={styles.name}>{therapist.name}</Text>
          <Text style={styles.title}>{therapist.title}</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uzmanlık Alanları</Text>
            <View style={styles.specialtiesContainer}>
              {therapist.specialties.map((specialty, index) => (
                <LinearGradient
                  key={index}
                  colors={['#E0ECFD', '#F4E6FF']}
                  style={styles.specialtyTag}
                >
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.about}>{therapist.about}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terapi Yaklaşımım</Text>
            <Text style={styles.approach}>{therapist.approach}</Text>
          </View>

          <View style={styles.philosophySection}>
            <Ionicons name="chatbubble-ellipses" size={20} color={Colors.light.tint} style={styles.quoteIcon} />
            <Text style={styles.philosophy}>{therapist.philosophy}</Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={selectTherapist}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>Terapi Seçenekleri</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.15)',
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 16,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  specialtyText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  about: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  approach: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  philosophySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  quoteIcon: {
    marginRight: 12,
  },
  philosophy: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.light.tint,
    flex: 1,
  },
  startButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
    width: '100%',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
});