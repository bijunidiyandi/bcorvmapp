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
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { salesReturnApi, customerApi, itemApi, salesInvoiceApi } from '@/lib/services/sqlite-api';
import { CustomerWithDetails, ItemWithDetails, SalesInvoiceWithDetails, ReturnType } from '@/lib/types/database';
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
  Search,
  Package,
  X,
  Check,
} from 'lucide-react-native';

interface ReturnItem {
  item: ItemWithDetails;
  quantity: number;
  unit_price: number;
}

const generateReturnNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = date.getTime().toString().slice(-6);
  return `RET-${year}${month}${day}-${time}`;
};

export default function SalesReturnScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceWithDetails | null>(null);
  const [showInvoiceSelector, setShowInvoiceSelector] = useState(false);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [searchItemTerm, setSearchItemTerm] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  const [returnType, setReturnType] = useState<ReturnType>('good');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [returnNumber] = useState(generateReturnNumber());

  const searchCustomers = async (term: string) => {
    if (!term.trim()) {
      setCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const data = await customerApi.search(term);
      setCustomers(data);
    } catch (err) {
      console.error('Error searching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(searchCustomerTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchCustomerTerm]);

  const loadInvoices = async (customerId: string) => {
    setLoadingInvoices(true);
    try {
      const allInvoices = await salesInvoiceApi.getAll(selectedVan?.id);
      const customerInvoices = allInvoices.filter((inv) => inv.customer_id === customerId);
      setInvoices(customerInvoices);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleCustomerSelect = (customer: CustomerWithDetails) => {
    setSelectedCustomer(customer);
    setShowCustomerSelector(false);
    setSearchCustomerTerm('');
    setCustomers([]);
    loadInvoices(customer.id);
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

  const handleAddItem = (item: ItemWithDetails) => {
    const existingItem = returnItems.find((ri) => ri.item.id === item.id);
    if (existingItem) {
      showToast('This item is already in the return list', 'warning');
      return;
    }

    setReturnItems([
      ...returnItems,
      {
        item,
        quantity: 1,
        unit_price: item.price || 0,
      },
    ]);
    setShowItemSelector(false);
    setSearchItemTerm('');
    setItems([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...returnItems];
    newItems.splice(index, 1);
    setReturnItems(newItems);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'unit_price',
    value: string
  ) => {
    const newItems = [...returnItems];
    const numValue = parseFloat(value) || 0;
    newItems[index][field] = numValue;
    setReturnItems(newItems);
  };

  const calculateLineTotal = (item: ReturnItem) => {
    return item.quantity * item.unit_price;
  };

  const calculateTotal = () => {
    return returnItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const handleSave = async () => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    if (!selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (returnItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const invalidItems = returnItems.filter((item) => item.quantity <= 0 || item.unit_price < 0);
    if (invalidItems.length > 0) {
      showToast('All items must have valid quantity and price', 'error');
      return;
    }

    if (!reason.trim()) {
      showToast('Please provide a reason for the return', 'error');
      return;
    }

    setLoading(true);
    try {
      const salesReturn = {
        return_number: returnNumber,
        van_id: selectedVan.id,
        customer_id: selectedCustomer.id,
        invoice_id: selectedInvoice?.id || null,
        return_date: new Date().toISOString().split('T')[0],
        return_type: returnType,
        total_amount: calculateTotal(),
        reason: reason,
        notes: notes || null,
      };

      const items = returnItems.map((item) => ({
        item_id: item.item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: calculateLineTotal(item),
        batch_number: null,
      }));

      await salesReturnApi.create(salesReturn, items);

      showToast(`Return ${returnNumber} created successfully`, 'success');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('Error creating return:', err);
      showToast(err.message || 'Failed to create return', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedVan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales Return</Text>
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

  const total = calculateTotal();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Return</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Return Number</Text>
          <Text style={styles.returnNumber}>{returnNumber}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Van</Text>
          <View style={styles.vanInfo}>
            <Text style={styles.vanCode}>{selectedVan.code}</Text>
            <Text style={styles.vanVehicle}>{selectedVan.vehicle_number}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCustomerSelector(true)}
          >
            <Text
              style={[
                styles.selectorText,
                !selectedCustomer && styles.selectorPlaceholder,
              ]}
            >
              {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
            </Text>
          </TouchableOpacity>
          {selectedCustomer && (
            <View style={styles.customerDetails}>
              <Text style={styles.customerCode}>{selectedCustomer.code}</Text>
              {selectedCustomer.phone && (
                <Text style={styles.customerInfo}>{selectedCustomer.phone}</Text>
              )}
            </View>
          )}
        </Card>

        {selectedCustomer && invoices.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice (Optional)</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowInvoiceSelector(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  !selectedInvoice && styles.selectorPlaceholder,
                ]}
              >
                {selectedInvoice ? selectedInvoice.invoice_number : 'Select Invoice (Optional)'}
              </Text>
            </TouchableOpacity>
            {selectedInvoice && (
              <View style={styles.invoiceDetails}>
                <Text style={styles.invoiceInfo}>
                  Date: {selectedInvoice.invoice_date}
                </Text>
                <Text style={styles.invoiceInfo}>
                  Amount: {formatCurrency(selectedInvoice.total_amount)}
                </Text>
              </View>
            )}
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Return Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={returnType}
              onValueChange={(value) => setReturnType(value as ReturnType)}
              style={styles.picker}
            >
              <Picker.Item label="Good Condition" value="good" />
              <Picker.Item label="Damaged" value="damage" />
            </Picker>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowItemSelector(true)}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {returnItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={styles.emptyItemsText}>No items added yet</Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {returnItems.map((returnItem, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{returnItem.item.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemCode}>{returnItem.item.code}</Text>
                  <View style={styles.itemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Quantity *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={returnItem.quantity.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'quantity', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={returnItem.unit_price.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'unit_price', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(calculateLineTotal(returnItem))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {returnItems.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Return Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Amount</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Reason *</Text>
          <TextInput
            style={styles.textArea}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for return..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        <Button
          title={loading ? 'Creating Return...' : 'Create Return'}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        />
      </ScrollView>

      <Modal
        visible={showCustomerSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomerSelector(false);
                  setSearchCustomerTerm('');
                  setCustomers([]);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchCustomerTerm}
                onChangeText={setSearchCustomerTerm}
                placeholder="Search customers by name, code, or phone..."
                autoFocus
              />
            </View>
            {loadingCustomers ? (
              <View style={styles.modalLoading}>
                <Loading message="Searching..." />
              </View>
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleCustomerSelect(item)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>
                        {item.code} {item.phone && `• ${item.phone}`}
                      </Text>
                    </View>
                    {selectedCustomer?.id === item.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchCustomerTerm ? 'No customers found' : 'Start typing to search...'}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInvoiceSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInvoiceSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Invoice</Text>
              <TouchableOpacity
                onPress={() => setShowInvoiceSelector(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {loadingInvoices ? (
              <View style={styles.modalLoading}>
                <Loading message="Loading invoices..." />
              </View>
            ) : (
              <FlatList
                data={invoices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      setSelectedInvoice(item);
                      setShowInvoiceSelector(false);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{item.invoice_number}</Text>
                      <Text style={styles.listItemSubtitle}>
                        {item.invoice_date} • {formatCurrency(item.total_amount)}
                      </Text>
                    </View>
                    {selectedInvoice?.id === item.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>No invoices found</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showItemSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowItemSelector(false);
                  setSearchItemTerm('');
                  setItems([]);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchItemTerm}
                onChangeText={setSearchItemTerm}
                placeholder="Search items by name, code, or barcode..."
                autoFocus
              />
            </View>
            {loadingItems ? (
              <View style={styles.modalLoading}>
                <Loading message="Searching..." />
              </View>
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
                      <Text style={styles.listItemSubtitle}>
                        {item.code} • {formatCurrency(item.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchItemTerm ? 'No items found' : 'Start typing to search...'}
                    </Text>
                  </View>
                )}
              />
            )}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  returnNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
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
  customerDetails: {
    gap: 4,
  },
  customerCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  invoiceDetails: {
    gap: 4,
  },
  invoiceInfo: {
    fontSize: 14,
    color: colors.textSecondary,
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
  emptyItems: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyItemsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 80,
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
  modalLoading: {
    height: 200,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
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
