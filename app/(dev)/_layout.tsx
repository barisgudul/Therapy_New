// app/(dev)/_layout.tsx
//
// Guard for developer-only screens. These routes stay in the bundle but are
// only reachable in development builds — in a production build any attempt to
// open `/(dev)/...` (e.g. via a deep link) is bounced to the app root.
import { Stack } from "expo-router/stack";
import { useRouter } from "expo-router/";
import { useEffect } from "react";
import { View } from "react-native";

export default function DevLayout() {
  const router = useRouter();

  useEffect(() => {
    if (!__DEV__) {
      router.replace("/");
    }
  }, [router]);

  if (!__DEV__) {
    return <View />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
