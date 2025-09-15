// app/(guest)/_layout.tsx
import { Stack } from 'expo-router/stack';

export default function GuestLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
