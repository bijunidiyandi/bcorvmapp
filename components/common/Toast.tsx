import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';
import { colors, shadows, borderRadius, spacing, withOpacity } from '@/constants/colors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  visible?: boolean;
}

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        backgroundColor: colors.success,
        color: colors.white,
      };
    case 'error':
      return {
        icon: XCircle,
        backgroundColor: colors.error,
        color: colors.white,
      };
    case 'warning':
      return {
        icon: AlertCircle,
        backgroundColor: colors.warning,
        color: colors.white,
      };
    case 'info':
    default:
      return {
        icon: Info,
        backgroundColor: colors.info,
        color: colors.white,
      };
  }
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  visible = true,
}) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!visible) return null;

  const config = getToastConfig(type);
  const Icon = config.icon;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Icon size={20} color={config.color} />
      <Text style={[styles.message, { color: config.color }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
