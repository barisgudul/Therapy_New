// app/login.tsx - Güncellenmiş Hali
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
  Alert,
  Button,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { signInWithEmail } from '../utils/auth'; // Sadece signIn kaldı

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    Keyboard.dismiss(); // Butona basıldığında klavyeyi kapat
    setLoading(true);
    
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        // Başarılı giriş uyarısını kaldırabiliriz, direkt yönlendirme daha iyi
        router.replace('/'); 
      }
    } catch (error: any) {
      Alert.alert("Giriş Hatası", error.message || "Giriş yapılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // handleSignUp fonksiyonunu buradan sildik.

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.innerContainer}>
          <Text style={styles.title}>Giriş Yap</Text>
          <TextInput
            style={styles.input}
            placeholder="E-posta Adresiniz"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Şifreniz"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Giriş Yap" onPress={handleSignIn} disabled={loading} />
          
          <View style={styles.linkContainer}>
            <Text>Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.link}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 12, paddingHorizontal: 8 },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  link: { color: 'blue' },
});