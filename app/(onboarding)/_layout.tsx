// app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router/stack';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="step1" options={{ headerShown: false }} />
      <Stack.Screen name="step2" options={{ headerShown: false }} />
      <Stack.Screen name="step3" options={{ headerShown: false }} /> 
      <Stack.Screen name="step4" options={{ headerShown: false }} /> 
      <Stack.Screen name="summary" options={{ headerShown: false }} />
    </Stack>
  );
} 