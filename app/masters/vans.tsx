import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { SearchableSelect } from '@/components/common/SearchableSelect';

import { ArrowLeft, Plus, Truck, X, RefreshCw } from 'lucide-react-native';

import { vanApi, routeApi, warehousesApi, userApi } from '@/lib/services/sqlite-api';
import { createEntity, fetchEntity, updateEntity } from '@/lib/services/webapi';

import type { Van, Route, Warehouse, User } from '@/lib/types/database';

type VanForm = {
  code: string;
  vehiclenumber: string;
  warehousecode: string; 
  usercode: string;      
  routecode: string;     
  active: boolean;
};

const ENTITY_API = 'Vans';

const showAlert = (title: string, message: string, onDismiss?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    const AlertModule = require('react-native').Alert;
    AlertModule.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
  }
};

export default function VansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vans, setVans] = useState<Van[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);

  const [formData, setFormData] = useState<VanForm>({
    code: '',
    vehiclenumber: '',
    warehousecode: '',
    usercode: '',
    routecode: '',
    active: true,
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [vansData, routesData, warehousesData, usersData] = await Promise.all([
        vanApi.getAll(true),
        routeApi.getAll(true),
        warehousesApi.getAll(true),
        userApi.getAll(true),
      ]);

      setVans(vansData);
      setRoutes(routesData);
      setWarehouses(warehousesData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading vans screen data:', err);
      showAlert('Error', 'Failed to load screen data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingVan(null);
    setFormData({
      code: '',
      vehiclenumber: '',
      warehousecode: '',
      usercode: '',
      routecode: '',
      active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (van: any) => {
    setEditingVan(van);
    setFormData({
      code: van.code,
      vehiclenumber: van.vehiclenumber || van.vehicleNumber || '', 
      warehousecode: van.warehousecode || van.warehouseCode || '',
      usercode: van.usercode || van.userCode || '',
      routecode: van.routecode || van.routeCode || '',
      active: van.active,
    });
    setShowForm(true);
  };

  const filteredVans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vans;
    return vans.filter((v: any) => {
      const code = v.code?.toLowerCase() || '';
      const plate = (v.vehiclenumber || v.vehicleNumber || '').toLowerCase();
      return code.includes(q) || plate.includes(q);
    });
  }, [vans, searchQuery]);

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.vehiclenumber.trim()) {
      showAlert('Error', 'Code and Vehicle Number are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code.trim(),
        vehicleNumber: formData.vehiclenumber.trim(),
        warehouseCode: formData.warehousecode,
        userCode: formData.usercode,
        routeCode: formData.routecode,
        active: formData.active,
      };

      if (editingVan) {
        await vanApi.update(editingVan.code, payload);
        try { await updateEntity(ENTITY_API, editingVan.code, payload); } catch (e) { console.warn(e); }
      } else {
        await vanApi.create(payload);
        try { await createEntity(ENTITY_API, payload); } catch (e) { console.warn(e); }
      }

      await loadAll();
      setShowForm(false);
    } catch (err: any) {
      showAlert('Error', err?.message || 'Failed to save van');
    } finally {
      setSaving(false);
    }
  };

  const handleHardRefresh = async () => {
    setLoading(true);
    try {
      const apiVans = await fetchEntity(ENTITY_API);
      await vanApi.clearAll();
      await vanApi.bulkInsert(apiVans);
      await loadAll();
      showAlert('Success', 'Vans refreshed from server');
    } catch (err: any) {
      showAlert('Error', 'Failed to refresh vans');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
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
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vans</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleHardRefresh}>
            <RefreshCw size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAdd}>
            <Plus size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search vans..." />
      </View>

        {filteredVans.length === 0 ? (
          <EmptyState icon={Truck} title="No Vans Found" message="Add your first van to get started" />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredVans.map((van: any) => (
              <MasterListItem
                key={van.code}
                title={van.vehiclenumber || van.vehicleNumber || van.code}
                subtitle={`${van.code}${van.warehousecode || van.warehouseCode ? ` • WH: ${van.warehousecode || van.warehouseCode}` : ''}`}
                isActive={van.active}
                onPress={() => handleEdit(van)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={showForm} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottomSheetWrapper}>
            <SafeAreaView style={styles.bottomSheet} edges={['bottom']}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingVan ? 'Edit Van' : 'Add Van'}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Code *</Text>
                  <TextInput
                    style={[styles.input, editingVan && styles.inputDisabled]}
                    value={formData.code}
                    editable={!editingVan}
                    selectTextOnFocus={!editingVan}
                    onChangeText={(t) => setFormData({ ...formData, code: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vehicle Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.vehiclenumber}
                    onChangeText={(t) => setFormData({ ...formData, vehiclenumber: t })}
                  />
                </View>

                <SearchableSelect 
                  label="Warehouse"
                  placeholder="Select Warehouse"
                  value={formData.warehousecode}
                  options={warehouses.map(w => ({ code: w.code || (w as any).Code, name: w.name || (w as any).Name }))}
                  onSelect={(val) => setFormData({ ...formData, warehousecode: val })}
                />

                <SearchableSelect 
                  label="User"
                  placeholder="Select User"
                  value={formData.usercode}
                  options={users.map(u => ({ 
                    code: u.user_id || u.code || (u as any).User_Id, 
                    name: u.user_name || u.name || (u as any).User_Name 
                  }))}
                  onSelect={(val) => setFormData({ ...formData, usercode: val })}
                />

                <SearchableSelect 
                  label="Route"
                  placeholder="Select Route"
                  value={formData.routecode}
                  options={routes.map(r => ({ code: r.code || (r as any).Code, name: r.name || (r as any).Name }))}
                  onSelect={(val) => setFormData({ ...formData, routecode: val })}
                />

                <View style={styles.toggleGroup}>
                  <Text style={styles.inputLabel}>Active</Text>
                  <TouchableOpacity
                    style={styles.toggle}
                    onPress={() => setFormData({ ...formData, active: !formData.active })}
                  >
                    <View style={[styles.toggleTrack, formData.active && styles.toggleTrackActive]}>
                      <View style={[styles.toggleThumb, formData.active && styles.toggleThumbActive]} />
                    </View>
                    <Text style={styles.toggleLabel}>{formData.active ? 'Active' : 'Inactive'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.fixedFooter}>
                <Button title="Cancel" variant="outline" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
                <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} style={{ flex: 1 }} />
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
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
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  content: { flex: 1 },
  searchContainer: { padding: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  bottomSheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    height: '85%', // Increased to fit the 3 select components + inputs comfortably
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
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
  inputGroup: { gap: 8, marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 44,
  },
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#888' },
  toggleGroup: { gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  toggleThumbActive: { marginLeft: 20 },
  toggleLabel: { fontSize: 14, color: colors.text },
  fixedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});