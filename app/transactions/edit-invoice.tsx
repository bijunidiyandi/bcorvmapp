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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { salesInvoiceApi } from '@/lib/services/sqlite-transactions';
import { customerApi, itemApi } from '@/lib/services/sqlite-api';
import { ItemWithDetails, PaymentMode } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils/format';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  X,
  Check,
  Save,
} from 'lucide-react-native';

interface SaleItem {
  item: ItemWithDetails;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

export default function EditInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoice, setInvoice] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [showPaymentModeSelector, setShowPaymentModeSelector] = useState(false);

  const [showItemSelector, setShowItemSelector] = useState(false);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [searchItemTerm, setSearchItemTerm] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (id) {
      // Reset state when switching invoices
      setSaleItems([]);
      setPaidAmount('0');
      setNotes('');
      setPaymentMode('cash');
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await salesInvoiceApi.getById(id as string);

      if (!data) {
        showToast('Invoice not found', 'error');
        router.back();
        return;
      }

      console.log('=== LOADING INVOICE ===');
      console.log('Invoice ID:', id);
      console.log('Invoice Number:', data.invoice_number);
      console.log('Total Amount:', data.total_amount);
      console.log('Paid Amount from DB:', data.paid_amount);
      console.log('Payment Status:', data.payment_status);
      console.log('Balance Amount:', data.balance_amount);
      console.log('=======================');

      setInvoice(data);
      setPaymentMode(data.payment_mode || 'cash');
      const paidAmountStr = data.paid_amount?.toString() || '0';
      console.log('Setting paidAmount state to:', paidAmountStr);
      setPaidAmount(paidAmountStr);
      setNotes(data.notes || '');

      const loadedItems: SaleItem[] = [];
      for (const invItem of data.items || []) {
        const itemDetails = await itemApi.getById(invItem.item_id);
        if (itemDetails) {
          loadedItems.push({
            item: itemDetails,
            quantity: invItem.quantity,
            unit_price: invItem.unit_price,
            discount_percent: invItem.discount_percentage || 0,
            tax_rate: invItem.tax_percentage || 0,
          });
        }
      }
      setSaleItems(loadedItems);
    } catch (error) {
      console.error('Error loading invoice:', error);
      showToast('Failed to load invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchItems = async (term: string) => {
    if (!term.trim()) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    try {
      const data = await itemApi.search(term);
      setItems(data);
    } catch (err) {
      console.error('Error searching items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(searchItemTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchItemTerm]);

  const getTaxRateFromCode = (taxcode: string): number => {
    switch (taxcode?.toLowerCase()) {
      case 'tx5':
        return 5;
      case 'tx10':
        return 10;
      default:
        return 0;
    }
  };

  const handleAddItem = (item: ItemWithDetails) => {
    const existingItem = saleItems.find((si) => si.item.id === item.id);
    if (existingItem) {
      showToast('This item is already in the sale list', 'warning');
      return;
    }

    const taxRate = getTaxRateFromCode(item.taxcode);

    setSaleItems([
      ...saleItems,
      {
        item,
        quantity: 1,
        unit_price: item.price || 0,
        discount_percent: 0,
        tax_rate: taxRate,
      },
    ]);
    setShowItemSelector(false);
    setSearchItemTerm('');
    setItems([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    value: string
  ) => {
    const newItems = [...saleItems];
    const numValue = parseFloat(value) || 0;
    newItems[index][field] = numValue;
    setSaleItems(newItems);
  };

  const calculateLineTotal = (saleItem: SaleItem): number => {
    const subtotal = saleItem.quantity * saleItem.unit_price;
    const discountAmount = (subtotal * saleItem.discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * saleItem.tax_rate) / 100;
    return afterDiscount + taxAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    saleItems.forEach((saleItem) => {
      const itemSubtotal = saleItem.quantity * saleItem.unit_price;
      const discountAmount = (itemSubtotal * saleItem.discount_percent) / 100;
      const afterDiscount = itemSubtotal - discountAmount;
      const taxAmount = (afterDiscount * saleItem.tax_rate) / 100;

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalTax += taxAmount;
    });

    const total = subtotal - totalDiscount + totalTax;
    const paid = parseFloat(paidAmount) || 0;
    const balance = total - paid;

    return { subtotal, totalDiscount, totalTax, total, paid, balance };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (saleItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const invalidItems = saleItems.filter((item) => item.quantity <= 0 || item.unit_price < 0);
    if (invalidItems.length > 0) {
      showToast('All items must have valid quantity and price', 'error');
      return;
    }

    const totals = calculateTotals();

    setSaving(true);
    try {
      const updatedInvoice = {
        payment_mode: paymentMode,
        subtotal: totals.subtotal,
        tax_amount: totals.totalTax,
        discount_amount: totals.totalDiscount,
        total_amount: totals.total,
        paid_amount: totals.paid,
        balance_amount: totals.balance,
        payment_status: (totals.balance === 0 ? 'paid' : totals.balance < totals.total ? 'partial' : 'unpaid') as 'paid' | 'partial' | 'unpaid',
        notes: notes || null,
      };

      console.log('Saving invoice with paid_amount:', totals.paid, 'from paidAmount:', paidAmount);

      const updatedItems = saleItems.map((item) => {
        const itemSubtotal = item.quantity * item.unit_price;
        const discountAmount = (itemSubtotal * item.discount_percent) / 100;
        const afterDiscount = itemSubtotal - discountAmount;
        const taxAmount = (afterDiscount * item.tax_rate) / 100;
        const lineTotal = afterDiscount + taxAmount;

        return {
          item_id: item.item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percent,
          discount_amount: discountAmount,
          tax_percentage: item.tax_rate,
          tax_amount: taxAmount,
          total_price: lineTotal,
        };
      });

      await salesInvoiceApi.update(id as string, updatedInvoice, updatedItems);
      showToast('Invoice updated successfully', 'success');
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error updating invoice:', error);
      showToast('Failed to update invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Edit Invoice</Text>
          <Text style={styles.subtitle}>{invoice?.invoice_number}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          {invoice?.customer_name ? (
            <Text style={styles.customerText}>{invoice.customer_name}</Text>
          ) : invoice?.walk_in_customer_name ? (
            <Text style={styles.customerText}>Walk-in: {invoice.walk_in_customer_name}</Text>
          ) : (
            <Text style={styles.customerText}>No customer</Text>
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowItemSelector(true)}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {saleItems.length === 0 ? (
            <Text style={styles.emptyText}>No items added yet</Text>
          ) : (
            <View style={styles.itemsList}>
              {saleItems.map((saleItem, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{saleItem.item.name}</Text>
                      <Text style={styles.itemCode}>{saleItem.item.code}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Qty *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.quantity.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'quantity', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.unit_price.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'unit_price', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Disc %</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.discount_percent.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'discount_percent', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemTaxLabel}>Tax: {saleItem.tax_rate}%</Text>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(calculateLineTotal(saleItem))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {saleItems.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(totals.totalDiscount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.totalTax)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totals.total)}</Text>
            </View>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details *</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Mode</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPaymentModeSelector(true)}
            >
              <Text style={styles.selectorText}>
                {paymentMode === 'cash' ? 'Cash' : paymentMode === 'credit' ? 'Credit' : 'Card'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount Paid (BHD)</Text>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                Debug: State={paidAmount}, DB={invoice?.paid_amount}
              </Text>
              <TextInput
                style={styles.input}
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="numeric"
                placeholder="0.000"
              />
            </View>
            {parseFloat(paidAmount || '0') > totals.total && totals.total > 0 && (
              <Text style={styles.warningText}>
                Amount paid exceeds total. Change will be {formatCurrency(parseFloat(paidAmount) - totals.total)}
              </Text>
            )}
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={[styles.balanceValue, totals.balance > 0 && styles.balancePositive]}>
              {formatCurrency(Math.max(0, totals.balance))}
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes here"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title={saving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            disabled={saving || saleItems.length === 0}
            icon={Save}
          />
        </View>
      </ScrollView>

      <Modal visible={showItemSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity onPress={() => setShowItemSelector(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items by name or code"
                value={searchItemTerm}
                onChangeText={setSearchItemTerm}
                autoFocus
              />
            </View>
            {loadingItems ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleAddItem(item)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>{item.code}</Text>
                    </View>
                    <Text style={styles.listItemPrice}>{formatCurrency(item.price || 0)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchItemTerm ? (
                    <Text style={styles.emptyListText}>No items found</Text>
                  ) : (
                    <Text style={styles.emptyListText}>Start typing to search items</Text>
                  )
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentModeSelector} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Mode</Text>
              <TouchableOpacity onPress={() => setShowPaymentModeSelector(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.paymentModeList}>
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('cash');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Cash</Text>
                </View>
                {paymentMode === 'cash' && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('credit');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Credit</Text>
                </View>
                {paymentMode === 'credit' && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('card');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Card</Text>
                </View>
                {paymentMode === 'card' && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
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
    gap: 20,
  },
  section: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  customerText: {
    fontSize: 16,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.white,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTaxLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.white,
  },
  selectorText: {
    fontSize: 16,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  balancePositive: {
    color: colors.error,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  footer: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginBottom: 0,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  loader: {
    marginTop: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 12,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 6,
    lineHeight: 18,
  },
  paymentModeList: {
    padding: 20,
  },
  paymentModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});
