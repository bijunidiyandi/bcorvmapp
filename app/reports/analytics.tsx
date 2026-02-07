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
  customerApi,
  routeApi,
  itemApi,
} from '@/lib/services/sqlite-api';
import {
  SalesInvoiceWithDetails,
  CustomerWithDetails,
  Route,
  ItemWithDetails,
} from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  MapPin,
  Package,
  Calendar,
  Percent,
  Activity,
} from 'lucide-react-native';
import { formatCurrency } from '@/lib/utils/format';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';

interface WeeklySales {
  weekStart: string;
  weekEnd: string;
  totalSales: number;
  invoiceCount: number;
  averageInvoice: number;
}

interface CustomerInsight {
  customer: CustomerWithDetails;
  totalRevenue: number;
  invoiceCount: number;
  averageOrderValue: number;
  lastPurchaseDate: string;
}

interface RouteAnalysis {
  route: Route;
  totalRevenue: number;
  customerCount: number;
  invoiceCount: number;
  averagePerCustomer: number;
}

interface CategorySales {
  categoryId: string;
  categoryName: string;
  totalRevenue: number;
  totalQuantity: number;
  itemCount: number;
  sharePercentage: number;
}

interface PaymentAnalysis {
  cash: number;
  credit: number;
  totalSales: number;
  cashPercentage: number;
  creditPercentage: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [invoicesData, customersData, routesData, itemsData] =
        await Promise.all([
          salesInvoiceApi.getAll(),
          customerApi.getAll(),
          routeApi.getAll(),
          itemApi.getAll(),
        ]);
      setInvoices(invoicesData);
      setCustomers(customersData);
      setRoutes(routesData);
      setItems(itemsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load analytics data');
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

  const weeklySalesData: WeeklySales[] = (() => {
    const weekMap = new Map<string, WeeklySales>();

    filteredInvoices.forEach((invoice) => {
      const date = parseISO(invoice.invoice_date);
      const weekStartDate = startOfWeek(date, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = format(weekStartDate, 'yyyy-MM-dd');

      const existing = weekMap.get(weekKey);
      if (existing) {
        existing.totalSales += invoice.total_amount;
        existing.invoiceCount += 1;
      } else {
        weekMap.set(weekKey, {
          weekStart: format(weekStartDate, 'MMM dd'),
          weekEnd: format(weekEndDate, 'MMM dd'),
          totalSales: invoice.total_amount,
          invoiceCount: 1,
          averageInvoice: 0,
        });
      }
    });

    const weeks = Array.from(weekMap.values());
    weeks.forEach((week) => {
      week.averageInvoice = week.totalSales / week.invoiceCount;
    });

    return weeks.sort(
      (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
    );
  })();

  const customerInsights: CustomerInsight[] = customers
    .map((customer) => {
      const customerInvoices = filteredInvoices.filter(
        (inv) => inv.customer_id === customer.id
      );
      const totalRevenue = customerInvoices.reduce(
        (sum, inv) => sum + inv.total_amount,
        0
      );

      if (customerInvoices.length === 0) return null;

      const lastInvoice = customerInvoices.reduce((latest, inv) =>
        new Date(inv.invoice_date) > new Date(latest.invoice_date)
          ? inv
          : latest
      );

      return {
        customer,
        totalRevenue,
        invoiceCount: customerInvoices.length,
        averageOrderValue: totalRevenue / customerInvoices.length,
        lastPurchaseDate: lastInvoice.invoice_date,
      };
    })
    .filter((insight): insight is CustomerInsight => insight !== null)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  const routeAnalysis: RouteAnalysis[] = routes
    .map((route) => {
      const routeCustomers = customers.filter(
        (c) => c.route_id === route.id
      );
      const routeInvoices = filteredInvoices.filter((inv) =>
        routeCustomers.some((c) => c.id === inv.customer_id)
      );
      const totalRevenue = routeInvoices.reduce(
        (sum, inv) => sum + inv.total_amount,
        0
      );

      if (totalRevenue === 0) return null;

      return {
        route,
        totalRevenue,
        customerCount: routeCustomers.length,
        invoiceCount: routeInvoices.length,
        averagePerCustomer:
          routeCustomers.length > 0
            ? totalRevenue / routeCustomers.length
            : 0,
      };
    })
    .filter((analysis): analysis is RouteAnalysis => analysis !== null)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const categorySales: CategorySales[] = (() => {
    const categoryMap = new Map<string, CategorySales>();
    let totalSalesRevenue = 0;

    filteredInvoices.forEach((invoice) => {
      invoice.items?.forEach((lineItem) => {
        if (lineItem.item && lineItem.item.category_id) {
          const catId = lineItem.item.category_id;
          const matchingItem = items.find((i) => i.id === lineItem.item_id);
          const catName =
            matchingItem?.category?.name || `Category ${catId}`;
          const existing = categoryMap.get(catId);

          if (existing) {
            existing.totalRevenue += lineItem.line_total;
            existing.totalQuantity += lineItem.quantity;
            existing.itemCount += 1;
          } else {
            categoryMap.set(catId, {
              categoryId: catId,
              categoryName: catName,
              totalRevenue: lineItem.line_total,
              totalQuantity: lineItem.quantity,
              itemCount: 1,
              sharePercentage: 0,
            });
          }
          totalSalesRevenue += lineItem.line_total;
        }
      });
    });

    const categories = Array.from(categoryMap.values());
    categories.forEach((cat) => {
      cat.sharePercentage =
        totalSalesRevenue > 0 ? (cat.totalRevenue / totalSalesRevenue) * 100 : 0;
    });

    return categories.sort((a, b) => b.totalRevenue - a.totalRevenue);
  })();

  const paymentAnalysis: PaymentAnalysis = (() => {
    const cash = filteredInvoices.reduce(
      (sum, inv) => sum + inv.paid_amount,
      0
    );
    const totalSales = filteredInvoices.reduce(
      (sum, inv) => sum + inv.total_amount,
      0
    );
    const credit = totalSales - cash;

    return {
      cash,
      credit,
      totalSales,
      cashPercentage: totalSales > 0 ? (cash / totalSales) * 100 : 0,
      creditPercentage: totalSales > 0 ? (credit / totalSales) * 100 : 0,
    };
  })();

  const growthMetrics = (() => {
    if (weeklySalesData.length < 2) return null;

    const lastWeek = weeklySalesData[weeklySalesData.length - 1];
    const previousWeek = weeklySalesData[weeklySalesData.length - 2];

    const salesGrowth =
      previousWeek.totalSales > 0
        ? ((lastWeek.totalSales - previousWeek.totalSales) /
            previousWeek.totalSales) *
          100
        : 0;

    const invoiceGrowth =
      previousWeek.invoiceCount > 0
        ? ((lastWeek.invoiceCount - previousWeek.invoiceCount) /
            previousWeek.invoiceCount) *
          100
        : 0;

    return {
      salesGrowth,
      invoiceGrowth,
      lastWeekSales: lastWeek.totalSales,
      previousWeekSales: previousWeek.totalSales,
    };
  })();

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
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading analytics..." />
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
        <Text style={styles.headerTitle}>Analytics</Text>
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
              <Picker.Item label="Last 7 Days" value="week" />
              <Picker.Item label="Last 30 Days" value="month" />
              <Picker.Item label="Last 90 Days" value="quarter" />
              <Picker.Item label="All Time" value="all" />
            </Picker>
          </View>
        </View>

        {growthMetrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Growth Trends</Text>
            <View style={styles.growthGrid}>
              <Card style={styles.growthCard}>
                <View style={styles.growthHeader}>
                  <View
                    style={[
                      styles.growthIconContainer,
                      growthMetrics.salesGrowth >= 0
                        ? styles.growthPositive
                        : styles.growthNegative,
                    ]}
                  >
                    {growthMetrics.salesGrowth >= 0 ? (
                      <TrendingUp size={20} color={colors.success} />
                    ) : (
                      <TrendingDown size={20} color={colors.error} />
                    )}
                  </View>
                  <Text style={styles.growthLabel}>Sales Growth</Text>
                </View>
                <Text
                  style={[
                    styles.growthValue,
                    growthMetrics.salesGrowth >= 0
                      ? styles.growthValuePositive
                      : styles.growthValueNegative,
                  ]}
                >
                  {growthMetrics.salesGrowth >= 0 ? '+' : ''}
                  {growthMetrics.salesGrowth.toFixed(1)}%
                </Text>
                <Text style={styles.growthSubtext}>Week over week</Text>
              </Card>
              <Card style={styles.growthCard}>
                <View style={styles.growthHeader}>
                  <View
                    style={[
                      styles.growthIconContainer,
                      growthMetrics.invoiceGrowth >= 0
                        ? styles.growthPositive
                        : styles.growthNegative,
                    ]}
                  >
                    {growthMetrics.invoiceGrowth >= 0 ? (
                      <TrendingUp size={20} color={colors.success} />
                    ) : (
                      <TrendingDown size={20} color={colors.error} />
                    )}
                  </View>
                  <Text style={styles.growthLabel}>Order Growth</Text>
                </View>
                <Text
                  style={[
                    styles.growthValue,
                    growthMetrics.invoiceGrowth >= 0
                      ? styles.growthValuePositive
                      : styles.growthValueNegative,
                  ]}
                >
                  {growthMetrics.invoiceGrowth >= 0 ? '+' : ''}
                  {growthMetrics.invoiceGrowth.toFixed(1)}%
                </Text>
                <Text style={styles.growthSubtext}>Week over week</Text>
              </Card>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Sales Trend</Text>
          {weeklySalesData.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No sales data available</Text>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                {weeklySalesData.map((week, index) => {
                  const maxSales = Math.max(
                    ...weeklySalesData.map((w) => w.totalSales)
                  );
                  const heightPercent = (week.totalSales / maxSales) * 100;

                  return (
                    <View key={index} style={styles.barContainer}>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max(heightPercent, 5)}%`,
                            },
                          ]}
                        >
                          <Text style={styles.barValue}>
                            {formatCurrency(week.totalSales)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.barLabel}>
                        {week.weekStart} - {week.weekEnd}
                      </Text>
                      <Text style={styles.barSubLabel}>
                        {week.invoiceCount} orders
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Analysis</Text>
          <Card>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTotal}>
                {formatCurrency(paymentAnalysis.totalSales)}
              </Text>
              <Text style={styles.paymentSubtitle}>Total Sales</Text>
            </View>
            <View style={styles.paymentBars}>
              <View style={styles.paymentBarRow}>
                <View style={styles.paymentBarLabel}>
                  <View
                    style={[styles.paymentDot, { backgroundColor: colors.success }]}
                  />
                  <Text style={styles.paymentLabelText}>Cash</Text>
                </View>
                <View style={styles.paymentBarContainer}>
                  <View
                    style={[
                      styles.paymentBar,
                      {
                        width: `${paymentAnalysis.cashPercentage}%`,
                        backgroundColor: colors.success,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.paymentValue}>
                  {paymentAnalysis.cashPercentage.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.paymentBarRow}>
                <View style={styles.paymentBarLabel}>
                  <View
                    style={[styles.paymentDot, { backgroundColor: colors.warning }]}
                  />
                  <Text style={styles.paymentLabelText}>Credit</Text>
                </View>
                <View style={styles.paymentBarContainer}>
                  <View
                    style={[
                      styles.paymentBar,
                      {
                        width: `${paymentAnalysis.creditPercentage}%`,
                        backgroundColor: colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.paymentValue}>
                  {paymentAnalysis.creditPercentage.toFixed(0)}%
                </Text>
              </View>
            </View>
            <View style={styles.paymentFooter}>
              <View style={styles.paymentFooterItem}>
                <Text style={styles.paymentFooterLabel}>Cash Collected</Text>
                <Text style={styles.paymentFooterValue}>
                  {formatCurrency(paymentAnalysis.cash)}
                </Text>
              </View>
              <View style={styles.paymentFooterItem}>
                <Text style={styles.paymentFooterLabel}>Credit Pending</Text>
                <Text style={styles.paymentFooterValue}>
                  {formatCurrency(paymentAnalysis.credit)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 Customers</Text>
          {customerInsights.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No customer data</Text>
            </Card>
          ) : (
            <View style={styles.customerList}>
              {customerInsights.map((insight, index) => (
                <Card key={insight.customer.id} style={styles.customerCard}>
                  <View style={styles.customerHeader}>
                    <View style={styles.customerRank}>
                      <Text style={styles.customerRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {insight.customer.name}
                      </Text>
                      <Text style={styles.customerCode}>
                        {insight.customer.code}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.customerMetrics}>
                    <View style={styles.customerMetricItem}>
                      <Text style={styles.customerMetricLabel}>Revenue</Text>
                      <Text style={styles.customerMetricValue}>
                        {formatCurrency(insight.totalRevenue)}
                      </Text>
                    </View>
                    <View style={styles.customerMetricItem}>
                      <Text style={styles.customerMetricLabel}>Orders</Text>
                      <Text style={styles.customerMetricValue}>
                        {insight.invoiceCount}
                      </Text>
                    </View>
                    <View style={styles.customerMetricItem}>
                      <Text style={styles.customerMetricLabel}>Avg Order</Text>
                      <Text style={styles.customerMetricValue}>
                        {formatCurrency(insight.averageOrderValue)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Performance</Text>
          {routeAnalysis.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No route data</Text>
            </Card>
          ) : (
            <View style={styles.routeList}>
              {routeAnalysis.map((analysis) => (
                <Card key={analysis.route.id} style={styles.routeCard}>
                  <View style={styles.routeHeader}>
                    <View style={styles.routeIconContainer}>
                      <MapPin size={20} color={colors.primary} />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName}>
                        {analysis.route.name}
                      </Text>
                      <Text style={styles.routeCode}>
                        {analysis.route.code}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetrics}>
                    <View style={styles.routeMetricItem}>
                      <Text style={styles.routeMetricLabel}>Revenue</Text>
                      <Text style={styles.routeMetricValue}>
                        {formatCurrency(analysis.totalRevenue)}
                      </Text>
                    </View>
                    <View style={styles.routeMetricItem}>
                      <Text style={styles.routeMetricLabel}>Customers</Text>
                      <Text style={styles.routeMetricValue}>
                        {analysis.customerCount}
                      </Text>
                    </View>
                    <View style={styles.routeMetricItem}>
                      <Text style={styles.routeMetricLabel}>Avg/Customer</Text>
                      <Text style={styles.routeMetricValue}>
                        {formatCurrency(analysis.averagePerCustomer)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Distribution</Text>
          {categorySales.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No category data</Text>
            </Card>
          ) : (
            <View style={styles.categoryList}>
              {categorySales.map((category) => (
                <Card key={category.categoryId} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryIconContainer}>
                      <Package size={20} color={colors.secondary} />
                    </View>
                    <Text style={styles.categoryName}>
                      {category.categoryName}
                    </Text>
                    <Text style={styles.categoryShare}>
                      {category.sharePercentage.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.categoryBarContainer}>
                    <View
                      style={[
                        styles.categoryBar,
                        { width: `${category.sharePercentage}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.categoryMetrics}>
                    <View style={styles.categoryMetricItem}>
                      <Text style={styles.categoryMetricLabel}>Revenue</Text>
                      <Text style={styles.categoryMetricValue}>
                        {formatCurrency(category.totalRevenue)}
                      </Text>
                    </View>
                    <View style={styles.categoryMetricItem}>
                      <Text style={styles.categoryMetricLabel}>Quantity</Text>
                      <Text style={styles.categoryMetricValue}>
                        {category.totalQuantity}
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
  growthGrid: { flexDirection: 'row', gap: 12 },
  growthCard: { flex: 1, marginBottom: 0 },
  growthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  growthIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  growthPositive: { backgroundColor: colors.success + '20' },
  growthNegative: { backgroundColor: colors.error + '20' },
  growthLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  growthValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  growthValuePositive: { color: colors.success },
  growthValueNegative: { color: colors.error },
  growthSubtext: { fontSize: 12, color: colors.textSecondary },
  chartContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    gap: 16,
    minHeight: 250,
  },
  barContainer: { alignItems: 'center', width: 100 },
  barWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'flex-end',
    padding: 8,
    width: '100%',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  barLabel: {
    fontSize: 10,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  barSubLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  paymentHeader: { alignItems: 'center', marginBottom: 20 },
  paymentTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  paymentSubtitle: { fontSize: 14, color: colors.textSecondary },
  paymentBars: { marginBottom: 20, gap: 16 },
  paymentBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentBarLabel: { flexDirection: 'row', alignItems: 'center', width: 80 },
  paymentDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  paymentLabelText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  paymentBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentBar: { height: '100%', borderRadius: 12 },
  paymentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    width: 50,
    textAlign: 'right',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentFooterItem: { flex: 1 },
  paymentFooterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentFooterValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  customerList: { gap: 12 },
  customerCard: { marginBottom: 0 },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  customerCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  customerMetrics: { flexDirection: 'row', gap: 12 },
  customerMetricItem: { flex: 1 },
  customerMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customerMetricValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  routeList: { gap: 12 },
  routeCard: { marginBottom: 0 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: '700', color: colors.text },
  routeCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  routeMetrics: { flexDirection: 'row', gap: 12 },
  routeMetricItem: { flex: 1 },
  routeMetricLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  routeMetricValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  categoryList: { gap: 12 },
  categoryCard: { marginBottom: 0 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryShare: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  categoryBarContainer: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  categoryBar: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  categoryMetrics: { flexDirection: 'row', gap: 12 },
  categoryMetricItem: { flex: 1 },
  categoryMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  categoryMetricValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
