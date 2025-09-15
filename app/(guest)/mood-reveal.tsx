// app/(guest)/mood-reveal.tsx
import { useRouter } from "expo-router/";
import React from "react";
import MoodComparisonScreen from "../(app)/feel/mood_comparison";

export default function MoodReveal() {
  const router = useRouter();

  const onContinueToSoftWall = () => {
    router.replace("/(guest)/softwall");
  };

  return (
    <MoodComparisonScreen onContinueToSoftWall={onContinueToSoftWall} />
  );
}