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
  vanStockApi,
  vanApi,
  itemCategoryApi,
  itemApi,
} from '@/lib/services/sqlite-api';
import {
  VanStockWithDetails,
  Van,
  ItemCategory,
  ItemWithDetails,
} from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { MetricCard } from '@/components/common/MetricCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import {
  ArrowLeft,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Filter,
} from 'lucide-react-native';
import { formatCurrency } from '@/lib/utils/format';

export default function StockReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<VanStockWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    vanId: '',
    categoryId: '',
    itemId: '',
    showLowStock: false,
    showOutOfStock: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [stockData, vansData, categoriesData, itemsData] =
        await Promise.all([
          vanStockApi.getAll(),
          vanApi.getAll(),
          itemCategoryApi.getAll(),
          itemApi.getAll(),
        ]);
      setStockItems(stockData);
      setVans(vansData);
      setCategories(categoriesData);
      setItems(itemsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load stock report data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stockItems.filter((stock) => {
    if (filters.vanId && stock.van_id !== filters.vanId) return false;
    if (
      filters.categoryId &&
      stock.item?.category_id !== filters.categoryId
    )
      return false;
    if (filters.itemId && stock.item_id !== filters.itemId) return false;
    if (filters.showLowStock && stock.quantity > 10) return false;
    if (filters.showOutOfStock && stock.quantity !== 0) return false;
    return true;
  });

  const metrics = {
    totalItems: filteredStocks.length,
    totalStockValue: filteredStocks.reduce(
      (sum, stock) => sum + (stock.item?.price || 0) * stock.quantity,
      0
    ),
    lowStockItems: filteredStocks.filter(
      (stock) => stock.quantity > 0 && stock.quantity <= 10
    ).length,
    outOfStockItems: filteredStocks.filter((stock) => stock.quantity === 0)
      .length,
  };

  const clearFilters = () => {
    setFilters({
      vanId: '',
      categoryId: '',
      itemId: '',
      showLowStock: false,
      showOutOfStock: false,
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
          <Text style={styles.headerTitle}>Stock Report</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading stock report..." />
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
        <Text style={styles.headerTitle}>Stock Report</Text>
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
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.categoryId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, categoryId: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Categories" value="" />
                  {categories.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Item</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.itemId}
                  onValueChange={(value) =>
                    setFilters({ ...filters, itemId: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="All Items" value="" />
                  {items.map((i) => (
                    <Picker.Item key={i.id} label={i.name} value={i.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Stock Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={
                    filters.showOutOfStock
                      ? 'out-of-stock'
                      : filters.showLowStock
                        ? 'low-stock'
                        : 'all'
                  }
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      showLowStock: value === 'low-stock',
                      showOutOfStock: value === 'out-of-stock',
                    });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="All Levels" value="all" />
                  <Picker.Item label="Low Stock (≤10)" value="low-stock" />
                  <Picker.Item label="Out of Stock" value="out-of-stock" />
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
                title="Total Items"
                value={metrics.totalItems.toString()}
                icon={Package}
                color={colors.primary}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Stock Value"
                value={formatCurrency(metrics.totalStockValue)}
                icon={DollarSign}
                color={colors.success}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <MetricCard
                title="Low Stock"
                value={metrics.lowStockItems.toString()}
                icon={AlertTriangle}
                color={colors.warning}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Out of Stock"
                value={metrics.outOfStockItems.toString()}
                icon={TrendingDown}
                color={colors.error}
              />
            </View>
          </View>
        </View>

        <View style={styles.stockSection}>
          <Text style={styles.sectionTitle}>Stock Items</Text>

          {filteredStocks.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No Stock Found"
              message="No stock items match your filters"
            />
          ) : (
            <View style={styles.stockList}>
              {filteredStocks.map((stock) => (
                <Card key={stock.id} style={styles.stockCard}>
                  <View style={styles.stockHeader}>
                    <View style={styles.stockHeaderLeft}>
                      <Text style={styles.itemName}>
                        {stock.item?.name || 'Unknown Item'}
                      </Text>
                      <Text style={styles.itemCategory}>
                        {stock.item?.category?.name || 'No Category'}
                      </Text>
                    </View>
                    <View style={styles.stockHeaderRight}>
                      <Text
                        style={[
                          styles.quantity,
                          stock.quantity === 0 && styles.quantityZero,
                          stock.quantity > 0 &&
                            stock.quantity <= 10 &&
                            styles.quantityLow,
                        ]}
                      >
                        {stock.quantity}
                      </Text>
                      <Text style={styles.quantityLabel}>
                        {stock.item?.unit?.abbreviation || 'units'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stockDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Van:</Text>
                      <Text style={styles.detailValue}>
                        {stock.van?.vehicle_number || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Unit Price:</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(stock.item?.price || 0)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Value:</Text>
                      <Text
                        style={[styles.detailValue, styles.totalValueText]}
                      >
                        {formatCurrency(
                          (stock.item?.price || 0) * stock.quantity
                        )}
                      </Text>
                    </View>
                    {stock.batch_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Batch:</Text>
                        <Text style={styles.detailValue}>
                          {stock.batch_number}
                        </Text>
                      </View>
                    )}
                    {stock.expiry_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Expiry:</Text>
                        <Text style={styles.detailValue}>
                          {stock.expiry_date}
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
  stockSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  stockList: { gap: 12 },
  stockCard: { marginBottom: 0 },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stockHeaderLeft: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockHeaderRight: { alignItems: 'flex-end' },
  quantity: { fontSize: 24, fontWeight: '700', color: colors.success },
  quantityZero: { color: colors.error },
  quantityLow: { color: colors.warning },
  quantityLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stockDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  totalValueText: { color: colors.success },
});
