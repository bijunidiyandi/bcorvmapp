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
import { colors } from '@/constants/colors';
import { warehouseApi } from '@/lib/services/sqlite-api';
import { Warehouse } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { ArrowLeft, Plus, Warehouse as WarehouseIcon, X } from 'lucide-react-native';

const showAlert = (title: string, message: string, onDismiss?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    const AlertModule = require('react-native').Alert;
    if (onDismiss) {
      AlertModule.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
    } else {
      AlertModule.alert(title, message);
    }
  }
};

export default function WarehousesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    is_active: true,
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await warehouseApi.getAll(true);
      setWarehouses(data);
    } catch (err) {
      console.error('Error loading warehouses:', err);
      showAlert('Error', 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({
      code: '',
      name: '',
      location: '',
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location || '',
      is_active: warehouse.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      showAlert('Error', 'Code and name are required');
      return;
    }

    setSaving(true);
    try {
      if (editingWarehouse) {
        await warehouseApi.update(editingWarehouse.id, formData);
      } else {
        await warehouseApi.create(formData);
      }
      await loadWarehouses();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving warehouse:', err);
      showAlert('Error', err.message || 'Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.location && w.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Warehouses</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading warehouses..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Warehouses</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search warehouses..."
          />
        </View>

        {filteredWarehouses.length === 0 ? (
          <EmptyState
            icon={WarehouseIcon}
            title="No Warehouses Found"
            message={
              searchQuery
                ? 'No warehouses match your search'
                : 'Add your first warehouse to get started'
            }
            actionLabel={searchQuery ? undefined : 'Add Warehouse'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredWarehouses.map((warehouse) => (
              <MasterListItem
                key={warehouse.id}
                title={warehouse.name}
                subtitle={`${warehouse.code}${warehouse.location ? ` • ${warehouse.location}` : ''}`}
                isActive={warehouse.is_active}
                onPress={() => handleEdit(warehouse)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
              </Text>
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
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location}
                    onChangeText={(text) => setFormData({ ...formData, location: text })}
                    placeholder="Enter location"
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
              <Button
                title={saving ? 'Saving...' : 'Save'}
                onPress={handleSave}
                disabled={saving}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
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
  toggleGroup: { gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  toggleThumbActive: { marginLeft: 20 },
  toggleLabel: { fontSize: 14, color: colors.text },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: { flex: 1 },
});
