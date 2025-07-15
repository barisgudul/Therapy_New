// components/OnboardingStep.tsx

import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Spacing } from '../constants/Design';

// AuthInput bileşenini Auth ekranlarından kopyalayıp buraya alıyoruz ki her şey bir yerde dursun.
interface AuthInputProps extends TextInputProps {
    iconName: keyof typeof Ionicons.glyphMap;
}
const AuthInput = ({ iconName, ...props }: AuthInputProps) => (
  <View style={styles.inputContainer}>
    <Ionicons name={iconName} size={22} style={styles.inputIcon} />
    <TextInput
        style={styles.input}
        placeholderTextColor="#8e8e93" // Auth stili
        {...props}
    />
  </View>
);

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
        <SafeAreaView style={styles.background}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    {/* Üst Kısım: Başlık ve İlerleme */}
                    <View>
                        <MotiView from={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 100}}>
                            <View style={styles.header}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name={icon} size={24} color={Colors.light.tint}/>
                                </View>
                                <Text style={styles.stepCounter}>{`Adım ${step} / ${totalSteps}`}</Text>
                            </View>
                        </MotiView>
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
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
                            placeholderTextColor="#8e8e93"
                            multiline
                            textAlignVertical="top"
                            autoFocus={true}
                        />
                    </MotiView>

                    {/* Alt Kısım: İlerleme Butonu */}
                    <View>
                        <Pressable 
                            onPress={() => onNextPress(answer)} 
                            style={({ pressed }) => [
                                styles.button, 
                                answer.trim().length < 15 && styles.buttonDisabled,
                                { opacity: pressed ? 0.7 : 1 }
                            ]} 
                            disabled={answer.trim().length < 15}
                        >
                            <Text style={styles.buttonText}>{isLastStep ? 'Tamamla ve Başla' : 'Devam'}</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF"/>
                        </Pressable>
                    </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Stillerin tamamı artık auth.ts'ten ilham alıyor
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#F9F9F9' },
  container: { flex: 1, padding: Spacing.large, justifyContent: 'space-between', paddingBottom: 40 },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.medium,
      paddingTop: Spacing.xlarge,
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
  content: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  questionText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1c1c1e',
    lineHeight: 34,
    marginBottom: Spacing.small
  },
  detailsText: {
      fontSize: 17,
      color: '#8e8e93',
      lineHeight: 22,
      marginBottom: Spacing.xlarge,
  },
  textArea: {
      minHeight: 180,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: Spacing.medium,
      fontSize: 17,
      lineHeight: 24,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      color: '#1c1c1e'
  },
  button: {
      height: 52,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.light.tint,
      flexDirection: 'row',
      gap: 10
  },
  buttonDisabled: {
      backgroundColor: '#A9B4C8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // --- AuthInput için gereken stiller ---
  inputContainer: {}, inputIcon: {}, input: {} // Sadece hata vermesin diye boş tanımlar, bu dosyada kullanılmıyor.
}); 