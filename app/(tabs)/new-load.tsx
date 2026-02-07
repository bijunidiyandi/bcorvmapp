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
import { vanLoadApi, warehouseApi, itemApi } from '@/lib/services/sqlite-api';
import { Warehouse, Item, ItemWithDetails } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  X,
  Check,
} from 'lucide-react-native';

interface LoadItem {
  item: ItemWithDetails;
  quantity: number;
  batch_number: string;
  notes: string;
}

export default function NewLoadScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showWarehouseSelector, setShowWarehouseSelector] = useState(false);
  const [notes, setNotes] = useState('');
  const [loadItems, setLoadItems] = useState<LoadItem[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseApi.getAll();
      setWarehouses(data);
      if (data.length === 1) {
        setSelectedWarehouse(data[0]);
      }
    } catch (err) {
      console.error('Error loading warehouses:', err);
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
      searchItems(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleAddItem = (item: ItemWithDetails) => {
    const existingItem = loadItems.find((li) => li.item.id === item.id);
    if (existingItem) {
      showToast('This item is already in the load list', 'warning');
      return;
    }

    setLoadItems([
      ...loadItems,
      {
        item,
        quantity: 1,
        batch_number: '',
        notes: '',
      },
    ]);
    setShowItemSelector(false);
    setSearchTerm('');
    setItems([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...loadItems];
    newItems.splice(index, 1);
    setLoadItems(newItems);
  };

  const handleUpdateQuantity = (index: number, quantity: string) => {
    const newItems = [...loadItems];
    newItems[index].quantity = parseFloat(quantity) || 0;
    setLoadItems(newItems);
  };

  const handleUpdateBatchNumber = (index: number, batchNumber: string) => {
    const newItems = [...loadItems];
    newItems[index].batch_number = batchNumber;
    setLoadItems(newItems);
  };

  const handleSave = async () => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    if (!selectedWarehouse) {
      showToast('Please select a warehouse', 'error');
      return;
    }

    if (loadItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const invalidItems = loadItems.filter((item) => item.quantity <= 0);
    if (invalidItems.length > 0) {
      showToast('All items must have a quantity greater than 0', 'error');
      return;
    }

    setLoading(true);
    try {
      const vanLoad = {
        van_id: selectedVan.id,
        load_date: new Date().toISOString().split('T')[0],
        warehouse_id: selectedWarehouse.id,
        user_id: selectedVan.user_id!,
        status: 'confirmed' as const,
        notes: notes || null,
      };

      const items = loadItems.map((item) => ({
        item_id: item.item.id,
        quantity: item.quantity,
        batch_number: item.batch_number || null,
        expiry_date: null,
        notes: item.notes || null,
      }));

      await vanLoadApi.create(vanLoad, items);

      showToast('Load created successfully', 'success');
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      console.error('Error creating load:', err);
      showToast(err.message || 'Failed to create load', 'error');
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
          <Text style={styles.headerTitle}>New Load</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Load</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Van</Text>
          <View style={styles.vanInfo}>
            <Text style={styles.vanCode}>{selectedVan.code}</Text>
            <Text style={styles.vanVehicle}>{selectedVan.vehicle_number}</Text>
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
              {selectedWarehouse ? selectedWarehouse.name : 'Select Warehouse'}
            </Text>
          </TouchableOpacity>
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

          {loadItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={styles.emptyItemsText}>No items added yet</Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {loadItems.map((loadItem, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{loadItem.item.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemCode}>{loadItem.item.code}</Text>
                  <View style={styles.itemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Quantity *</Text>
                      <TextInput
                        style={styles.input}
                        value={loadItem.quantity.toString()}
                        onChangeText={(text) => handleUpdateQuantity(index, text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Batch Number</Text>
                      <TextInput
                        style={styles.input}
                        value={loadItem.batch_number}
                        onChangeText={(text) => handleUpdateBatchNumber(index, text)}
                        placeholder="Optional"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this load..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        <Button
          title={loading ? 'Creating Load...' : 'Create Load'}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        />
      </ScrollView>

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
                    {item.location && (
                      <Text style={styles.listItemSubtitle}>{item.location}</Text>
                    )}
                  </View>
                  {selectedWarehouse?.id === item.id && (
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
                  setSearchTerm('');
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
                value={searchTerm}
                onChangeText={setSearchTerm}
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
                        {item.code} • {item.unit?.abbreviation || 'Unit'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchTerm ? 'No items found' : 'Start typing to search...'}
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
    gap: 12,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  notesInput: {
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
