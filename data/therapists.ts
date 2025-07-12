// data/therapists.ts
import { ImageSourcePropType } from 'react-native';

// Tip Tanımı
export interface TherapistData {
  id: string;
  name: string;
  title: string;
  thumbnail: ImageSourcePropType;
  photo: ImageSourcePropType;
  specialties: string[];
  approach: string;
  philosophy: string;
  style: string;
  icon: 'heart-circle' | 'sunny' | 'rocket' | 'happy' | 'bulb' | 'people' | 'trophy';
  about: string;
  methods: string[];
  imageId: string; // Terapist profilinde ve diğer sayfalarda parametre olarak geçecek benzersiz ID
  persona: string; // Avatar ekranı için kısa açıklama
}

// Terapistlerin merkezi ve tek veri kaynağı
export const ALL_THERAPISTS: TherapistData[] = [
  {
    id: '1',
    name: 'Dr. Elif',
    imageId: 'therapist1',
    thumbnail: require('../assets/Terapist_1.jpg'),
    photo: require('../assets/Terapist_1.jpg'),
    title: 'AI Klinik Psikolog',
    persona: 'Şefkatli ve duygusal, anaç tavırlı',
    icon: 'heart-circle',
    style: 'Empati ve dinleme öncelikli, duygulara odaklanır',
    specialties: ['Duygusal zorluklar', 'Özşefkat', 'İlişki terapisi'],
    philosophy: '"Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır."',
    about: 'Ben Dr. Elif. Duyguların keşfi ve iyileşme yolculuğunda sana şefkatle eşlik ederim. Seanslarda her duygunun güvenle ifade edilebildiği, yargısız bir alan yaratırım. Stres, özgüven ve ilişki sorunlarında destek olurum.',
    approach: 'Şefkatli ve duygusal, anaç tavırlı bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    methods: [
      'Bilişsel Davranışçı Terapi',
      'Çözüm Odaklı Terapi',
      'Motivasyonel Görüşme',
      'Mindfulness Teknikleri'
    ]
  },
  {
    id: '2',
    name: 'Dr. Can',
    imageId: 'therapist2',
    thumbnail: require('../assets/Terapist_2.jpg'),
    photo: require('../assets/Terapist_2.jpg'),
    title: 'AI Psikolojik Danışman',
    persona: 'Pozitif ve motive edici, dinamik',
    icon: 'sunny',
    style: 'Enerjik ve pozitif yaklaşımım, danışanlarımı cesaretlendirir ve değişim için motive eder.',
    specialties: ['Stres yönetimi', 'Kariyer danışmanlığı', 'Motivasyon', 'Performans artırma'],
    philosophy: '"Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır."',
    about: 'Selam! Ben Dr. Can. Hayata pozitif bakışımla, güçlü yönlerini keşfetmen ve hedeflerine ulaşman için seni desteklerim. Seanslarımda motive edici, pratik ve genç bir enerji sunarım. Hedef belirleme ve değişim konularında yanındayım.',
    approach: 'Genç ruhlu ve motive edici bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    methods: [
      'Bilişsel Davranışçı Terapi',
      'Çözüm Odaklı Terapi',
      'Motivasyonel Görüşme',
      'Hedef Belirleme Teknikleri',
      'Performans Koçluğu',
      'Zaman Yönetimi'
    ]
  },
  {
    id: '3',
    name: 'Dr. Lina',
    imageId: 'therapist3',
    thumbnail: require('../assets/Terapist_3.jpg'),
    photo: require('../assets/Terapist_3.jpg'),
    title: 'AI Aile Terapisti',
    persona: 'Huzurlu ve empatik, aile odaklı',
    icon: 'people',
    style: 'Empati ve anlayış üzerine kurulu, ilişkileri güçlendirmeye odaklanır',
    specialties: ['Aile içi iletişim', 'Çocuk & Ergen', 'Travma sonrası destek'],
    philosophy: '"Ailenin kalbi, huzurunuzun aynasıdır."',
    about: 'Ben Dr. Lina. Aile sistemleri üzerine uzmanlaşmış bir AI terapistiyim. İlişkileri anlamlandırmanıza ve ailenizdeki bağı güçlendirmenize rehberlik ederim. Seanslarımda her bireyin sesini duyurabildiği, güvenli bir iletişim alanı oluştururum.',
    approach: 'Dinamik ve ilham verici bir koç olarak, danışanlarımın potansiyellerini ortaya çıkarmalarına ve hedeflerine ulaşmalarına yardımcı oluyorum. Her bireyin içinde keşfedilmeyi bekleyen bir güç olduğuna inanırım.',
    methods: [
      'Sistemik Terapi',
      'Aile Danışmanlığı',
      'İletişim Becerileri Eğitimi',
      'Çocuk ve Ergen Terapisi'
    ]
  },
  {
    id: '4',
    name: 'Coach Can',
    imageId: 'coach1',
    thumbnail: require('../assets/coach-can.jpg'),
    photo: require('../assets/coach-can.jpg'),
    title: 'Yaşam Koçu',
    persona: 'Dinamik ve ilham verici, pratik odaklı',
    icon: 'rocket',
    style: 'Enerjik, motive edici ve hedef odaklı',
    specialties: ['Kişisel gelişim', 'Hedef belirleme', 'Performans artırma'],
    philosophy: '"Başarı, küçük adımların tutarlı bir şekilde atılmasıyla gelir."',
    about: 'Merhaba! Ben Coach Can. Yaşam koçluğu alanında uzmanlaşmış bir AI koçuyum. Dinamik ve ilham verici yaklaşımımla, potansiyelinizi ortaya çıkarmanıza ve hedeflerinize ulaşmanıza rehberlik ediyorum. Kişisel gelişim, kariyer planlaması ve performans artırma konularında yanınızdayım.',
    approach: 'Dinamik ve ilham verici bir koç olarak, danışanlarımın potansiyellerini ortaya çıkarmalarına ve hedeflerine ulaşmalarına yardımcı oluyorum. Her bireyin içinde keşfedilmeyi bekleyen bir güç olduğuna inanırım.',
    methods: [
      'Hedef Belirleme Teknikleri',
      'Performans Koçluğu',
      'Zaman Yönetimi',
      'Motivasyon Stratejileri'
    ]
  }
];

// Yardımcı fonksiyonlar
export const getTherapistById = (id: string): TherapistData | undefined => {
  return ALL_THERAPISTS.find(therapist => therapist.id === id);
};

export const getTherapistByImageId = (imageId: string): TherapistData | undefined => {
  return ALL_THERAPISTS.find(therapist => therapist.imageId === imageId);
}; 