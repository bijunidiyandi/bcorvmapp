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
import { itemCategoryApi } from '@/lib/services/sqlite-api';
import { ItemCategory } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { ArrowLeft, Plus, FolderOpen, X } from 'lucide-react-native';

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

export default function ItemCategoriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await itemCategoryApi.getAll(true);
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
      showAlert('Error', 'Failed to load categories');
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
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (category: ItemCategory) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
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
        await itemCategoryApi.update(editingCategory.id, formData);
      } else {
        await itemCategoryApi.create(formData);
      }
      await loadCategories();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving category:', err);
      showAlert('Error', err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item Categories</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading categories..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Categories</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search categories..."
          />
        </View>

        {filteredCategories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No Categories Found"
            message={
              searchQuery
                ? 'No categories match your search'
                : 'Add your first category to get started'
            }
            actionLabel={searchQuery ? undefined : 'Add Category'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredCategories.map((category) => (
              <MasterListItem
                key={category.id}
                title={category.name}
                subtitle={`${category.code}${category.description ? ` • ${category.description}` : ''}`}
                isActive={category.is_active}
                onPress={() => handleEdit(category)}
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
                {editingCategory ? 'Edit Category' : 'Add Category'}
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
