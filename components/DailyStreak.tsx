import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Colors } from '../constants/Colors';

interface DailyStreakProps {
  refreshKey?: number;
  onStreakUpdate?: (streak: number) => void;
}

export default function DailyStreak({ refreshKey = 0, onStreakUpdate }: DailyStreakProps) {
  const [filled, setFilled] = useState<Set<string>>(new Set());

  const weekKeys = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [refreshKey]);

  useEffect(() => {
    (async () => {
      const done = new Set<string>();
      let streakCount = 0;
      
      for (const k of weekKeys) {
        const hasMood = await AsyncStorage.getItem(`mood-${k}`);
        const hasSession = await AsyncStorage.getItem(`session-${k}`);
        
        if (hasMood || hasSession) {
          done.add(k);
          streakCount++;
        }
      }
      
      setFilled(done);
      onStreakUpdate?.(streakCount);
    })();
  }, [weekKeys, onStreakUpdate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GÜNLÜK SERİ</Text>
      <View style={styles.streakContainer}>
        {weekKeys.map((k, index) => (
          <View key={k} style={styles.dayContainer}>
            <Text style={styles.dayText}>
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][index]}
            </Text>
            {filled.has(k) ? (
              <Animatable.View 
                animation="zoomIn" 
                duration={400} 
                style={[styles.dot, styles.dotActive]}
              />
            ) : (
              <View style={[styles.dot, styles.dotInactive]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.tint,
    marginBottom: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 6,
  },
  dayText: {
    fontSize: 12,
    color: '#6c7580',
    fontWeight: '500',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dotActive: {
    backgroundColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dotInactive: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
}); 