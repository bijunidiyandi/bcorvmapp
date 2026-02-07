import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, withOpacity } from '@/constants/colors';
import { LucideIcon } from 'lucide-react-native';
import { Card } from './Card';

interface MetricCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  onPress?: () => void;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = colors.primary,
  onPress,
  trend,
  trendValue,
}: MetricCardProps) {
  const content = (
    <View style={styles.content}>
      <View style={[styles.iconContainer, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon size={26} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          {trend && trendValue && (
            <View
              style={[
                styles.trendBadge,
                trend === 'up' ? styles.trendUp : styles.trendDown,
              ]}
            >
              <Text
                style={[
                  styles.trendText,
                  trend === 'up' ? styles.trendTextUp : styles.trendTextDown,
                ]}
              >
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return <Card onPress={onPress} style={styles.card}>{content}</Card>;
  }

  return <Card variant="elevated" style={styles.card}>{content}</Card>;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 0,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 2,
    borderRadius: borderRadius.sm,
  },
  trendUp: {
    backgroundColor: withOpacity(colors.success, 0.1),
  },
  trendDown: {
    backgroundColor: withOpacity(colors.error, 0.1),
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendTextUp: {
    color: colors.successDark,
  },
  trendTextDown: {
    color: colors.errorDark,
  },
});
