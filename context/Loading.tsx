// context/Loading.tsx - OLMASI GEREKEN BU

import React, { createContext, ReactNode, useContext, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

// Context tipini ve hook'u aynı bırakabiliriz, onlar doğru.
interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);

  // Dışarıya basit fonksiyonlar açacağız. Komponentler "setIsLoading" bilmek zorunda değil.
  const showLoading = (message?: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage(undefined);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {/* children, yani senin bütün uygulaman burada render ediliyor. */}
      {children} 
      
      {/* isLoading true ise, Modal'ı, yani yükleniyor ekranını her şeyin üzerine basıyoruz. */}
      <Modal
        transparent={true}
        animationType="none"
        visible={isLoading}
        onRequestClose={() => { /* Android geri tuşu için, şimdilik boş kalabilir */ }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.activityIndicatorWrapper}>
            <ActivityIndicator size="large" color="#007AFF" />
            {loadingMessage && <Text style={styles.loadingText}>{loadingMessage}</Text>}
          </View>
        </View>
      </Modal>
    </LoadingContext.Provider>
  );
};

// Bu stiller, yükleniyor ekranının nasıl görüneceğini belirler.
const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Arkası yarı saydam siyah
  },
  activityIndicatorWrapper: {
    backgroundColor: '#FFFFFF', // Beyaz kutu
    height: 120,
    width: 120,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20
  },
  loadingText: {
    marginTop: 10,
    color: '#333333',
    fontSize: 14
  }
});