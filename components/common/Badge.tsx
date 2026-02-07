import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, withOpacity } from '@/constants/colors';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: withOpacity(colors.primary, 0.1),
        color: colors.primaryDark,
        dotColor: colors.primary,
      };
    case 'secondary':
      return {
        backgroundColor: withOpacity(colors.secondary, 0.1),
        color: colors.secondaryDark,
        dotColor: colors.secondary,
      };
    case 'success':
      return {
        backgroundColor: withOpacity(colors.success, 0.1),
        color: colors.successDark,
        dotColor: colors.success,
      };
    case 'warning':
      return {
        backgroundColor: withOpacity(colors.warning, 0.1),
        color: colors.warningDark,
        dotColor: colors.warning,
      };
    case 'error':
      return {
        backgroundColor: withOpacity(colors.error, 0.1),
        color: colors.errorDark,
        dotColor: colors.error,
      };
    case 'info':
      return {
        backgroundColor: withOpacity(colors.info, 0.1),
        color: colors.infoDark,
        dotColor: colors.info,
      };
    case 'neutral':
    default:
      return {
        backgroundColor: colors.gray100,
        color: colors.gray700,
        dotColor: colors.gray500,
      };
  }
};

const getSizeStyles = (size: BadgeSize) => {
  switch (size) {
    case 'sm':
      return {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        fontSize: 11,
        dotSize: 6,
      };
    case 'lg':
      return {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        fontSize: 14,
        dotSize: 8,
      };
    case 'md':
    default:
      return {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        fontSize: 12,
        dotSize: 7,
      };
  }
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  dot = false,
}) => {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              width: sizeStyles.dotSize,
              height: sizeStyles.dotSize,
              backgroundColor: variantStyles.dotColor,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: variantStyles.color,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  dot: {
    borderRadius: borderRadius.full,
  },
  label: {
    fontWeight: '600',
  },
});
