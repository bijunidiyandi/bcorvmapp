import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Animated,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, borderRadius, spacing, withOpacity, shadows } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  containerStyle,
  required = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = React.useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.error : colors.inputBorder, colors.inputBorderFocus],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          error && styles.inputError,
          { borderColor },
        ]}
      >
        {LeftIcon && (
          <LeftIcon
            size={20}
            color={isFocused ? colors.primary : colors.textLight}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, LeftIcon && styles.inputWithLeftIcon]}
          placeholderTextColor={colors.inputPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {RightIcon && (
          <RightIcon
            size={20}
            color={isFocused ? colors.primary : colors.textLight}
            style={styles.rightIcon}
          />
        )}
      </Animated.View>
      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  labelContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  inputWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    color: colors.error,
  },
});
