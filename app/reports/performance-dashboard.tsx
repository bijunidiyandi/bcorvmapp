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
  salesReturnApi,
  dayCloseApi,
} from '@/lib/services/sqlite-api';
import {
  SalesInvoiceWithDetails,
  Van,
  SalesReturnWithDetails,
  DayCloseWithDetails,
} from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { MetricCard } from '@/components/common/MetricCard';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Package,
  AlertTriangle,
  Award,
  BarChart3,
  Target,
} from 'lucide-react-native';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface VanPerformance {
  van: Van;
  totalSales: number;
  totalInvoices: number;
  totalCollected: number;
  totalPending: number;
  averageInvoiceValue: number;
  collectionRate: number;
}

interface ItemPerformance {
  itemId: string;
  itemName: string;
  itemCode: string;
  totalQuantity: number;
  totalRevenue: number;
  invoiceCount: number;
}

export default function PerformanceDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);
  const [returns, setReturns] = useState<SalesReturnWithDetails[]>([]);
  const [dayCloses, setDayCloses] = useState<DayCloseWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [invoicesData, returnsData, dayClosesData, vansData] =
        await Promise.all([
          salesInvoiceApi.getAll(),
          salesReturnApi.getAll(),
          dayCloseApi.getAll(),
          vanApi.getAll(),
        ]);
      setInvoices(invoicesData);
      setReturns(returnsData);
      setDayCloses(dayClosesData);
      setVans(vansData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const quarterAgo = new Date(today);
    quarterAgo.setMonth(quarterAgo.getMonth() - 3);

    switch (dateRange) {
      case 'today':
        return date.toDateString() === today.toDateString();
      case 'week':
        return date >= weekAgo;
      case 'month':
        return date >= monthAgo;
      case 'quarter':
        return date >= quarterAgo;
      case 'all':
      default:
        return true;
    }
  };

  const filteredInvoices = invoices.filter((inv) =>
    getDateRangeFilter(inv.invoice_date)
  );

  const filteredReturns = returns.filter((ret) =>
    getDateRangeFilter(ret.return_date)
  );

  const filteredDayCloses = dayCloses.filter((dc) =>
    getDateRangeFilter(dc.close_date)
  );

  // Calculate overall metrics
  const totalSales = filteredInvoices.reduce(
    (sum, inv) => sum + inv.total_amount,
    0
  );
  const totalCollected = filteredInvoices.reduce(
    (sum, inv) => sum + inv.paid_amount,
    0
  );
  const totalPending = filteredInvoices.reduce(
    (sum, inv) => sum + inv.balance_amount,
    0
  );
  const totalReturns = filteredReturns.reduce(
    (sum, ret) => sum + ret.total_amount,
    0
  );
  const totalExpenses = filteredDayCloses.reduce(
    (sum, dc) => sum + dc.total_expenses,
    0
  );

  const netSales = totalSales - totalReturns;
  const collectionRate =
    totalSales > 0 ? (totalCollected / totalSales) * 100 : 0;
  const returnRate = totalSales > 0 ? (totalReturns / totalSales) * 100 : 0;
  const averageInvoiceValue =
    filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;

  // Calculate van-wise performance
  const vanPerformance: VanPerformance[] = vans
    .map((van) => {
      const vanInvoices = filteredInvoices.filter(
        (inv) => inv.van_id === van.id
      );
      const vanSales = vanInvoices.reduce(
        (sum, inv) => sum + inv.total_amount,
        0
      );
      const vanCollected = vanInvoices.reduce(
        (sum, inv) => sum + inv.paid_amount,
        0
      );
      const vanPending = vanInvoices.reduce(
        (sum, inv) => sum + inv.balance_amount,
        0
      );

      return {
        van,
        totalSales: vanSales,
        totalInvoices: vanInvoices.length,
        totalCollected: vanCollected,
        totalPending: vanPending,
        averageInvoiceValue:
          vanInvoices.length > 0 ? vanSales / vanInvoices.length : 0,
        collectionRate: vanSales > 0 ? (vanCollected / vanSales) * 100 : 0,
      };
    })
    .filter((vp) => vp.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales);

  // Calculate top selling items
  const itemMap = new Map<string, ItemPerformance>();
  filteredInvoices.forEach((invoice) => {
    invoice.items?.forEach((lineItem) => {
      const itemId = lineItem.item_id;
      const existing = itemMap.get(itemId);
      if (existing) {
        existing.totalQuantity += lineItem.quantity;
        existing.totalRevenue += lineItem.line_total;
        existing.invoiceCount += 1;
      } else if (lineItem.item) {
        itemMap.set(itemId, {
          itemId,
          itemName: lineItem.item.name,
          itemCode: lineItem.item.code,
          totalQuantity: lineItem.quantity,
          totalRevenue: lineItem.line_total,
          invoiceCount: 1,
        });
      }
    });
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

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
          <Text style={styles.headerTitle}>Performance Dashboard</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading performance data..." />
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
        <Text style={styles.headerTitle}>Performance Dashboard</Text>
        <View style={styles.backButton} />
      </View>

      {error && (
        <ErrorMessage message={error} onRetry={loadData} style={styles.error} />
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Period</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={dateRange}
              onValueChange={(value) => setDateRange(value)}
              style={styles.picker}
            >
              <Picker.Item label="Today" value="today" />
              <Picker.Item label="Last 7 Days" value="week" />
              <Picker.Item label="Last 30 Days" value="month" />
              <Picker.Item label="Last 90 Days" value="quarter" />
              <Picker.Item label="All Time" value="all" />
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <MetricCard
                title="Total Sales"
                value={formatCurrency(totalSales)}
                icon={DollarSign}
                color={colors.success}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Net Sales"
                value={formatCurrency(netSales)}
                icon={TrendingUp}
                color={colors.info}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Collections"
                value={formatCurrency(totalCollected)}
                icon={Target}
                color={colors.primary}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Pending"
                value={formatCurrency(totalPending)}
                icon={AlertTriangle}
                color={colors.warning}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <Card style={styles.keyMetricsCard}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Collection Rate</Text>
              <View style={styles.metricValueContainer}>
                <Text
                  style={[
                    styles.metricValue,
                    collectionRate >= 80
                      ? styles.metricGood
                      : collectionRate >= 60
                      ? styles.metricWarning
                      : styles.metricBad,
                  ]}
                >
                  {collectionRate.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Return Rate</Text>
              <View style={styles.metricValueContainer}>
                <Text
                  style={[
                    styles.metricValue,
                    returnRate <= 5
                      ? styles.metricGood
                      : returnRate <= 10
                      ? styles.metricWarning
                      : styles.metricBad,
                  ]}
                >
                  {returnRate.toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Avg. Invoice Value</Text>
              <View style={styles.metricValueContainer}>
                <Text style={styles.metricValue}>
                  {formatCurrency(averageInvoiceValue)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Invoices</Text>
              <View style={styles.metricValueContainer}>
                <Text style={styles.metricValue}>
                  {filteredInvoices.length}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Total Expenses</Text>
              <View style={styles.metricValueContainer}>
                <Text style={[styles.metricValue, styles.expenseValue]}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Van Performance</Text>
          {vanPerformance.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No van performance data</Text>
            </Card>
          ) : (
            <View style={styles.vanList}>
              {vanPerformance.map((vp, index) => (
                <Card key={vp.van.id} style={styles.vanCard}>
                  <View style={styles.vanHeader}>
                    <View style={styles.vanHeaderLeft}>
                      <View
                        style={[
                          styles.rankBadge,
                          index === 0 && styles.rankBadgeGold,
                          index === 1 && styles.rankBadgeSilver,
                          index === 2 && styles.rankBadgeBronze,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankText,
                            index < 3 && styles.rankTextTop,
                          ]}
                        >
                          #{index + 1}
                        </Text>
                      </View>
                      <View style={styles.vanInfo}>
                        <Text style={styles.vanNumber}>
                          {vp.van.vehicle_number}
                        </Text>
                        <Text style={styles.vanCode}>{vp.van.code}</Text>
                      </View>
                    </View>
                    {index < 3 && (
                      <Award
                        size={24}
                        color={
                          index === 0
                            ? '#FFD700'
                            : index === 1
                            ? '#C0C0C0'
                            : '#CD7F32'
                        }
                      />
                    )}
                  </View>
                  <View style={styles.vanMetrics}>
                    <View style={styles.vanMetricItem}>
                      <Text style={styles.vanMetricLabel}>Sales</Text>
                      <Text style={styles.vanMetricValue}>
                        {formatCurrency(vp.totalSales)}
                      </Text>
                    </View>
                    <View style={styles.vanMetricItem}>
                      <Text style={styles.vanMetricLabel}>Invoices</Text>
                      <Text style={styles.vanMetricValue}>
                        {vp.totalInvoices}
                      </Text>
                    </View>
                    <View style={styles.vanMetricItem}>
                      <Text style={styles.vanMetricLabel}>
                        Collection Rate
                      </Text>
                      <Text
                        style={[
                          styles.vanMetricValue,
                          vp.collectionRate >= 80
                            ? styles.metricGood
                            : vp.collectionRate >= 60
                            ? styles.metricWarning
                            : styles.metricBad,
                        ]}
                      >
                        {vp.collectionRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Selling Items</Text>
          {topItems.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No items sold yet</Text>
            </Card>
          ) : (
            <View style={styles.itemsList}>
              {topItems.map((item, index) => (
                <Card key={item.itemId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemRank}>
                      <Text style={styles.itemRankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <Text style={styles.itemCode}>{item.itemCode}</Text>
                    </View>
                  </View>
                  <View style={styles.itemMetrics}>
                    <View style={styles.itemMetricItem}>
                      <Text style={styles.itemMetricLabel}>Revenue</Text>
                      <Text style={styles.itemMetricValue}>
                        {formatCurrency(item.totalRevenue)}
                      </Text>
                    </View>
                    <View style={styles.itemMetricItem}>
                      <Text style={styles.itemMetricLabel}>Quantity</Text>
                      <Text style={styles.itemMetricValue}>
                        {item.totalQuantity}
                      </Text>
                    </View>
                    <View style={styles.itemMetricItem}>
                      <Text style={styles.itemMetricLabel}>Orders</Text>
                      <Text style={styles.itemMetricValue}>
                        {item.invoiceCount}
                      </Text>
                    </View>
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
  error: { margin: 20 },
  scrollView: { flex: 1 },
  filterSection: { padding: 20, paddingBottom: 12 },
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
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: { width: '48%' },
  keyMetricsCard: { marginBottom: 0 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricLabel: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  metricValueContainer: { alignItems: 'flex-end' },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  metricGood: { color: colors.success },
  metricWarning: { color: colors.warning },
  metricBad: { color: colors.error },
  expenseValue: { color: colors.error },
  divider: { height: 1, backgroundColor: colors.border },
  vanList: { gap: 12 },
  vanCard: { marginBottom: 0 },
  vanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vanHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeGold: { backgroundColor: '#FFD700' + '30' },
  rankBadgeSilver: { backgroundColor: '#C0C0C0' + '30' },
  rankBadgeBronze: { backgroundColor: '#CD7F32' + '30' },
  rankText: { fontSize: 14, fontWeight: '700', color: colors.text },
  rankTextTop: { color: colors.text },
  vanInfo: { flex: 1 },
  vanNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  vanCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  vanMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  vanMetricItem: { flex: 1 },
  vanMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vanMetricValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemsList: { gap: 12 },
  itemCard: { marginBottom: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemRankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemMetricItem: { flex: 1 },
  itemMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemMetricValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
