import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { colors, shadows, borderRadius, spacing } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'gradient';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  onPress?: () => void;
  gradient?: string[];
}

export function Card({ children, style, variant = 'default', onPress, gradient }: CardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scale, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return [styles.card, styles.elevated];
      case 'outlined':
        return [styles.card, styles.outlined];
      case 'gradient':
        return [styles.card, styles.gradientCard];
      default:
        return styles.card;
    }
  };

  const content = (
    <Animated.View style={[getVariantStyle(), style, { transform: [{ scale }] }]}>
      {variant === 'gradient' && gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        >
          {children}
        </LinearGradient>
      ) : (
        children
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.md,
  },
  elevated: {
    ...shadows.lg,
    borderWidth: 0,
  },
  outlined: {
    ...shadows.none,
    borderWidth: 2,
  },
  gradientCard: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 0,
  },
  gradientOverlay: {
    padding: spacing.lg,
  },
});
