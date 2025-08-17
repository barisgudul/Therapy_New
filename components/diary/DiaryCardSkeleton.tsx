// components/diary/DiaryCardSkeleton.tsx
import React from "react";
import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

export const DiaryCardSkeleton = () => {
  return (
    <View style={{ marginBottom: 20, borderRadius: 24, overflow: 'hidden' }}>
      <SkeletonPlaceholder borderRadius={4} highlightColor="#E0E7FF" backgroundColor="#F0F3FA">
        <SkeletonPlaceholder.Item width="100%" height={150} borderRadius={24} />
      </SkeletonPlaceholder>
    </View>
  );
};


