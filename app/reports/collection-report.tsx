import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import {
  salesInvoiceApi,
  vanApi,
  settlementApi,
} from '@/lib/services/sqlite-api';
import {
  SalesInvoiceWithDetails,
  Van,
  SettlementWithDetails,
} from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { MetricCard } from '@/components/common/MetricCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Wallet,
  Filter,
  Calendar,
} from 'lucide-react-native';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function CollectionReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);
  const [settlements, setSettlements] = useState<SettlementWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    vanId: '',
    paymentMode: '',
    paymentStatus: '',
    dateRange: 'all',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [invoicesData, settlementsData, vansData] = await Promise.all([
        salesInvoiceApi.getAll(),
        settlementApi.getAll(),
        vanApi.getAll(),
      ]);
      setInvoices(invoicesData);
      setSettlements(settlementsData);
      setVans(vansData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load collection report data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    switch (filters.dateRange) {
      case 'today':
        return date.toDateString() === today.toDateString();
      case 'yesterday':
        return date.toDateString() === yesterday.toDateString();
      case 'week':
        return date >= weekAgo;
      case 'month':
        return date >= monthAgo;
      case 'all':
      default:
        return true;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (filters.vanId && invoice.van_id !== filters.vanId) return false;
    if (filters.paymentMode && invoice.payment_mode !== filters.paymentMode)
      return false;
    if (
      filters.paymentStatus &&
      invoice.payment_status !== filters.paymentStatus
    )
      return false;
    if (!getDateRangeFilter(invoice.invoice_date)) return false;
    return true;
  });

  const metrics = {
    totalCollected: filteredInvoices.reduce(
      (sum, inv) => sum + inv.paid_amount,
      0
    ),
    totalPending: filteredInvoices.reduce(
      (sum, inv) => sum + inv.balance_amount,
      0
    ),
    cashCollections: filteredInvoices
      .filter((inv) => inv.payment_mode === 'cash')
      .reduce((sum, inv) => sum + inv.paid_amount, 0),
    creditCollections: filteredInvoices
      .filter((inv) => inv.payment_mode === 'credit')
      .reduce((sum, inv) => sum + inv.paid_amount, 0),
    cardCollections: filteredInvoices
      .filter((inv) => inv.payment_mode === 'card')
      .reduce((sum, inv) => sum + inv.paid_amount, 0),
    totalSettlements: settlements
      .filter((s) => {
        if (filters.vanId && s.van_id !== filters.vanId) return false;
        if (!getDateRangeFilter(s.settlement_date)) return false;
        return true;
      })
      .reduce((sum, s) => sum + s.cash_deposited, 0),
  };

  const clearFilters = () => {
    setFilters({
      vanId: '',
      paymentMode: '',
      paymentStatus: '',
      dateRange: 'all',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collection Report</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading collection report..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Report</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Filter size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <ErrorMessage message={error} onRetry={loadData} style={styles.error} />
      )}

      <ScrollView style={styles.scrollView}>
        {showFilters && (
          <Card style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Filters</Text>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Van</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.vanId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, vanId: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Vans" value="" />
                  {vans.map((v) => (
                    <Picker.Item
                      key={v.id}
                      label={v.vehicle_number}
                      value={v.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Payment Mode</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.paymentMode}
                  onValueChange={(value) =>
                    setFilters({ ...filters, paymentMode: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Modes" value="" />
                  <Picker.Item label="Cash" value="cash" />
                  <Picker.Item label="Credit" value="credit" />
                  <Picker.Item label="Card" value="card" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Payment Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.paymentStatus}
                  onValueChange={(value) =>
                    setFilters({ ...filters, paymentStatus: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="Paid" value="paid" />
                  <Picker.Item label="Partial" value="partial" />
                  <Picker.Item label="Unpaid" value="unpaid" />
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.dateRange}
                  onValueChange={(value) =>
                    setFilters({ ...filters, dateRange: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Time" value="all" />
                  <Picker.Item label="Today" value="today" />
                  <Picker.Item label="Yesterday" value="yesterday" />
                  <Picker.Item label="Last 7 Days" value="week" />
                  <Picker.Item label="Last 30 Days" value="month" />
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </Card>
        )}

        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <MetricCard
                title="Total Collected"
                value={formatCurrency(metrics.totalCollected)}
                icon={DollarSign}
                color={colors.success}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Pending"
                value={formatCurrency(metrics.totalPending)}
                icon={AlertCircle}
                color={colors.warning}
              />
            </View>
          </View>

          <Card style={styles.paymentBreakdownCard}>
            <Text style={styles.breakdownTitle}>Payment Mode Breakdown</Text>
            <View style={styles.breakdownList}>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <Wallet size={20} color={colors.success} />
                  <Text style={styles.breakdownLabel}>Cash</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(metrics.cashCollections)}
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <TrendingUp size={20} color={colors.info} />
                  <Text style={styles.breakdownLabel}>Credit</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(metrics.creditCollections)}
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <CreditCard size={20} color={colors.primary} />
                  <Text style={styles.breakdownLabel}>Card</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(metrics.cardCollections)}
                </Text>
              </View>
            </View>
          </Card>

          {metrics.totalSettlements > 0 && (
            <Card style={styles.settlementCard}>
              <View style={styles.settlementHeader}>
                <Calendar size={20} color={colors.accent} />
                <Text style={styles.settlementTitle}>Bank Deposits</Text>
              </View>
              <Text style={styles.settlementValue}>
                {formatCurrency(metrics.totalSettlements)}
              </Text>
            </Card>
          )}
        </View>

        <View style={styles.collectionsSection}>
          <Text style={styles.sectionTitle}>Collection Details</Text>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No Collections Found"
              message="No collections match your filters"
            />
          ) : (
            <View style={styles.collectionsList}>
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} style={styles.collectionCard}>
                  <View style={styles.collectionHeader}>
                    <View style={styles.collectionHeaderLeft}>
                      <Text style={styles.invoiceNumber}>
                        {invoice.invoice_number}
                      </Text>
                      <Text style={styles.invoiceDate}>
                        {formatDate(invoice.invoice_date)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        invoice.payment_status === 'paid' &&
                          styles.statusBadgePaid,
                        invoice.payment_status === 'partial' &&
                          styles.statusBadgePartial,
                        invoice.payment_status === 'unpaid' &&
                          styles.statusBadgeUnpaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          invoice.payment_status === 'paid' &&
                            styles.statusTextPaid,
                          invoice.payment_status === 'partial' &&
                            styles.statusTextPartial,
                          invoice.payment_status === 'unpaid' &&
                            styles.statusTextUnpaid,
                        ]}
                      >
                        {invoice.payment_status?.toUpperCase() || 'UNPAID'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.collectionDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer:</Text>
                      <Text style={styles.detailValue}>
                        {invoice.customer?.name ||
                          invoice.walk_in_customer_name ||
                          'Walk-in'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Van:</Text>
                      <Text style={styles.detailValue}>
                        {invoice.van?.vehicle_number || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Mode:</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          styles.paymentModeText,
                        ]}
                      >
                        {invoice.payment_mode.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(invoice.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Paid Amount:</Text>
                      <Text
                        style={[styles.detailValue, styles.paidAmountText]}
                      >
                        {formatCurrency(invoice.paid_amount)}
                      </Text>
                    </View>
                    {invoice.balance_amount > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          Balance Due:
                        </Text>
                        <Text
                          style={[
                            styles.detailValue,
                            styles.balanceAmountText,
                          ]}
                        >
                          {formatCurrency(invoice.balance_amount)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  filterButton: { padding: 8 },
  error: { margin: 20 },
  scrollView: { flex: 1 },
  filtersCard: { margin: 20, marginBottom: 12 },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  filterGroup: { marginBottom: 16 },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  clearButton: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  metricsContainer: { paddingHorizontal: 20, marginBottom: 20 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1 },
  paymentBreakdownCard: { marginBottom: 12 },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  breakdownList: { gap: 12 },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  settlementCard: { marginBottom: 0 },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  settlementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  settlementValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  collectionsSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  collectionsList: { gap: 12 },
  collectionCard: { marginBottom: 0 },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionHeaderLeft: { flex: 1 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  invoiceDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgePaid: { backgroundColor: colors.success + '20' },
  statusBadgePartial: { backgroundColor: colors.warning + '20' },
  statusBadgeUnpaid: { backgroundColor: colors.error + '20' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPaid: { color: colors.success },
  statusTextPartial: { color: colors.warning },
  statusTextUnpaid: { color: colors.error },
  collectionDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  paymentModeText: { color: colors.primary },
  paidAmountText: { color: colors.success, fontSize: 16 },
  balanceAmountText: { color: colors.warning, fontSize: 16 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
