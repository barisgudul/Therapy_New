// components/OnboardingStep.tsx

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Design';

// Ana Bileşen
interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  question: string;
  questionDetails?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onNextPress: (answer: string) => void;
  isLastStep?: boolean;
}

export default function OnboardingStep({
  step,
  totalSteps,
  question,
  questionDetails,
  icon,
  onNextPress,
  isLastStep = false,
}: OnboardingStepProps) {
    const [answer, setAnswer] = useState('');
    const progress = step / totalSteps;
  
    return (
        <LinearGradient colors={['#F8F9FC', '#FFFFFF']} style={{ flex: 1 }}>
            <SafeAreaView style={styles.background}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
              >
                <View style={styles.container}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContentContainer}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                            <View>
                                {/* Üst Kısım: Başlık ve İlerleme */}
                                <View style={{paddingTop: Platform.OS === 'android' ? Spacing.large : 0}}>
                                    <MotiView from={{opacity: 0, translateY: -20}} animate={{opacity: 1, translateY: 0}} transition={{delay: 100}}>
                                        <View style={styles.header}>
                                            <View style={styles.iconContainer}>
                                                <Ionicons name={icon} size={24} color={Colors.light.tint}/>
                                            </View>
                                            <Text style={styles.stepCounter}>{`Adım ${step} / ${totalSteps}`}</Text>
                                        </View>
                                    </MotiView>
                                    <View style={styles.progressContainer}>
                                        <MotiView 
                                            from={{ width: `${((step - 1) / totalSteps) * 100}%`}}
                                            animate={{ width: `${progress * 100}%` }}
                                            transition={{ type: 'timing', duration: 500 }}
                                            style={styles.progressBar} 
                                        />
                                    </View>
                                </View>

                                {/* Ana İçerik: Soru ve Cevap Alanı */}
                                <MotiView 
                                    from={{opacity: 0, translateY: 20}} 
                                    animate={{opacity: 1, translateY: 0}} 
                                    transition={{delay: 200, type: 'timing', duration: 350}}
                                    style={styles.content}
                                >
                                    <Text style={styles.questionText}>{question}</Text>
                                    {questionDetails && <Text style={styles.detailsText}>{questionDetails}</Text>}
                                    <TextInput
                                        style={styles.textArea}
                                        value={answer}
                                        onChangeText={setAnswer}
                                        placeholder="İçinden geldiği gibi yaz..."
                                        placeholderTextColor="#A9B4C8"
                                        multiline
                                        autoFocus={true}
                                        selectionColor={Colors.light.tint}
                                    />
                                </MotiView>
                            </View>
                        </TouchableWithoutFeedback>
                    </ScrollView>

                    {/* Alt Kısım: İlerleme Butonu */}
                    <MotiView from={{opacity: 0, translateY: 10}} animate={{opacity: 1, translateY: 0}} transition={{delay: 100, type: 'timing'}}>
                        <Pressable 
                            onPress={() => onNextPress(answer)} 
                            style={({ pressed }) => [
                                styles.button,
                                answer.trim().length < 13 && styles.buttonDisabled,
                                { transform: [{ scale: pressed ? 0.98 : 1 }] }
                            ]} 
                            disabled={answer.trim().length < 13}
                        >
                            <LinearGradient
                              colors={['#FFFFFF', '#F8FAFF']}
                              start={{x: 0, y: 0}}
                              end={{x: 1, y: 1}}
                              style={styles.buttonGradient}
                            >
                                <Text style={[styles.buttonText, answer.trim().length < 13 && { color: '#A9B4C8' }]}>
                                  {isLastStep ? 'Tamamla ve Başla' : 'Devam'}
                                </Text>
                                <Ionicons 
                                  name="arrow-forward" 
                                  size={20} 
                                  color={answer.trim().length < 13 ? '#A9B4C8' : Colors.light.tint}
                                />
                            </LinearGradient>
                        </Pressable>
                    </MotiView>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

// Stiller klavye sorununu çözmek için yeniden yapılandırıldı
const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.large, paddingBottom: 20, paddingTop: 10 },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.medium,
  },
  iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.medium,
      borderWidth: 1,
      borderColor: '#EFEFEF'
  },
  stepCounter: {
      fontSize: 15,
      fontWeight: '600',
      color: '#8e8e93'
  },
  progressContainer: {
      height: 6,
      backgroundColor: '#e5e7eb',
      borderRadius: 3,
      overflow: 'hidden'
  },
  progressBar: {
      height: '100%',
      backgroundColor: Colors.light.tint,
      borderRadius: 3
  },
  content: { 
    paddingVertical: 40,
  },
  questionText: {
    fontSize: 26, // Yazı tipi boyutunu daha zarif bir görünüm için biraz küçülttük.
    fontWeight: '400', // Kalın yerine daha yumuşak bir görünüm için normal ağırlık.
    color: '#1A1F36',
    lineHeight: 38,
    marginBottom: Spacing.medium,
    letterSpacing: 0, // Daha okunaklı ve ferah bir görünüm için harf aralığını sıfırladık.
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Zarif bir serif yazı tipi.
  },
  detailsText: {
      fontSize: 17, // Hiyerarşiyi korumak için biraz daha küçük.
      color: '#4A5568',
      lineHeight: 26,
      marginBottom: Spacing.xlarge,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Soru ile aynı yazı tipi ailesi.
  },
  textArea: {
      minHeight: 180,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: Spacing.large,
      fontSize: 17,
      lineHeight: 25,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      color: '#1A1F36',
      textAlignVertical: 'top',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 5,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    overflow: 'visible',
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(93, 161, 217, 0.25)',
    borderRadius: 26
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    color: Colors.light.tint,
    fontSize: 17,
    fontWeight: '600',
  }
}); 