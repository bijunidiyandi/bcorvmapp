import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import {
  PackagePlus,
  FileText,
  PackageMinus,
  Calendar,
  Handshake,
  Receipt,
  PlayCircle,
  ChevronRight,
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const router = useRouter();

  const transactionTypes = [
    {
      id: 'session-management',
      title: 'Session Management',
      description: 'Start/Stop customer session',
      icon: PlayCircle,
      color: colors.success,
      route: '/transactions/session-management',
    },
    {
      id: 'van-load',
      title: 'Van Load',
      description: 'Load inventory to van',
      icon: PackagePlus,
      color: colors.primary,
      route: '/new-load',
    },
    {
      id: 'sales-invoice',
      title: 'Sales Invoice',
      description: 'Create new sales invoice',
      icon: FileText,
      color: colors.success,
      route: '/new-sale',
    },
    {
      id: 'view-invoices',
      title: 'View Invoices',
      description: 'View and edit saved invoices',
      icon: FileText,
      color: colors.info,
      route: '/transactions/invoices',
    },
    {
      id: 'sales-return',
      title: 'Sales Return',
      description: 'Process sales returns',
      icon: PackageMinus,
      color: colors.error,
      route: '/sales-return',
    },
    {
      id: 'receipt',
      title: 'Receipt Entry',
      description: 'Record customer payments',
      icon: Receipt,
      color: colors.accent,
      route: '/transactions/receipt-entry',
    },
    {
      id: 'day-close',
      title: 'Day Close',
      description: 'Close daily operations',
      icon: Calendar,
      color: colors.info,
      route: '/day-close',
    },
    {
      id: 'settlement',
      title: 'Settlement',
      description: 'Settle day close',
      icon: Handshake,
      color: colors.secondary,
      route: '/settlement',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Manage van sales operations</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {transactionTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            activeOpacity={0.7}
            onPress={() => type.route && router.push(type.route as any)}
          >
            <Card style={styles.card}>
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
