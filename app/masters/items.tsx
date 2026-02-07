import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { itemApi, itemCategoryApi, unitApi } from '@/lib/services/sqlite-api';
import { ItemWithDetails, ItemCategory, Unit } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { ArrowLeft, Plus, Package, X } from 'lucide-react-native';
import { formatCurrency } from '@/lib/utils/format';

export default function ItemsScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category_id: null as string | null,
    unit_id: null as string | null,
    barcode: '',
    price: '',
    tax_rate: '',
    taxcode: 'tx5',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsData, categoriesData, unitsData] = await Promise.all([
        itemApi.getAll(true),
        itemCategoryApi.getAll(),
        unitApi.getAll(),
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      category_id: null,
      unit_id: null,
      barcode: '',
      price: '',
      tax_rate: '5',
      taxcode: 'tx5',
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (item: ItemWithDetails) => {
    setEditingItem(item);
    const taxcode = item.taxcode || 'tx5';
    const taxRate = taxcode === 'tx10' ? '10' : '5';
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      category_id: item.category_id,
      unit_id: item.unit_id,
      barcode: item.barcode || '',
      price: (item.price ?? 0).toString(),
      tax_rate: taxRate,
      taxcode: taxcode,
      is_active: item.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim() || !formData.price.trim()) {
      showToast('Code, name, and price are required', 'error');
      return;
    }

    const price = parseFloat(formData.price);
    const taxRate = parseFloat(formData.tax_rate || '0');

    if (isNaN(price) || price < 0) {
      showToast('Invalid price', 'error');
      return;
    }

    if (isNaN(taxRate) || taxRate < 0) {
      showToast('Invalid tax rate', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category_id,
        unit_id: formData.unit_id,
        barcode: formData.barcode || null,
        price,
        tax_rate: taxRate,
        taxcode: formData.taxcode,
        is_active: formData.is_active,
      };

      if (editingItem) {
        await itemApi.update(editingItem.id, payload);
      } else {
        await itemApi.create(payload as any);
      }
      await loadData();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving item:', err);
      showToast(err.message || 'Failed to save item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.barcode && i.barcode.includes(searchQuery))
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Items</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading items..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Items</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search items..." />
        </View>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Items Found"
            message={searchQuery ? 'No items match your search' : 'Add your first item to get started'}
            actionLabel={searchQuery ? undefined : 'Add Item'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredItems.map((item) => (
              <MasterListItem
                key={item.id}
                title={item.name}
                subtitle={`${item.code} • ${formatCurrency(item.price ?? 0)}`}
                badge={item.category?.name}
                isActive={item.is_active}
                onPress={() => handleEdit(item)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add Item'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalCloseButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollView}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.code}
                    onChangeText={(text) => setFormData({ ...formData, code: text })}
                    placeholder="Enter code"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.category_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value || null })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Category" value="" />
                      {categories.map((c) => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.unit_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, unit_id: value || null })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Unit" value="" />
                      {units.map((u) => (
                        <Picker.Item key={u.id} label={`${u.name} (${u.abbreviation})`} value={u.id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Barcode</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.barcode}
                    onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                    placeholder="Enter barcode"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tax Code *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.taxcode}
                      onValueChange={(value) => {
                        const taxRate = value === 'tx10' ? '10' : '5';
                        setFormData({ ...formData, taxcode: value, tax_rate: taxRate });
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="TX5 - 5% Tax" value="tx5" />
                      <Picker.Item label="TX10 - 10% Tax" value="tx10" />
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.tax_rate}
                    editable={false}
                    placeholder="0.00"
                  />
                </View>

                <View style={styles.toggleGroup}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <TouchableOpacity
                    style={styles.toggle}
                    onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  >
                    <View style={[styles.toggleTrack, formData.is_active && styles.toggleTrackActive]}>
                      <View style={[styles.toggleThumb, formData.is_active && styles.toggleThumbActive]} />
                    </View>
                    <Text style={styles.toggleLabel}>{formData.is_active ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                onPress={() => setShowForm(false)}
                variant="outline"
                style={styles.actionButton}
              />
              <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} style={styles.actionButton} />
            </View>
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
  addButton: { padding: 8 },
  content: { flex: 1 },
  searchContainer: { padding: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalCloseButton: { padding: 4 },
  formScrollView: { maxHeight: 300 },
  form: { padding: 20, gap: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  toggleGroup: { gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  toggleThumbActive: { marginLeft: 20 },
  toggleLabel: { fontSize: 14, color: colors.text },
  formActions: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { flex: 1 },
});
