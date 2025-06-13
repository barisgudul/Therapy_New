import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';

export const avatars = [
  {
    id: '1',
    name: 'Dr. Elif',
    imageId: 'therapist1',
    thumbnail: require('../assets/Terapist_1.jpg'),
    title: 'Klinik Psikolog',
    persona: 'Şefkatli ve duygusal, anaç tavırlı',
    style: 'Empati ve dinleme öncelikli, duygulara odaklanır',
    specialty: 'Duygusal zorluklar, özşefkat, ilişki terapisi',
    motto: '"Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır."',
    about: 'Ben Dr. Elif. Duyguların keşfi ve iyileşme yolculuğunda sana şefkatle eşlik ederim. Seanslarda her duygunun güvenle ifade edilebildiği, yargısız bir alan yaratırım. Stres, özgüven ve ilişki sorunlarında destek olurum.'
  },
  {
    id: '3',
    name: 'Dr. Lina',
    imageId: 'therapist3',
    thumbnail: require('../assets/Terapist_3.jpg'),
    title: 'Bilişsel Davranışçı Uzmanı',
    persona: 'Enerjik ve motive edici, genç ruhlu',
    style: 'Cesaretlendirici, pozitif ve umut aşılayan',
    specialty: 'Öz güven, motivasyon, yaşam hedefleri, davranış değişikliği',
    motto: '"Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır."',
    about: 'Selam! Ben Dr. Lina. Hayata pozitif bakışımla, güçlü yönlerini keşfetmen ve hedeflerine ulaşman için seni desteklerim. Seanslarımda motive edici, pratik ve genç bir enerji sunarım. Hedef belirleme ve değişim konularında yanındayım.'
  },
  {
    id: '4',
    name: 'Coach Can',
    imageId: 'coach1',
    thumbnail: require('../assets/coach-can.jpg'),
    title: 'Yaşam Koçu',
    persona: 'Dinamik ve ilham verici, pratik odaklı',
    style: 'Enerjik, motive edici ve hedef odaklı',
    specialty: 'Kişisel gelişim, hedef belirleme, performans artırma',
    motto: '"Başarı, küçük adımların tutarlı bir şekilde atılmasıyla gelir."',
    about: 'Merhaba! Ben Coach Can. Yaşam koçluğu alanında uzmanlaşmış bir AI koçuyum. Dinamik ve ilham verici yaklaşımımla, potansiyelinizi ortaya çıkarmanıza ve hedeflerinize ulaşmanıza rehberlik ediyorum. Kişisel gelişim, kariyer planlaması ve performans artırma konularında yanınızdayım.'
  }
];

export default function AvatarScreen() {
  const router = useRouter();

  const handleSelect = (name: string, imageId: string) => {
    router.push({
      pathname: '/therapist_profile',
      params: { name, imageId },
    });
  };

  const handleExplore = (imageId: string) => {
    router.push(`/therapist_profile?id=${imageId}`);
  };

  return (
    <LinearGradient colors={['#F9FAFB', '#ECEFF4']} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={26} color={Colors.light.tint} />
      </TouchableOpacity>

      <Text style={styles.brand}>
        therapy<Text style={styles.dot}>.</Text>
      </Text>

      <Text style={styles.title}>Terapistini Seç</Text>
      <Text style={styles.subtitle}>Senin için en uygun uzmanı seçerek yolculuğuna başla.</Text>

      <View style={styles.list}>
        {avatars.map((avatar) => (
          <View key={avatar.id} style={styles.card}>
            <Image source={avatar.thumbnail} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{avatar.name}</Text>
              <Text style={styles.titleText}>{avatar.title}</Text>
              <TouchableOpacity onPress={() => handleExplore(avatar.imageId)} style={styles.explore}>
                <Text style={styles.exploreText}>Terapisti İncele</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.light.tint} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    backgroundColor: '#F9FAFB',
  },
  back: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 5,
  },
  brand: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'lowercase',
    marginBottom: 10,
  },
  dot: {
    color: '#5DA1D9',
    fontSize: 26,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1c1e',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6c7580',
    marginBottom: 30,
  },
  list: {
    paddingBottom: 40,
    gap: 28,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    color: '#7a7f87',
    marginBottom: 8,
  },
  explore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exploreText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600',
  },
});