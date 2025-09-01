// constants/therapyOptions.ts
export const therapyOptions = [
    {
        id: "voice",
        title: "Sesli Sohbet",
        description:
            "Düşüncelerini sesli olarak paylaş. Yapay zeka, ses tonundaki duygusal ipuçlarını anlamana yardımcı olabilir.",
        icon: "mic-outline" as const,
        colors: ["#F4E6FF", "#E0ECFD"] as const,
        route: "/sessions/voice_session",
        features: ["Anlık Geri Bildirim", "Doğal Akış", "Sesli Düşünme Alanı"],
    },
    {
        id: "text",
        title: "Yazılı Sohbet",
        description:
            "Düşüncelerini ve hissettiklerini yazarak keşfet. Yapay zeka, yazdıklarındaki kalıpları ve temaları görmene yardımcı olur.",
        icon: "chatbubble-ellipses-outline" as const,
        colors: ["#E0ECFD", "#F4E6FF"] as const,
        route: "/sessions/text_session",
        features: [
            "Asenkron İletişim",
            "Derinlemesine Düşünme",
            "Kalıcı Kayıtlar",
        ],
    },
];
