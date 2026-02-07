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
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { routeApi } from '@/lib/services/sqlite-api';
import { Route } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { ArrowLeft, Plus, MapPin, X } from 'lucide-react-native';

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

export default function RoutesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await routeApi.getAll(true);
      setRoutes(data);
    } catch (err) {
      console.error('Error loading routes:', err);
      showAlert('Error', 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRoute(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      code: route.code,
      name: route.name,
      description: route.description || '',
      is_active: route.is_active,
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
      if (editingRoute) {
        await routeApi.update(editingRoute.id, formData);
      } else {
        await routeApi.create(formData);
      }
      await loadRoutes();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving route:', err);
      showAlert('Error', err.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  const filteredRoutes = routes.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Routes</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading routes..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Routes</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search routes..."
          />
        </View>

        {filteredRoutes.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Routes Found"
            message={
              searchQuery
                ? 'No routes match your search'
                : 'Add your first route to get started'
            }
            actionLabel={searchQuery ? undefined : 'Add Route'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredRoutes.map((route) => (
              <MasterListItem
                key={route.id}
                title={route.name}
                subtitle={`${route.code}${route.description ? ` • ${route.description}` : ''}`}
                isActive={route.is_active}
                onPress={() => handleEdit(route)}
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
                {editingRoute ? 'Edit Route' : 'Add Route'}
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
                    placeholder="Enter code (e.g., RT001)"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter name (e.g., Downtown Route)"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Enter description (optional)"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.toggleGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
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

            <View style={[styles.formActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
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
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  formScrollView: {
    maxHeight: 300,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
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
    height: 70,
  },
  toggleGroup: {
    gap: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleThumbActive: {
    marginLeft: 20,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  actionButton: {
    flex: 1,
  },
});
