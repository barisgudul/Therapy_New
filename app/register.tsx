// app/register.tsx
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
    View,
} from 'react-native';
import { signUpWithEmail } from '../utils/auth';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    Keyboard.dismiss(); // Butona basıldığında klavyeyi kapat
    setLoading(true);
    const user = await signUpWithEmail(email, password);
    if (user) {
      Alert.alert('Hoş Geldin!', 'Kaydın başarıyla oluşturuldu. Seni giriş ekranına yönlendiriyoruz.');
      router.push('/login'); // Kayıt olunca login'e gönder
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.innerContainer}>
          <Text style={styles.title}>Yeni Hesap Oluştur</Text>
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
          <Button title="Kayıt Ol" onPress={handleSignUp} disabled={loading} />

          <View style={styles.linkContainer}>
            <Text>Zaten bir hesabın var mı? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.link}>Giriş Yap</Text>
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