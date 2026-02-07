import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { settlementApi, dayCloseApi, warehouseApi } from '@/lib/services/sqlite-api';
import { DayCloseWithDetails, Warehouse } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils/format';
import {
  ArrowLeft,
  Check,
  X,
  DollarSign,
  Package,
  Building2,
  Calendar,
} from 'lucide-react-native';

export default function SettlementScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingDayCloses, setLoadingDayCloses] = useState(false);

  const [dayCloses, setDayCloses] = useState<DayCloseWithDetails[]>([]);
  const [selectedDayClose, setSelectedDayClose] = useState<DayCloseWithDetails | null>(null);
  const [showDayCloseSelector, setShowDayCloseSelector] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehouseSelector, setShowWarehouseSelector] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [stockReturnedValue, setStockReturnedValue] = useState('0');
  const [cashDeposited, setCashDeposited] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedVan) {
      loadDayCloses();
      loadWarehouses();
    }
  }, [selectedVan]);

  useEffect(() => {
    if (selectedDayClose) {
      setCashDeposited(selectedDayClose.variance.toString());
    }
  }, [selectedDayClose]);

  const loadDayCloses = async () => {
    if (!selectedVan) return;

    setLoadingDayCloses(true);
    try {
      const data = await dayCloseApi.getAll(selectedVan.id, 'closed');
      setDayCloses(data);
    } catch (err) {
      console.error('Error loading day closes:', err);
      showToast('Failed to load day closes', 'error');
    } finally {
      setLoadingDayCloses(false);
    }
  };

  const loadWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const data = await warehouseApi.getAll();
      setWarehouses(data);
    } catch (err) {
      console.error('Error loading warehouses:', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    if (!selectedDayClose) {
      showToast('Please select a day close', 'error');
      return;
    }

    if (!selectedWarehouse) {
      showToast('Please select a warehouse', 'error');
      return;
    }

    const stockValue = parseFloat(stockReturnedValue) || 0;
    const cashValue = parseFloat(cashDeposited) || 0;

    if (stockValue < 0 || cashValue < 0) {
      showToast('Values cannot be negative', 'error');
      return;
    }

    setLoading(true);
    try {
      const settlement = {
        van_id: selectedVan.id,
        day_close_id: selectedDayClose.id,
        warehouse_id: selectedWarehouse.id,
        settlement_date: new Date().toISOString().split('T')[0],
        stock_returned_value: stockValue,
        cash_deposited: cashValue,
        notes: notes || null,
      };

      await settlementApi.create(settlement);

      await dayCloseApi.update(selectedDayClose.id, { status: 'settled' });

      showToast('Settlement completed successfully', 'success');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('Error creating settlement:', err);
      showToast(err.message || 'Failed to create settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedVan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settlement</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a van first</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.emptyButton}
          />
        </View>
      </View>
    );
  }

  if (loadingDayCloses || loadingWarehouses) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settlement</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading data..." />
      </View>
    );
  }

  if (dayCloses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settlement</Text>
          <View style={styles.backButton} />
        </View>
        <EmptyState
          icon={Calendar}
          title="No Pending Day Closes"
          message="There are no closed days pending settlement for this van."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
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
        <Text style={styles.headerTitle}>Settlement</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Van</Text>
          <View style={styles.vanInfo}>
            <Text style={styles.vanCode}>{selectedVan.code}</Text>
            <Text style={styles.vanVehicle}>{selectedVan.vehicle_number}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Day Close *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowDayCloseSelector(true)}
          >
            <Text
              style={[
                styles.selectorText,
                !selectedDayClose && styles.selectorPlaceholder,
              ]}
            >
              {selectedDayClose
                ? `${selectedDayClose.close_date}`
                : 'Select Day Close'}
            </Text>
          </TouchableOpacity>
        </Card>

        {selectedDayClose && (
          <>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Day Close Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedDayClose.total_sales)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cash Collected</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedDayClose.total_cash_collected)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedDayClose.total_expenses)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Variance</Text>
                <Text
                  style={[
                    styles.summaryTotalValue,
                    selectedDayClose.variance < 0 &&
                      styles.summaryTotalNegative,
                  ]}
                >
                  {formatCurrency(selectedDayClose.variance)}
                </Text>
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Warehouse *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowWarehouseSelector(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedWarehouse && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedWarehouse
                    ? selectedWarehouse.name
                    : 'Select Warehouse'}
                </Text>
              </TouchableOpacity>
              {selectedWarehouse && (
                <View style={styles.warehouseDetails}>
                  <Text style={styles.warehouseCode}>
                    {selectedWarehouse.code}
                  </Text>
                  {selectedWarehouse.location && (
                    <Text style={styles.warehouseInfo}>
                      {selectedWarehouse.location}
                    </Text>
                  )}
                </View>
              )}
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Settlement Details</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputIconContainer}>
                  <Package size={20} color={colors.textSecondary} />
                  <Text style={styles.inputLabel}>Stock Returned Value</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={stockReturnedValue}
                  onChangeText={setStockReturnedValue}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={styles.inputIconContainer}>
                  <DollarSign size={20} color={colors.textSecondary} />
                  <Text style={styles.inputLabel}>Cash Deposited</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={cashDeposited}
                  onChangeText={setCashDeposited}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this settlement..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Card>

            <Button
              title={loading ? 'Creating Settlement...' : 'Create Settlement'}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>

      <Modal
        visible={showDayCloseSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayCloseSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Day Close</Text>
              <TouchableOpacity
                onPress={() => setShowDayCloseSelector(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dayCloses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    setSelectedDayClose(item);
                    setShowDayCloseSelector(false);
                  }}
                >
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>
                      {item.close_date}
                    </Text>
                    <Text style={styles.listItemSubtitle}>
                      Sales: {formatCurrency(item.total_sales)} • Variance:{' '}
                      {formatCurrency(item.variance)}
                    </Text>
                  </View>
                  {selectedDayClose?.id === item.id && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWarehouseSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWarehouseSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Warehouse</Text>
              <TouchableOpacity
                onPress={() => setShowWarehouseSelector(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={warehouses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => {
                    setSelectedWarehouse(item);
                    setShowWarehouseSelector(false);
                  }}
                >
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{item.name}</Text>
                    <Text style={styles.listItemSubtitle}>
                      {item.code}
                      {item.location && ` • ${item.location}`}
                    </Text>
                  </View>
                  {selectedWarehouse?.id === item.id && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>
                    No warehouses found
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={hideToast}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
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
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vanInfo: {
    gap: 4,
  },
  vanCode: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  vanVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  selectorText: {
    fontSize: 16,
    color: colors.text,
  },
  selectorPlaceholder: {
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  summaryTotalNegative: {
    color: colors.error,
  },
  warehouseDetails: {
    gap: 4,
  },
  warehouseCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  warehouseInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputGroup: {
    gap: 6,
  },
  inputIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  emptySearch: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    minWidth: 120,
  },
});
