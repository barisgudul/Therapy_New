// app/(settings)/_layout.tsx

import { Stack } from 'expo-router/';
import React from 'react';

// Bu, bu klasördeki tüm sayfaların nasıl görüneceğini belirler.
export default function SettingsPagesLayout() {
  return (
    <Stack
      screenOptions={{
        // Tüm sayfalarda bir başlık olacak
        headerShown: false,
        // iOS'te 'Geri' butonunun yanında 'Ayarlar' yazacak
        headerBackTitle: 'Ayarlar',
      }}
    >
      {/* Her bir sayfanın başlığının ne olacağını burada belirtiyoruz */}
      <Stack.Screen name="edit-profile" options={{ title: 'Profili Düzenle' }} />
      <Stack.Screen name="security" options={{ title: 'Şifre ve Güvenlik' }} />
      <Stack.Screen name="subscription" options={{ title: 'Abonelik Yönetimi' }} />
    </Stack>
  );
}