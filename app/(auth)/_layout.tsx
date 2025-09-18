// app/(auth)/_layout.tsx
import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="analysis"
        options={{
          animation: 'none',
          gestureEnabled: false,
          animationTypeForReplace: 'push',
        }}
      />
    </Stack>
  );
}


