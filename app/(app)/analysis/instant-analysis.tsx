// app/(app)/analysis/instant-analysis.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useOnboardingStore } from "../../../store/onboardingStore";
import { logEvent } from "../../../services/api.service";
import { Colors } from "../../../constants/Colors";

const STOP = new Set(["ve","ile","bir","çok","gibi","da","de","mi","ama","ya","en","çünkü","için","ben","bana","bence","şu","bu","o","ki","ne","mı","mu"]);

function localAnalyze(text: string) {
  const t = text.toLocaleLowerCase("tr-TR");
  const words = t.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (STOP.has(w) || w.length < 3) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  const topArr = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k])=>k);
  const top = topArr.length ? topArr.join(", ") : "belirgin değil";
  const negatives = ["stres","kaygı","anksiyete","korku","öfke","yorgun","bunalmış","üzgün","endişe","tükenmiş"].filter(w=>t.includes(w));
  const positives = ["umut","iyi","mutlu","huzur","ilerleme","başarı","enerjik","odak"].filter(w=>t.includes(w));
  const mood = positives.length - negatives.length;
  const tone = mood > 1 ? "iyimser" : mood < -1 ? "zorlayıcı" : "nötr";
  return {
    summary: `Yanıtlarının genel tonu ${tone}. En sık geçen temalar: ${top}.`,
    strengths: positives.length ? positives.map(p=>`• ${p} duygusu/teması öne çıkıyor.`) : ["• Güçlü yönlerini belirlemek için ek örnekler paylaşman yararlı olabilir."],
    triggers: negatives.length ? negatives.map(n=>`• ${n} ile ilişkili gerilim/kaçınma görülebilir.`) : ["• Belirgin bir tetikleyici sözcük gözükmüyor."],
    nextStep: "Bu analizi ana ekranda sakladım. Dilersen her gün kısa bir not ekleyip ilerlemeni görebilirsin."
  };
}

export default function InstantAnalysis() {
  const router = useRouter();
  const answers = useOnboardingStore((s)=>s.answersArray);
  const text = useMemo(()=> (answers ?? []).map(a=>a.answer).join(" ").trim(), [answers]);

  const [result, setResult] = useState<ReturnType<typeof localAnalyze> | null>(null);

  useEffect(() => {
    const r = localAnalyze(text);
    setResult(r);
    logEvent({ type: "ai_analysis", data: { summary: r.summary, strengths: r.strengths, triggers: r.triggers, from: "onboarding_once" } }).catch(()=>{});
  }, [text]);

  if (!result) {
    return (
      <LinearGradient colors={["#F4F6FF","#FFFFFF"]} style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#F4F6FF","#FFFFFF"]} style={{ flex:1 }}>
      <SafeAreaView style={{ flex:1 }}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <View style={styles.header}>
            <Ionicons name="sparkles" size={22} color={Colors.light.tint} />
            <Text style={styles.title}>Detaylı Analizin Hazır</Text>
          </View>

          <Card title="Kısa Özet">
            <Text style={styles.p}>{result.summary}</Text>
          </Card>

          <Card title="Güçlü Yönlerin">
            {result.strengths.map((s, i)=>(<Text key={i} style={styles.p}>{s}</Text>))}
          </Card>

          <Card title="Olası Tetikleyiciler">
            {result.triggers.map((s, i)=>(<Text key={i} style={styles.p}>{s}</Text>))}
          </Card>

          <Card title="Sonraki Adım">
            <Text style={styles.p}>{result.nextStep}</Text>
          </Card>

          <Pressable onPress={()=>router.replace("/")} style={styles.cta}>
            <Text style={styles.ctaText}>Ana sayfaya dön</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40 },
  header: { flexDirection:"row", alignItems:"center", marginBottom: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.light.tint },
  card: {
    backgroundColor:"#fff", borderRadius:16, padding:16, marginBottom:12,
    shadowColor: Colors.light.tint, shadowOpacity:0.12, shadowRadius:16, shadowOffset:{ width:0, height:8 },
    borderWidth: 1, borderColor: "rgba(93,161,217,0.18)",
  },
  cardTitle: { fontWeight:"700", fontSize:16, marginBottom:8, color:"#1A1F36" },
  p: { color:"#334155", lineHeight:22, marginBottom:6 },
  cta: {
    marginTop: 8,
    flexDirection:"row", alignItems:"center", justifyContent:"center",
    backgroundColor: Colors.light.tint, paddingVertical: 16, borderRadius: 16
  },
  ctaText: { color:"#fff", fontWeight:"700", fontSize:16, marginRight:8 },
});
