import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { dayCloseApi, salesInvoiceApi } from '@/lib/services/sqlite-api';
import { ExpenseType } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils/format';
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  Receipt,
  TrendingDown,
} from 'lucide-react-native';

interface Expense {
  expense_type: ExpenseType;
  amount: number;
  description: string;
}

export default function DayCloseScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [calculatingTotals, setCalculatingTotals] = useState(false);

  const [closeDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCashCollected, setTotalCashCollected] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [variance, setVariance] = useState(0);
  const [openingStockValue, setOpeningStockValue] = useState('0');
  const [closingStockValue, setClosingStockValue] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedVan) {
      calculateTotals();
    }
  }, [selectedVan]);

  useEffect(() => {
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    setTotalExpenses(total);
    setVariance(totalCashCollected - total);
  }, [expenses, totalCashCollected]);

  const calculateTotals = async () => {
    if (!selectedVan) return;

    setCalculatingTotals(true);
    try {
      const invoices = await salesInvoiceApi.getAll(selectedVan.id, closeDate, closeDate);

      const sales = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const cash = invoices
        .filter((inv) => inv.payment_mode === 'cash')
        .reduce((sum, inv) => sum + inv.paid_amount, 0);

      setTotalSales(sales);
      setTotalCashCollected(cash);
      setVariance(cash);
    } catch (err) {
      console.error('Error calculating totals:', err);
      showToast('Failed to calculate totals', 'error');
    } finally {
      setCalculatingTotals(false);
    }
  };

  const handleAddExpense = () => {
    setExpenses([
      ...expenses,
      { expense_type: 'fuel', amount: 0, description: '' },
    ]);
  };

  const handleRemoveExpense = (index: number) => {
    const newExpenses = [...expenses];
    newExpenses.splice(index, 1);
    setExpenses(newExpenses);
  };

  const handleUpdateExpense = (
    index: number,
    field: keyof Expense,
    value: string | number
  ) => {
    const newExpenses = [...expenses];
    if (field === 'amount') {
      newExpenses[index][field] = parseFloat(value as string) || 0;
    } else {
      newExpenses[index][field] = value as any;
    }
    setExpenses(newExpenses);
  };

  const handleSave = async () => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    const invalidExpenses = expenses.filter((exp) => exp.amount <= 0);
    if (invalidExpenses.length > 0) {
      showToast('All expenses must have a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const dayClose = {
        van_id: selectedVan.id,
        close_date: closeDate,
        total_sales: totalSales,
        total_cash_collected: totalCashCollected,
        total_expenses: totalExpenses,
        variance: variance,
        opening_stock_value: parseFloat(openingStockValue) || 0,
        closing_stock_value: parseFloat(closingStockValue) || 0,
        status: 'closed' as const,
        notes: notes || null,
      };

      await dayCloseApi.create(dayClose, expenses);

      showToast('Day close completed successfully', 'success');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('Error creating day close:', err);
      showToast(err.message || 'Failed to create day close', 'error');
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
          <Text style={styles.headerTitle}>Day Close</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Day Close</Text>
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
          <Text style={styles.sectionTitle}>Close Date</Text>
          <Text style={styles.dateText}>{closeDate}</Text>
        </Card>

        {calculatingTotals ? (
          <Card style={styles.section}>
            <Loading message="Calculating totals..." />
          </Card>
        ) : (
          <>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Sales Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconContainer}>
                  <Receipt size={20} color={colors.primary} />
                  <Text style={styles.summaryLabel}>Total Sales</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalSales)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconContainer}>
                  <DollarSign size={20} color={colors.success} />
                  <Text style={styles.summaryLabel}>Cash Collected</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totalCashCollected)}
                </Text>
              </View>
            </Card>

            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expenses</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddExpense}
                >
                  <Plus size={20} color={colors.primary} />
                  <Text style={styles.addButtonText}>Add Expense</Text>
                </TouchableOpacity>
              </View>

              {expenses.length === 0 ? (
                <View style={styles.emptyExpenses}>
                  <TrendingDown size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyExpensesText}>
                    No expenses added yet
                  </Text>
                </View>
              ) : (
                <View style={styles.expensesList}>
                  {expenses.map((expense, index) => (
                    <View key={index} style={styles.expenseCard}>
                      <View style={styles.expenseHeader}>
                        <Text style={styles.expenseTitle}>
                          Expense {index + 1}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveExpense(index)}
                        >
                          <Trash2 size={20} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Type *</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={expense.expense_type}
                            onValueChange={(value) =>
                              handleUpdateExpense(index, 'expense_type', value)
                            }
                            style={styles.picker}
                          >
                            <Picker.Item label="Fuel" value="fuel" />
                            <Picker.Item label="Parking" value="parking" />
                            <Picker.Item label="Toll" value="toll" />
                            <Picker.Item label="Other" value="other" />
                          </Picker>
                        </View>
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Amount *</Text>
                        <TextInput
                          style={styles.input}
                          value={expense.amount.toString()}
                          onChangeText={(text) =>
                            handleUpdateExpense(index, 'amount', text)
                          }
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Description</Text>
                        <TextInput
                          style={styles.input}
                          value={expense.description}
                          onChangeText={(text) =>
                            handleUpdateExpense(index, 'description', text)
                          }
                          placeholder="Enter description..."
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Expenses</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Cash Variance</Text>
              <View style={styles.varianceContainer}>
                <Text
                  style={[
                    styles.varianceValue,
                    variance < 0 && styles.varianceNegative,
                  ]}
                >
                  {formatCurrency(variance)}
                </Text>
                <Text style={styles.varianceLabel}>
                  Cash Collected - Expenses
                </Text>
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Stock Value</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Opening Stock Value</Text>
                <TextInput
                  style={styles.input}
                  value={openingStockValue}
                  onChangeText={setOpeningStockValue}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Closing Stock Value</Text>
                <TextInput
                  style={styles.input}
                  value={closingStockValue}
                  onChangeText={setClosingStockValue}
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
                placeholder="Add any notes about this day close..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </Card>

            <Button
              title={loading ? 'Closing Day...' : 'Close Day'}
              onPress={handleSave}
              disabled={loading}
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyExpenses: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyExpensesText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputGroup: {
    gap: 6,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  varianceContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  varianceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success,
  },
  varianceNegative: {
    color: colors.error,
  },
  varianceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
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
