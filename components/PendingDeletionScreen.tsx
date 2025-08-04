// components/PendingDeletionScreen.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/Auth';
import { signOut } from '../utils/auth';

export default function PendingDeletionScreen() {
    const { cancelDeletion } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    
    const handleCancel = async () => {
        setIsLoading(true);
        try {
            await cancelDeletion();
            // AuthProvider'daki state güncellendiği için ana sayfa otomatik görünecektir.
        } catch(error) {
            console.error('İptal işlemi hatası:', error);
            Alert.alert('Hata', 'İptal işlemi sırasında bir sorun oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Çıkış yapma hatası:', error);
            Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu.');
        }
    };
    
    return (
        <LinearGradient colors={['#F8F9FC', '#FFFFFF']} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Hesabınız Silinmek Üzere</Text>
                <Text style={styles.message}>
                    Bu hesap 7 gün içinde kalıcı olarak silinecektir. 
                    Tüm verilerinize yeniden erişmek ve hesabınızı aktif tutmak için silme işlemini iptal edebilirsiniz.
                </Text>
                
                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.light.tint} style={styles.loader} />
                ) : (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={handleCancel} style={styles.primaryButton}>
                            <LinearGradient
                                colors={['#4C6FFF', '#6B8CFF']}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.primaryButtonText}>Silme İşlemini İptal Et</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={handleSignOut} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Çıkış Yap</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.light.tint,
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#4A5568',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    loader: {
        marginTop: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    primaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    secondaryButtonText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
});