import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows, withOpacity } from '@/constants/colors';
import { ChevronRight } from 'lucide-react-native';
import { Card } from '../common/Card';

interface MasterListItemProps {
  title: string;
  subtitle?: string;
  badge?: string;
  isActive?: boolean;
  onPress: () => void;
}

export function MasterListItem({
  title,
  subtitle,
  badge,
  isActive = true,
  onPress,
}: MasterListItemProps) {
  return (
    <Card
      onPress={onPress}
      style={[styles.container, !isActive && styles.inactiveContainer]}
      variant="elevated"
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !isActive && styles.inactiveText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, !isActive && styles.inactiveText]}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.rightContent}>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          <ChevronRight
            size={20}
            color={isActive ? colors.textSecondary : colors.border}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inactiveContainer: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inactiveText: {
    color: colors.textLight,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: withOpacity(colors.primary, 0.1),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
