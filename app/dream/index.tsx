//app/dream/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { AppEvent, canUserAnalyzeDream, deleteEventById, getEventsForLast } from '../../utils/eventLogger';

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

  const loadAnalyses = useCallback(async () => {
    try {
      // Son 365 günün olaylarını çek
      const allEvents = await getEventsForLast(365);
      // Sadece rüya analizlerini filtrele
      const dreamEvents = allEvents.filter(event => event.type === 'dream_analysis');
      setAnalyses(dreamEvents);
    } catch (e) {
      console.error('Rüya analizleri yüklenemedi:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyses();
    }, [loadAnalyses])
  );
  
  const handleDelete = async (eventId: string) => {
    Alert.alert(
      "Analizi Sil",
      "Bu rüya analizini kalıcı olarak silmek istediğinizden emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: async () => {
          try {
            await deleteEventById(eventId);
            const updatedAnalyses = analyses.filter(a => a.id !== eventId);
            setAnalyses(updatedAnalyses);
          } catch (error) {
            console.error("Silme hatası:", error);
            Alert.alert("Hata", "Analiz silinirken bir sorun oluştu.");
          }
        }}
      ]
    );
  };

  const handleNewDreamPress = async () => {
    const { canAnalyze, daysRemaining } = await canUserAnalyzeDream();
    if (canAnalyze) {
      router.push('/dream/analyze');
    } else {
      Alert.alert(
        "Haftalık Limit Doldu",
        `Bir sonraki ücretsiz rüya analizine ${daysRemaining} gün kaldı. Limitsiz analiz için Premium'u keşfedebilirsin.`,
        [
          { text: "Tamam" },
          { text: "Premium'a Göz At", onPress: () => router.push('/premium') }
        ]
      );
    }
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.newDreamButton}
            onPress={handleNewDreamPress}
          >
            <LinearGradient colors={['#F8FAFF', '#FFFFFF']} style={styles.newDreamButtonGradient}>
                <Ionicons name="add" size={24} color={COSMIC_COLORS.accent} />
                <Text style={styles.newDreamButtonText}>Yeni Rüya Analizi al</Text>
            </LinearGradient>
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
  newDreamButton: { borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: {width: 0, height: 5}, elevation: 10 },
  newDreamButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28 },
  newDreamButtonText: { color: COSMIC_COLORS.accent, fontSize: 17, fontWeight: '600', marginLeft: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
  emptyTitle: { color: COSMIC_COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { color: COSMIC_COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 10, maxWidth: '80%' }
});
