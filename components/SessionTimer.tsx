import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface SessionTimerProps {
  onSessionEnd: () => void;
  isVisible?: boolean;
}

const SESSION_DURATION = 1 * 60; // 1 minute in seconds (for testing)
const WARNING_TIME = 30; // 30 seconds (for testing)

export default function SessionTimer({ onSessionEnd, isVisible = true }: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [showWarning, setShowWarning] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isVisible) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        
        // Show warning at 5 minutes
        if (newTime === WARNING_TIME && !warningShown) {
          setShowWarning(true);
          setWarningShown(true);
          Alert.alert(
            'Seans Süresi',
            'Terapimizin bitimine 5 dakika kaldı. Son dakikaları değerlendirmek ister misiniz?',
            [
              { text: 'Tamam', style: 'default' }
            ]
          );
        }
        
        // End session at 0
        if (newTime <= 0) {
          clearInterval(timerRef.current!);
          onSessionEnd();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVisible, onSessionEnd, warningShown]);

  // Pulse animation for warning
  useEffect(() => {
    if (showWarning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showWarning, pulseAnim]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((SESSION_DURATION - timeLeft) / SESSION_DURATION) * 100;
  };

  const getTimerColor = () => {
    if (timeLeft <= WARNING_TIME) {
      return '#FF6B6B'; // Red for warning
    }
    return Colors.light.tint;
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={showWarning ? ['#FFE5E5', '#FFF5F5'] : ['#F0F8FF', '#FFFFFF']}
        style={styles.timerContainer}
      >
        <Animated.View style={[styles.timerContent, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={getTimerColor()} 
            style={styles.timerIcon}
          />
          <Text style={[styles.timerText, { color: getTimerColor() }]}>
            {formatTime(timeLeft)}
          </Text>
          {showWarning && (
            <Text style={styles.warningText}>
              Seans bitimine yaklaşıyor
            </Text>
          )}
        </Animated.View>
        
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${getProgressPercentage()}%`,
                  backgroundColor: getTimerColor()
                }
              ]} 
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 120,
    right: 20,
    zIndex: 1000,
  },
  timerContainer: {
    borderRadius: 20,
    padding: 12,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(93,161,217,0.2)',
    minWidth: 80,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerIcon: {
    marginBottom: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
}); 