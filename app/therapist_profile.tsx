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
    <LinearGradient colors={['#F8F9FF', '#ECEFF4']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terapist Profili</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileCard}>
          <Image 
            source={therapist.photo} 
            style={styles.profileImage}
          />
          <Text style={styles.name}>{therapist.name}</Text>
          <Text style={styles.title}>{therapist.title}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>500+</Text>
              <Text style={styles.statLabel}>Seans</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4.9</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8+</Text>
              <Text style={styles.statLabel}>Yıl</Text>
            </View>
          </View>

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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    letterSpacing: -0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1F36',
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8ECF4',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#4A5568',
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
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    zIndex: 1,
    minHeight: 56,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});