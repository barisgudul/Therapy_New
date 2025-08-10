// data/therapists.data.ts

import { TherapistCoreData } from "./therapists.types.ts";

// BU DOSYADA ARTIK DIŞARIYA HİÇBİR BAĞIMLILIK YOK. SADECE VERİ VE TİP.
export const ALL_THERAPISTS_DATA: TherapistCoreData[] = [
    {
        id: "therapist1",
        name: "Dr. Elif",
        thumbnailPath: "../../assets/Terapist_1.jpg",
        photoPath: "../../assets/Terapist_1.jpg",
        title: "AI Klinik Psikolog",
        persona: "Şefkatli ve duygusal, anaç tavırlı",
        personaKey: "default",
        icon: "heart-circle",
        style: "Empati ve dinleme öncelikli, duygulara odaklanır",
        specialties: ["Duygusal zorluklar", "Özşefkat", "İlişki terapisi"],
        philosophy:
            '"Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır."',
        about: "Ben Dr. Elif...",
        approach: "Şefkatli ve duygusal...",
        methods: [
            "Bilişsel Davranışçı Terapi",
            "Çözüm Odaklı Terapi",
            "Motivasyonel Görüşme",
            "Mindfulness Teknikleri",
        ],
    },
    // ... (diğer terapist objeleri buraya gelecek, aynı şekilde) ...
    {
        id: "therapist3",
        name: "Dr. Lina",
        thumbnailPath: "../../assets/Terapist_3.jpg",
        photoPath: "../../assets/Terapist_3.jpg",
        title: "AI Aile Terapisti",
        persona: "Huzurlu ve empatik, aile odaklı",
        personaKey: "calm",
        icon: "people",
        style:
            "Empati ve anlayış üzerine kurulu, ilişkileri güçlendirmeye odaklanır",
        specialties: [
            "Aile içi iletişim",
            "Çocuk & Ergen",
            "Travma sonrası destek",
        ],
        philosophy: '"Ailenin kalbi, huzurunuzun aynasıdır."',
        about: "Ben Dr. Lina...",
        approach: "Dinamik ve ilham verici...",
        methods: [
            "Sistemik Terapi",
            "Aile Danışmanlığı",
            "İletişim Becerileri Eğitimi",
            "Çocuk ve Ergen Terapisi",
        ],
    },
    {
        id: "coach1",
        name: "Koç Can",
        thumbnailPath: "../../assets/coach-can.jpg",
        photoPath: "../../assets/coach-can.jpg",
        title: "Yaşam Koçu",
        persona: "Dinamik ve ilham verici, pratik odaklı",
        personaKey: "motivational",
        icon: "rocket",
        style: "Enerjik, motive edici ve hedef odaklı",
        specialties: [
            "Kişisel gelişim",
            "Hedef belirleme",
            "Performans artırma",
        ],
        philosophy:
            '"Başarı, küçük adımların tutarlı bir şekilde atılmasıyla gelir."',
        about: "Merhaba! Ben Coach Can...",
        approach: "Dinamik ve ilham verici...",
        methods: [
            "Hedef Belirleme Teknikleri",
            "Performans Koçluğu",
            "Zaman Yönetimi",
            "Motivasyon Stratejileri",
        ],
    },
];
