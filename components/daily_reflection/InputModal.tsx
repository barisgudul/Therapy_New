// components/daily_reflection/InputModal.tsx

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Modal from 'react-native-modal';

interface InputModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  note: string;
  onNoteChange: (text: string) => void;
  dynamicColor: string;
  gradientColors: [string, string];
}

export default function InputModal({
  isVisible,
  onClose,
  onSubmit,
  note,
  onNoteChange,
  dynamicColor,
}: InputModalProps) {

  return (
    <Modal
      isVisible={isVisible}
      onBackButtonPress={onClose}
      onBackdropPress={onClose}
      animationIn="zoomIn"
      animationOut="zoomOut"
      style={styles.modal}
      avoidKeyboard
      backdropColor="rgba(17, 24, 39, 0.6)"
      backdropOpacity={1}
      customBackdrop={
        <TouchableWithoutFeedback onPress={onClose}>
            <BlurView 
              intensity={10} 
              tint="dark" 
              style={StyleSheet.absoluteFill} 
            />
        </TouchableWithoutFeedback>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentContainer}>
              <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logoImage}
                    />
                  </View>
              </View>

              <Text style={styles.title}>Bugün Nasılsın?</Text>
              <Text style={styles.subtitle}>
                Duygularını ve düşüncelerini güvenle paylaş
              </Text>

              {/* YENİ TASARIM: Gömülü ve çerçevesiz TextInput */}
              <View style={styles.inputWrapper}>
                <TextInput
                  maxLength={1000}
                  style={styles.textInput}
                  value={note}
                  onChangeText={onNoteChange}
                  placeholder="İçinden geçenleri anlatmak ister misin?"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  autoFocus
                  selectionColor={dynamicColor}
                />
              </View>
              
              <View style={styles.footer}>
                  <Text style={styles.charCounter}>
                    {note.length} / 1000
                  </Text>
                  <TouchableOpacity
                    onPress={onSubmit}
                    activeOpacity={0.8}
                    style={[styles.button, !note.trim() && styles.buttonDisabled]}
                    disabled={!note.trim()}
                  >
                    <LinearGradient
                      colors={["#E0ECFD", "#F4E6FF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryButtonGradient}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#6B46C1" />
                      <Text style={[styles.buttonText, styles.primaryButtonText]}>Tamam</Text>
                    </LinearGradient>
                  </TouchableOpacity>
              </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// YENİ VE DAHA İYİ STİLLER
const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center', // Ortala
    paddingHorizontal: 16,
  },
  kavContainer: {
    width: '100%',
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Hafif yarı saydam
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF', // Arka plan ekle
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 8, // Android için gölge
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  inputWrapper: {
    backgroundColor: '#F3F4F6', // Gömülü hissi için hafif gri
    borderRadius: 16,
    minHeight: 140, // Dinamik yükseklik için minHeight
    flexShrink: 1,
    padding: 16,
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
    textAlignVertical: "top",
    flex: 1,
  },
  footer: {},
  charCounter: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginBottom: 12,
  },

  // === YENİ BUTON STİLLERİ ===
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
      opacity: 0.5,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
      fontSize: 16,
      fontWeight: '600',
  },
  primaryButtonText: {
      color: '#6B46C1',
  },
});
