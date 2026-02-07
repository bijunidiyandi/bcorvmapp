import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import {
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  PieChart,
  ChevronRight,
} from 'lucide-react-native';

export default function ReportsScreen() {
  const router = useRouter();

  const reportTypes = [
    {
      id: 'sales-report',
      title: 'Sales Report',
      description: 'View sales performance',
      icon: TrendingUp,
      color: colors.success,
      route: '/reports/sales-report',
    },
    {
      id: 'stock-report',
      title: 'Stock Report',
      description: 'View inventory levels',
      icon: Package,
      color: colors.primary,
      route: '/reports/stock-report',
    },
    {
      id: 'collection-report',
      title: 'Collection Report',
      description: 'View cash collections',
      icon: DollarSign,
      color: colors.accent,
      route: '/reports/collection-report',
    },
    {
      id: 'performance-dashboard',
      title: 'Performance Dashboard',
      description: 'Overall performance metrics',
      icon: BarChart3,
      color: colors.info,
      route: '/reports/performance-dashboard',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Business intelligence',
      icon: PieChart,
      color: colors.secondary,
      route: '/reports/analytics',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Business insights and analytics</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {reportTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            activeOpacity={0.7}
            onPress={() => type.route && router.push(type.route as any)}
            disabled={!type.route}
          >
            <Card style={!type.route ? styles.cardDisabled : styles.card}>
              <View style={styles.cardContent}>
                <View
                  style={[styles.iconContainer, { backgroundColor: type.color + '20' }]}
                >
                  <type.icon size={24} color={type.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.cardTitle}>{type.title}</Text>
                  <Text style={styles.cardDescription}>{type.description}</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
