// components/daily_reflection/InputModal.tsx

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Modal from 'react-native-modal';

interface InputModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  note: string;
  onNoteChange: (text: string) => void;
  gradientColors: [string, string];
  dynamicColor: string;
}

export default function InputModal({
  isVisible,
  onClose,
  onSubmit,
  note,
  onNoteChange,
  gradientColors,
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
                    <LinearGradient colors={gradientColors} style={styles.iconGradient}>
                        <Ionicons name="create-outline" size={24} color="white" />
                    </LinearGradient>
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
                      colors={gradientColors} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="checkmark" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Tamam</Text>
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  iconGradient: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  button: {
    borderRadius: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "white",
  },
});
