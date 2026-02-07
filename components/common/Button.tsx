import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  View,
} from 'react-native';
import { colors, shadows, borderRadius, spacing, withOpacity } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    textStyle,
  ];

  const iconSize = size === 'small' ? 16 : size === 'large' ? 22 : 18;
  const iconColor = ['outline', 'ghost', 'link'].includes(variant) ? colors.primary : colors.white;

  const renderContent = () => (
    <>
      {Icon && iconPosition === 'left' && (
        <Icon size={iconSize} color={iconColor} style={{ marginRight: spacing.sm }} />
      )}
      <Text style={textStyles}>{title}</Text>
      {Icon && iconPosition === 'right' && (
        <Icon size={iconSize} color={iconColor} style={{ marginLeft: spacing.sm }} />
      )}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          buttonStyles,
          {
            transform: [{ scale }],
            opacity: disabled ? 0.5 : opacity,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={['outline', 'ghost', 'link'].includes(variant) ? colors.primary : colors.white}
          />
        ) : (
          <View style={styles.content}>{renderContent()}</View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  button_secondary: {
    backgroundColor: colors.secondary,
    ...shadows.sm,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  button_danger: {
    backgroundColor: colors.error,
    ...shadows.sm,
  },
  button_ghost: {
    backgroundColor: withOpacity(colors.primary, 0.1),
  },
  button_link: {
    backgroundColor: 'transparent',
  },
  button_small: {
    height: 36,
    paddingHorizontal: spacing.md,
  },
  button_medium: {
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  button_large: {
    height: 52,
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: colors.white,
  },
  text_secondary: {
    color: colors.white,
  },
  text_outline: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.white,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_link: {
    color: colors.primary,
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
});
