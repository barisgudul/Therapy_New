// app/agentic-test.tsx
// AGENTIC CORE TEST SAYFASI
// Bu sayfa, yeni Agentic Core sisteminin çalışıp çalışmadığını test eder

import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    AGENTIC_QUESTION_TEMPLATES,
    askAgentToSimulate,
    askAIToAnalyzeItself,
    askMainBrain,
    askMetaCognitionTemplate,
    askTransparencyTemplate,
    askWithTemplate,
    explainAIReasoning,
    META_COGNITION_TEMPLATES,
    runScenarioSimulation,
    TRANSPARENCY_TEMPLATES,
} from "../services/agentic.service";

export default function AgenticTestScreen() {
    const [userQuestion, setUserQuestion] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [simulationScenario, setSimulationScenario] = useState("");
    const [lastAIAnswer, setLastAIAnswer] = useState("");
    const [lastUserQuestion, setLastUserQuestion] = useState("");

    const handleAskQuestion = async () => {
        if (!userQuestion.trim()) {
            Alert.alert("Hata", "Lütfen bir soru girin.");
            return;
        }

        setIsLoading(true);
        setResponse("");

        try {
            const answer = await askMainBrain(userQuestion);
            setResponse(answer);
            setLastAIAnswer(answer);
            setLastUserQuestion(userQuestion);
        } catch (error) {
            Alert.alert("Hata", `Ana beyin erişilemedi: ${error.message}`);
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTemplateQuestion = async (
        template: keyof typeof AGENTIC_QUESTION_TEMPLATES,
    ) => {
        setIsLoading(true);
        setResponse("");
        setUserQuestion(AGENTIC_QUESTION_TEMPLATES[template]);

        try {
            const answer = await askWithTemplate(template);
            setResponse(answer);
        } catch (error) {
            Alert.alert("Hata", `Ana beyin erişilemedi: ${error.message}`);
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRunSimulation = async () => {
        if (!simulationScenario.trim()) {
            Alert.alert("Hata", "Lütfen bir senaryo girin.");
            return;
        }

        setIsLoading(true);
        setResponse("");

        try {
            const result = await runScenarioSimulation(
                simulationScenario,
                "scenario_walkthrough",
            );
            if (result.success) {
                setResponse(
                    `🎭 SIMÜLASYON TAMAMLANDI\n\n` +
                        `📊 Güvenilirlik: ${
                            (result.confidence_score! * 100).toFixed(0)
                        }%\n` +
                        `⏱️ Süre: ${result.duration_minutes} dakika\n` +
                        `🔢 Adım Sayısı: ${result.steps_count}\n\n` +
                        `📝 ÖZET:\n${result.outcome_summary}`,
                );
            } else {
                setResponse(`SIMÜLASYON HATASI: ${result.error}`);
            }
        } catch (error) {
            Alert.alert("Hata", `Simülasyon çalıştırılamadı: ${error.message}`);
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAgentSimulation = async () => {
        if (!simulationScenario.trim()) {
            Alert.alert("Hata", "Lütfen bir senaryo girin.");
            return;
        }

        setIsLoading(true);
        setResponse("");

        try {
            const answer = await askAgentToSimulate(simulationScenario);
            setResponse(answer);
        } catch (error) {
            Alert.alert(
                "Hata",
                `Agent simülasyonu çalıştırılamadı: ${error.message}`,
            );
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMetaCognitionTemplate = async (
        template: keyof typeof META_COGNITION_TEMPLATES,
    ) => {
        setIsLoading(true);
        setResponse("");
        setUserQuestion(META_COGNITION_TEMPLATES[template]);

        try {
            const answer = await askMetaCognitionTemplate(template);
            setResponse(answer);
        } catch (error) {
            Alert.alert(
                "Hata",
                `Meta-cognition analizi başarısız: ${error.message}`,
            );
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelfAnalysis = async () => {
        setIsLoading(true);
        setResponse("");

        try {
            const answer = await askAIToAnalyzeItself(48); // Son 48 saat
            setResponse(answer);
        } catch (error) {
            Alert.alert("Hata", `Self-analysis başarısız: ${error.message}`);
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // === ŞEFFAFLIK FONKSİYONLARI ===
    const handleExplainReasoning = async () => {
        if (!lastUserQuestion || !lastAIAnswer) {
            Alert.alert("Hata", "Önce bir soru sorun ve cevap alın.");
            return;
        }

        setIsLoading(true);
        setResponse("");

        try {
            const explanation = await explainAIReasoning(
                lastUserQuestion,
                lastAIAnswer,
            );
            setResponse(explanation);
        } catch (error) {
            Alert.alert("Hata", `Açıklama alınamadı: ${error.message}`);
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTransparencyTemplate = async (
        templateKey: keyof typeof TRANSPARENCY_TEMPLATES,
    ) => {
        setIsLoading(true);
        setResponse("");

        try {
            const explanation = await askTransparencyTemplate(
                templateKey,
                lastAIAnswer,
            );
            setResponse(explanation);
        } catch (error) {
            Alert.alert(
                "Hata",
                `Şeffaflık analizi başarısız: ${error.message}`,
            );
            setResponse(`HATA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <Text style={styles.title}>🧠 Agentic Core Test</Text>
                <Text style={styles.subtitle}>
                    Bu sayfa, AI Agent&apos;ın kendi kendine araçları kullanarak
                    sorularınızı cevaplayıp cevaplayamadığını test eder.
                </Text>

                {/* Manual Question Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Manuel Soru</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Sorunuzu buraya yazın..."
                        value={userQuestion}
                        onChangeText={setUserQuestion}
                        multiline
                        numberOfLines={3}
                    />
                    <TouchableOpacity
                        style={[
                            styles.button,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={handleAskQuestion}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>
                            {isLoading ? "Agent Düşünüyor..." : "Ana Beyne Sor"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Template Questions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hazır Şablonlar</Text>

                    <TouchableOpacity
                        style={[
                            styles.templateButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            handleTemplateQuestion("WEEKLY_ANALYSIS")}
                        disabled={isLoading}
                    >
                        <Text style={styles.templateButtonText}>
                            📊 Bu Hafta Nasılım?
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.templateButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            handleTemplateQuestion("ENERGY_ANALYSIS")}
                        disabled={isLoading}
                    >
                        <Text style={styles.templateButtonText}>
                            ⚡ Neden Yorgunum?
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.templateButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={() => handleTemplateQuestion("MOOD_PATTERN")}
                        disabled={isLoading}
                    >
                        <Text style={styles.templateButtonText}>
                            🎭 Ruh Hali Kalıbım
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.templateButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            handleTemplateQuestion("PREDICTION_CHECK")}
                        disabled={isLoading}
                    >
                        <Text style={styles.templateButtonText}>
                            🔮 Gelecek Tahminleri
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.templateButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                            handleTemplateQuestion("COMPREHENSIVE_INSIGHT")}
                        disabled={isLoading}
                    >
                        <Text style={styles.templateButtonText}>
                            🎯 Kapsamlı İçgörü
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Simulation Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🎭 Dijital İkiz Simülasyonu
                    </Text>
                    <Text style={styles.subtitle}>
                        Bir senaryo yazın, AI sizi dijital olarak o durumda
                        simüle etsin.
                    </Text>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Simülasyon senaryosu (örn: 'Yarın patronla toplantıya giriyorsun ve sunum yapacaksın...')"
                        value={simulationScenario}
                        onChangeText={setSimulationScenario}
                        multiline
                        numberOfLines={3}
                    />

                    <View style={styles.simulationButtons}>
                        <TouchableOpacity
                            style={[
                                styles.simulationButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleRunSimulation}
                            disabled={isLoading}
                        >
                            <Text style={styles.simulationButtonText}>
                                🎯 Direkt Simüle Et
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.simulationButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={handleAgentSimulation}
                            disabled={isLoading}
                        >
                            <Text style={styles.simulationButtonText}>
                                🤖 Agent&apos;a Simülasyon Yaptır
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transparency Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🔍 Şeffaflık (AI Neden Böyle Düşündü?)
                    </Text>
                    <Text style={styles.subtitle}>
                        AI&apos;ın düşünce sürecini ve karar verme mantığını
                        anlayın.
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.transparencyButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={handleExplainReasoning}
                        disabled={isLoading || !lastAIAnswer}
                    >
                        <Text style={styles.transparencyButtonText}>
                            💭 Son Cevabımı Neden Verdim?
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.subSectionTitle}>
                        Şeffaflık Soruları
                    </Text>
                    <View style={styles.transparencyGrid}>
                        <TouchableOpacity
                            style={[
                                styles.transparencySmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleTransparencyTemplate("WHAT_DATA_USED")}
                            disabled={isLoading}
                        >
                            <Text style={styles.transparencySmallButtonText}>
                                📊 Hangi Verileri Kullandın?
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.transparencySmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleTransparencyTemplate("HOW_DECIDED")}
                            disabled={isLoading}
                        >
                            <Text style={styles.transparencySmallButtonText}>
                                🤔 Nasıl Karar Verdin?
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.transparencySmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleTransparencyTemplate("CONFIDENCE_SOURCE")}
                            disabled={isLoading}
                        >
                            <Text style={styles.transparencySmallButtonText}>
                                🎯 Ne Kadar Eminsin?
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.transparencySmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleTransparencyTemplate("WHY_NOT_DIFFERENT")}
                            disabled={isLoading}
                        >
                            <Text style={styles.transparencySmallButtonText}>
                                🔄 Neden Farklı Öneri Vermedin?
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Meta-Cognition Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🧠 Meta-Cognition (AI Kendini Analiz Ediyor)
                    </Text>
                    <Text style={styles.subtitle}>
                        AI&apos;ın kendi kararlarını analiz etmesi ve öğrenmesi.
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.metaCognitionButton,
                            isLoading && styles.buttonDisabled,
                        ]}
                        onPress={handleSelfAnalysis}
                        disabled={isLoading}
                    >
                        <Text style={styles.metaCognitionButtonText}>
                            🔍 Kendimi Analiz Et (48 Saat)
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.metaCognitionGrid}>
                        <TouchableOpacity
                            style={[
                                styles.metaCognitionSmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleMetaCognitionTemplate("DECISION_REVIEW")}
                            disabled={isLoading}
                        >
                            <Text style={styles.metaCognitionSmallButtonText}>
                                📊 Karar İncelemesi
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.metaCognitionSmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() => handleMetaCognitionTemplate(
                                "LEARNING_ASSESSMENT",
                            )}
                            disabled={isLoading}
                        >
                            <Text style={styles.metaCognitionSmallButtonText}>
                                📚 Öğrenme Değerlendirmesi
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.metaCognitionSmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() => handleMetaCognitionTemplate(
                                "CONFIDENCE_CALIBRATION",
                            )}
                            disabled={isLoading}
                        >
                            <Text style={styles.metaCognitionSmallButtonText}>
                                ⚖️ Güven Kalibrasyonu
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.metaCognitionSmallButton,
                                isLoading && styles.buttonDisabled,
                            ]}
                            onPress={() =>
                                handleMetaCognitionTemplate(
                                    "PATTERN_RECOGNITION",
                                )}
                            disabled={isLoading}
                        >
                            <Text style={styles.metaCognitionSmallButtonText}>
                                🔄 Kalıp Tanıma
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Response Area */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Agent Cevabı</Text>

                    {isLoading
                        ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator
                                    size="large"
                                    color="#007AFF"
                                />
                                <Text style={styles.loadingText}>
                                    AI Agent araçları kullanarak cevabınızı
                                    hazırlıyor...
                                </Text>
                            </View>
                        )
                        : (
                            <ScrollView style={styles.responseContainer}>
                                <Text style={styles.responseText}>
                                    {response || "Henüz soru sorulmadı."}
                                </Text>
                            </ScrollView>
                        )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
        color: "#333",
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24,
        color: "#666",
        lineHeight: 20,
    },
    section: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },
    subSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 8,
        color: "#666",
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlignVertical: "top",
        marginBottom: 12,
        backgroundColor: "#f9f9f9",
    },
    button: {
        backgroundColor: "#007AFF",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
    },
    buttonDisabled: {
        backgroundColor: "#ccc",
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    templateButton: {
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    templateButtonText: {
        fontSize: 16,
        color: "#333",
        textAlign: "center",
    },
    responseContainer: {
        maxHeight: 300,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#f9f9f9",
    },
    responseText: {
        fontSize: 16,
        lineHeight: 24,
        color: "#333",
    },
    loadingContainer: {
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    simulationButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    simulationButton: {
        flex: 1,
        backgroundColor: "#8B5CF6",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
    },
    simulationButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    metaCognitionButton: {
        backgroundColor: "#10B981",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    metaCognitionButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    metaCognitionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 8,
    },
    metaCognitionSmallButton: {
        backgroundColor: "#059669",
        borderRadius: 6,
        padding: 10,
        width: "48%",
        alignItems: "center",
        marginBottom: 8,
    },
    metaCognitionSmallButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
    },

    // === ŞEFFAFLIK STİLLERİ ===
    transparencyButton: {
        backgroundColor: "#34D399", // Emerald green
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    transparencyButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    transparencyGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 12,
    },
    transparencySmallButton: {
        backgroundColor: "#10B981", // Darker emerald
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        width: "48%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    transparencySmallButtonText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
});
