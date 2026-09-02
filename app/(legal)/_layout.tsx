// app/(legal)/_layout.tsx
//
// Legal documents live outside the (app) group so they are reachable before
// authentication (from the primer footer, the register consent checkbox, and
// the post-login consent gate).
import { Stack } from "expo-router/stack";

export default function LegalLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
