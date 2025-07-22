//app/dream/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { PremiumGate } from '../../components/PremiumGate';
import { useFeatureAccess } from '../../hooks/useSubscription';
import { AppEvent, deleteEventById, getEventsForLast } from '../../services/event.service';
import AnalyzeDreamScreen from './analyze';

const COSMIC_COLORS = {
  background: ['#0d1117', '#1A2947'] as [string, string],
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  textPrimary: '#EFEFEF',
  textSecondary: '#A9B4C8',
  accent: '#5DA1D9',
};

export default function DreamJournalScreen() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const dreamAnalysisFeature = useFeatureAccess('dream_analysis');

  const loadAnalyses = useCallback(async () => {
    // Veri yüklemesi başlamadan önce tekrar true yapmakta fayda var,
    // özellikle pull-to-refresh gibi senaryolar için.
    setIsLoading(true);
    try {
      // Son 365 günün olaylarını çek
      const allEvents = await getEventsForLast(365);
      // Sadece rüya analizlerini filtrele
      const dreamEvents = allEvents.filter(event => event.type === 'dream_analysis');
      setAnalyses(dreamEvents);
    } catch (e) {
      console.error('Rüya analizleri yüklenemedi:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [loadAnalyses])
  );
  
  const handleDelete = (eventId: string) => {
    Alert.alert(
      "Analizi Sil",
      "Bu rüya analizini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            try {
                // ADIM 1: KOMUTA MERKEZİNDEN İMHA EMRİNİ GÖNDER VE ONAY BEKLE.
                await deleteEventById(eventId);

                // ADIM 2: İMHA ONAYI GELDİKTEN SONRA, VE SADECE GELDİKTEN SONRA,
                // CEPHE GÖRÜNÜMÜNÜ GÜNCELLE.
                setAnalyses(prevAnalyses => prevAnalyses.filter(a => a.id !== eventId));
                // İsteğe bağlı: Kullanıcıya operasyonun başarısını bildir.
                // Alert.alert("Başarılı", "Analiz kalıcı olarak silindi.");
            } catch (error) {
                // EĞER ONAY GELMEZSE, HEMEN UYARI VER VE HİÇBİR ŞEYİ DEĞİŞTİRME.
                console.error("Silme hatası:", error);
                Alert.alert("Hata", "Analiz silinirken bir sorun oluştu. Lütfen tekrar deneyin.");
            }
          }
        }
      ]
    );
};

  const renderDreamCard = ({ item, index }: { item: AppEvent, index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 100, type: 'timing' }}
    >
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/dream/result', params: { eventData: JSON.stringify(item), isNewAnalysis: "false" } })}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.data.analysis.title}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteIcon}>
                 <Ionicons name="trash-bin-outline" size={22} color={COSMIC_COLORS.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    </MotiView>
  );

  // EĞER KULLANICI YENİ ANALİZ BUTONUNA BASTIYSA BU KISIM ÇALIŞIR
  if (isAnalyzing) {
    return (
      <PremiumGate featureType="dream_analysis">
        <AnalyzeDreamScreen onBack={() => setIsAnalyzing(false)} />
      </PremiumGate>
    );
  }

  // VARSAYILAN OLARAK BU KISIM GÖRÜNÜR (RÜYA LİSTESİ)
  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
            <Text style={styles.headerTitle}>Rüya Günlüğü</Text>
            <Text style={styles.headerSubtext}>Bilinçaltınızı analizlerle keşfedin.</Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COSMIC_COLORS.accent} />
            <Text style={{ ...styles.emptySubtitle, marginTop: 20 }}>Analizler Yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={analyses}
            renderItem={renderDreamCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="moon-outline" size={60} color={COSMIC_COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>Henüz analiz edilmiş bir rüya yok.</Text>
                <Text style={styles.emptySubtitle}>Aşağıdaki butona dokunarak ilk rüya analizinizi alın.</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.newDreamButton}
            onPress={() => setIsAnalyzing(true)}
          >
            <View style={styles.newDreamButtonContent}>
              <Ionicons name="add" size={24} color={COSMIC_COLORS.textPrimary} />
              <Text style={styles.newDreamButtonText}>Yeni Rüya Analizi</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8 },
  header: { paddingTop: 120, paddingBottom: 30, alignItems: 'center' },
  headerTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 32, fontWeight: 'bold', letterSpacing: -1 },
  headerSubtext: { color: COSMIC_COLORS.textSecondary, fontSize: 16, marginTop: 8 },
  card: { backgroundColor: COSMIC_COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 6 },
  cardDate: { color: COSMIC_COLORS.textSecondary, fontSize: 14 },
  deleteIcon: { padding: 10 },
  footer: { padding: 20, borderTopColor: COSMIC_COLORS.cardBorder, borderTopWidth: 1 },
  newDreamButton: { 
    height: 56,
    borderRadius: 28, 
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newDreamButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  newDreamButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 17, fontWeight: '600', marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
  emptyTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { color: COSMIC_COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 10, maxWidth: '80%' }
});
