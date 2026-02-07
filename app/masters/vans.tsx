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
import { vanApi, userApi, routeApi, warehouseApi } from '@/lib/services/sqlite-api';
import { Van, User, Route, Warehouse } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { ArrowLeft, Plus, Truck, X, Check } from 'lucide-react-native';

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

export default function VansScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vans, setVans] = useState<Van[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    vehicle_number: '',
    user_id: null as string | null,
    route_id: null as string | null,
    warehouse_id: null as string | null,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vansData, usersData, routesData, warehousesData] = await Promise.all([
        vanApi.getAll(true),
        userApi.getAll(),
        routeApi.getAll(),
        warehouseApi.getAll(),
      ]);
      setVans(vansData);
      setUsers(usersData.filter((u: User) => u.role === 'SALESMAN'));
      setRoutes(routesData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error('Error loading data:', err);
      showAlert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingVan(null);
    setFormData({
      code: '',
      vehicle_number: '',
      user_id: null,
      route_id: null,
      warehouse_id: null,
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (van: Van) => {
    setEditingVan(van);
    setFormData({
      code: van.code,
      vehicle_number: van.vehicle_number,
      user_id: van.user_id,
      route_id: van.route_id,
      warehouse_id: van.warehouse_id,
      is_active: van.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.vehicle_number.trim()) {
      showAlert('Error', 'Code and vehicle number are required');
      return;
    }

    setSaving(true);
    try {
      if (editingVan) {
        await vanApi.update(editingVan.id, formData);
      } else {
        await vanApi.create(formData);
      }
      await loadData();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving van:', err);
      showAlert('Error', err.message || 'Failed to save van');
    } finally {
      setSaving(false);
    }
  };

  const filteredVans = vans.filter(
    (v) =>
      v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vans</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading vans..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vans</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search vans..."
          />
        </View>

        {filteredVans.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No Vans Found"
            message={searchQuery ? 'No vans match your search' : 'Add your first van to get started'}
            actionLabel={searchQuery ? undefined : 'Add Van'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredVans.map((van) => (
              <MasterListItem
                key={van.id}
                title={van.vehicle_number}
                subtitle={van.code}
                isActive={van.is_active}
                onPress={() => handleEdit(van)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVan ? 'Edit Van' : 'Add Van'}</Text>
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
                  <Text style={styles.inputLabel}>Vehicle Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.vehicle_number}
                    onChangeText={(text) => setFormData({ ...formData, vehicle_number: text })}
                    placeholder="Enter vehicle number"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Assign to User</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.user_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, user_id: value || null })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select User" value="" />
                      {users.map((u) => (
                        <Picker.Item key={u.id} label={`${u.user_name} (${u.user_id})`} value={u.id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Route</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.route_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, route_id: value || null })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Route" value="" />
                      {routes.map((r) => (
                        <Picker.Item key={r.id} label={r.name} value={r.id} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Warehouse</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.warehouse_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, warehouse_id: value || null })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Warehouse" value="" />
                      {warehouses.map((w) => (
                        <Picker.Item key={w.id} label={w.name} value={w.id} />
                      ))}
                    </Picker>
                  </View>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: { height: 50 },
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
