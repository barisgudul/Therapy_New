import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router/';
import { useEffect } from 'react';
import { useColorScheme } from '../hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  /* Bildirime tıklanınca yönlendir */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
  const route = response.notification.request.content.data?.route;
  if (route) router.push(route as any); 
});

    return () => sub.remove();
  }, []);

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}