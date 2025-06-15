import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

const therapyOptions = [
  {
    id: 'video',
    title: 'Görüntülü Görüşme',
    description: 'Terapistinizle yüz yüze görüşme imkanı. Vücut dilinizi ve duygularınızı daha iyi anlayabilir.',
    icon: 'videocam-outline',
    colors: ['#E0ECFD', '#F4E6FF'] as const,
    route: '/sessions/video_session',
    stats: [
      { value: '98%', label: 'Memnuniyet' },
      { value: '40dk', label: 'Seans' },
      { value: '25K+', label: 'Kullanıcı' }
    ],
    benefits: ['Güvenli Görüşme', 'Profesyonel Destek', 'Yüz Yüze İletişim']
  },
  {
    id: 'voice',
    title: 'Sesli Görüşme',
    description: 'Sesli iletişim ile terapi desteği. Ses tonunuzdan duygularınızı analiz edebilir.',
    icon: 'mic-outline',
    colors: ['#F4E6FF', '#E0ECFD'] as const,
    route: '/sessions/voice_session',
    stats: [
      { value: '95%', label: 'Memnuniyet' },
      { value: '30dk', label: 'Seans' },
      { value: '30K+', label: 'Kullanıcı' }
    ],
    benefits: ['Sesli İletişim', 'Hızlı Destek', 'Pratik Çözüm']
  },
  {
    id: 'text',
    title: 'Yazılı Görüşme',
    description: 'Mesajlaşma ile sürekli destek. Düşüncelerinizi yazıya dökerek daha iyi ifade edebilirsiniz.',
    icon: 'chatbubble-ellipses-outline',
    colors: ['#E0ECFD', '#F4E6FF'] as const,
    route: '/sessions/text_session',
    stats: [
      { value: '99%', label: 'Memnuniyet' },
      { value: '7/24', label: 'Destek' },
      { value: '45K+', label: 'Kullanıcı' }
    ],
    benefits: ['Esnek Zaman', 'Kolay İletişim', 'Hızlı Yanıt']
  }
];

export default function TherapyOptionsScreen() {
  const router = useRouter();
  const { therapistId } = useLocalSearchParams<{ therapistId: string }>();

  const handleOptionPress = (route: string) => {
    router.push({
      pathname: route,
      params: { therapistId }
    });
  };

  return (
    <LinearGradient colors={['#F4F6FF', '#FFFFFF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}} 
      style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={28} color={Colors.light.tint} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terapi Türü</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>Size en uygun terapi yöntemini seçin</Text>
        
        {therapyOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleOptionPress(option.route)}
          >
            <View style={styles.optionContent}>
              <LinearGradient
                colors={option.colors}
                style={styles.iconContainer}
              >
                <Ionicons name={option.icon as any} size={28} color={Colors.light.tint} />
              </LinearGradient>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
                
                <View style={styles.statsContainerClean}>
                  {option.stats.map((stat, idx) => (
                    <View key={idx} style={styles.statItemClean}>
                      <Text style={styles.statValueClean}>{stat.value}</Text>
                      <Text style={styles.statLabelClean}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.benefitsContainer}>
                  {option.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitTag}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.light.tint} style={styles.benefitIcon} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.light.tint} style={styles.arrowIcon} />
            </View>
          </TouchableOpacity>
        ))}
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
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  statsContainerClean: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
  },
  statItemClean: {
    flex: 1,
    alignItems: 'center',
  },
  statValueClean: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
    marginBottom: 2,
  },
  statLabelClean: {
    fontSize: 12,
    color: '#4A5568',
    opacity: 0.8,
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  benefitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  benefitIcon: {
    marginRight: 4,
  },
  benefitText: {
    fontSize: 12,
    color: Colors.light.tint,
  },
});