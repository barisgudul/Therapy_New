// app/(dev)/analysis-preview.tsx

import React, { useEffect } from "react";
import { Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router/";
import { useOnboardingStore } from "../../store/onboardingStore";
import { LinearGradient } from "expo-linear-gradient";

// Adım 1'de hazırladığımız sahte veri
const MOCK_INSIGHT_DATA = {
    pattern: "Görünüşe göre yüksek enerji seviyelerini yaratıcı anlarda deneyimlerken, odaklanmanı engelleyen dış faktörler olduğunda bir hayal kırıklığı yaşıyorsun.",
    reframe: "Bu bir odaklanma sorunu değil, aslında yaratıcı enerjini koruma içgüdüsü. Çevreni bu enerjiye uygun hale getirme arayışındasın.",
    potential: "Bu durum, senin için en verimli çalışma ortamının ne olduğunu keşfetmek için inanılmaz bir potansiyel taşıyor. Dikkat dağıtıcı unsurları ortadan kaldırdığında, yaratıcılığın sınırsız olabilir.",
    first_step: "Meditasyona başlama kararın, bu farkındalığı eyleme dökmek için mükemmel bir ilk adım. Kontrolü eline alıyorsun.",
    micro_habit: "Her sabah işe başlamadan önce sadece 3 dakika boyunca nefesine odaklan. Telefonunu başka bir odaya koy.",
    success_metric: "Bir hafta boyunca, kaç gün bu 3 dakikalık nefes egzersizini yaptığını takip et. Amaç mükemmellik değil, tutarlılık.",
    affirmation: "Enerjim değerlidir ve onu korumayı hak ediyorum.",
    plan_7d: "İlk 7 gün boyunca, her gün sadece bir 'derin çalışma' bloğu (25 dakika) oluşturmaya odaklan ve bu sürede tüm bildirimleri kapat.",
};

export default function AnalysisPreview() {
  const router = useRouter();
  const setOnboardingInsight = useOnboardingStore((s) => s.setOnboardingInsight);
  const setAnalysisUnlocked = useOnboardingStore((s) => s.setAnalysisUnlocked);

  useEffect(() => {
    // 1. Zustand store'unu sahte veriyle doldur.
    console.log("DEV: Mock data store'a yükleniyor...");
    setOnboardingInsight(MOCK_INSIGHT_DATA);

    // 2. Analiz sayfasının kilitli olmadığını belirt.
    setAnalysisUnlocked(true);

    // 3. Bir sonraki frame'de analiz sayfasına yönlendir.
    // setTimeout ile küçük bir gecikme vermek, state'in oturmasına garanti verir.
    setTimeout(() => {
      console.log("DEV: Analiz sayfasına yönlendiriliyor...");
      router.replace("/(auth)/analysis"); // replace kullan ki geri tuşu buraya dönmesin.
    }, 100);
  }, [router, setOnboardingInsight, setAnalysisUnlocked]);

  return (
    // Kullanıcı bir anlığına bu ekranı görürse diye bir yükleme ekranı gösterelim.
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16, fontSize: 16, color: "#6B7280" }}>
        Analiz önizlemesi hazırlanıyor...
      </Text>
    </LinearGradient>
  );
}
