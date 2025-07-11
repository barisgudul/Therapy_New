// app/therapy/therapist_profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { commonStyles } from '../../constants/Styles';
import { getUserVault, updateUserVault, VaultData } from '../../utils/eventLogger';

export const therapists = {
  therapist1: {
    id: 'therapist1',
    name: 'Dr. Elif',
    title: 'AI Klinik Psikolog',
    photo: require('../../assets/Terapist_1.jpg'),
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
  therapist2: {
    id: 'therapist2',
    name: 'Dr. Can',
    title: 'AI Psikolojik Danışman',
    photo: require('../../assets/Terapist_2.jpg'),
    specialties: ['Stres yönetimi', 'Kariyer danışmanlığı', 'Motivasyon'],
    approach: 'Genç ruhlu ve motive edici bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    philosophy: 'Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır.',
    style: 'Enerjik ve pozitif yaklaşımım, danışanlarımı cesaretlendirir ve değişim için motive eder.',
    icon: 'heart-circle' as const,
    about: 'Selam! Ben Dr. Can. Hayata pozitif bakışımla, güçlü yönlerini keşfetmen ve hedeflerine ulaşman için seni desteklerim. Seanslarımda motive edici, pratik ve genç bir enerji sunarım. Hedef belirleme ve değişim konularında yanındayım.',
    methods: [
      'Bilişsel Davranışçı Terapi',
      'Çözüm Odaklı Terapi',
      'Motivasyonel Görüşme',
      'Mindfulness Teknikleri'
    ]
  },
  therapist3: {
    id: 'therapist3',
    name: 'Dr. Zeynep',
    title: 'AI Aile Terapisti',
    photo: require('../../assets/Terapist_3.jpg'),
    specialties: ['Aile içi iletişim', 'Çocuk & Ergen', 'Travma sonrası destek'],
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
  const therapist = therapists[id as keyof typeof therapists];

  const selectTherapist = async () => {
    if (!therapist) return;
    try {
        const currentVault = await getUserVault() || {};
        const newVault: VaultData = {
            ...currentVault,
            preferences: {
                ...currentVault.preferences,
                selectedTherapistId: therapist.id
            }
        };
        await updateUserVault(newVault);
        console.log(`✅ [Vault] Terapist seçimi güncellendi: ${therapist.id}`);
        router.push({
            pathname: '/therapy_options',
            params: { therapistId: therapist.id }
        });
    } catch (error) {
        console.error('Terapist seçimi kaydedilemedi:', error);
        // kullanıcıya bir uyarı gösterebilirsiniz.
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

      <Text style={styles.headerTitle}>Terapist Profili</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#E0ECFD', '#F4E6FF']}
            style={styles.profileImageContainer}
          >
            <Image 
              source={therapist.photo} 
              style={styles.profileImage}
            />
          </LinearGradient>
          
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{therapist.name}</Text>
            <Text style={styles.title}>{therapist.title}</Text>
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.sectionTitle}>Uzmanlık Alanları</Text>
            </View>
            <View style={styles.specialtiesContainer}>
              {therapist.specialties.map((specialty, index) => (
                <LinearGradient
                  key={index}
                  colors={['#E0ECFD', '#F4E6FF']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.specialtyTag}
                >
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.sectionTitle}>Hakkında</Text>
            </View>
            <Text style={styles.about}>{therapist.about}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-circle-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.sectionTitle}>Terapi Yaklaşımım</Text>
            </View>
            <Text style={styles.approach}>{therapist.approach}</Text>
          </View>

          <View style={styles.philosophySection}>
            <LinearGradient
              colors={['#E0ECFD', '#F4E6FF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.philosophyGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color={Colors.light.tint} style={styles.quoteIcon} />
              <Text style={styles.philosophy}>{therapist.philosophy}</Text>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={selectTherapist}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#F8FAFF', '#FFFFFF']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.startButtonGradient}
            >
              <View style={styles.startButtonContent}>
                <Ionicons name="arrow-forward-circle" size={24} color={Colors.light.tint} />
                <Text style={styles.startButtonText}>Terapi Seçenekleri</Text>
              </View>
            </LinearGradient>
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
    zIndex: 30,
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
  headerTitle: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.tint,
    letterSpacing: -0.5,
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 120,
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
  profileImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
    marginBottom: 20,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  name: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  section: {
    width: '100%',
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  specialtyText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  about: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  approach: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  philosophySection: {
    width: '100%',
    marginBottom: 32,
  },
  philosophyGradient: {
    padding: 24,
    borderRadius: 16,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  quoteIcon: {
    marginBottom: 12,
  },
  philosophy: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.light.tint,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  startButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,161,217,0.3)',
  },
  startButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
});