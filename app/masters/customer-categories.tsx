import React, { useState, useEffect, useMemo } from 'react';
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
import { customerCategoryApi } from '@/lib/services/sqlite-api';
import { createEntity, fetchEntity, updateEntity } from '@/lib/services/webapi';
import { CustomerCategory } from '@/lib/types/database';

import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';

import { ArrowLeft, Plus, Tag, X, RefreshCw } from 'lucide-react-native';

const ENTITY_API = 'CustomerCategories';

const showAlert = (title: string, message: string, onDismiss?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    const AlertModule = require('react-native').Alert;
    AlertModule.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
  }
};

export default function CustomerCategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_percentage: 0,
    active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await customerCategoryApi.getAll(true);
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
      showAlert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleHardRefresh = async () => {
    setLoading(true);
    try {
      const apiData = await fetchEntity(ENTITY_API);
      await customerCategoryApi.clearAll();
      await customerCategoryApi.bulkInsert(apiData);
      await loadCategories();
      showAlert('Success', 'Categories refreshed from server');
    } catch (err) {
      showAlert('Error', 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_percentage: 0,
      active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (category: CustomerCategory) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      discount_percentage: category.discount_percentage || 0,
      active: category.active,
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
    if (editingCategory) {
      // Use editingCategory.code, NOT an internal ID
      await customerCategoryApi.update(editingCategory.code, formData);
      // Optional: Update web API
      try { await updateEntity(ENTITY_API, editingCategory.code, formData); } catch(e) {}
    } else {
      await customerCategoryApi.create(formData);
    }

    // CRITICAL: Re-fetch everything from SQLite to reset the UI state
    await loadCategories(); 
    
    setShowForm(false);
    setEditingCategory(null); // Clear the editing reference
  } catch (err: any) {
    showAlert('Error', err.message || 'Failed to save');
  } finally {
    setSaving(false);
  }
};
// const handleSave = async () => {
//   try {
//     if (editingCategory) {
//       await customerCategoryApi.update(editingCategory.code, formData);
//     }
    
//     // DON'T just set local state. RE-FETCH from the database.
//     const freshData = await customerCategoryApi.getAll(true); 
    
//     // IMPORTANT: Use the spread operator to ensure React detects a change
//     setCategories([...freshData]); 
    
//     setShowForm(false);
//     setEditingCategory(null);
//   } catch (err) {
//     console.error(err);
//   }
// };
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading..." />
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
        <Text style={styles.headerTitle}>Categories</Text>
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
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search..." />
        </View>

        {filteredCategories.length === 0 ? (
          <EmptyState icon={Tag} title="No Categories" message="Add your first category to get started" />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredCategories.map((category) => (
              <MasterListItem
                key={category.code}
                title={category.name}
                subtitle={`${category.code}${category.discount_percentage ? ` • ${category.discount_percentage}% Disc.` : ''}`}
                isActive={category.active}
                onPress={() => handleEdit(category)}
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
                <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'Add Category'}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Code *</Text>
                  <TextInput
                    style={[styles.input, editingCategory && styles.inputDisabled]}
                    value={formData.code}
                    editable={!editingCategory}
                    onChangeText={(t) => setFormData({ ...formData, code: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(t) => setFormData({ ...formData, name: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Discount Percentage</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.discount_percentage.toString()}
                    keyboardType="numeric"
                    onChangeText={(t) => setFormData({ ...formData, discount_percentage: parseFloat(t) || 0 })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.description}
                    multiline
                    numberOfLines={3}
                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                  />
                </View>

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
    height: '70%',
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
  inputGroup: { gap: 8, marginBottom: 16 },
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
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
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