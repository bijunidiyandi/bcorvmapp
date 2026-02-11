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
import { SafeAreaView } from 'react-native-safe-area-context';
import { createEntity, fetchEntity, updateEntity } from '@/lib/services/webapi';
import { RefreshCw } from 'lucide-react-native';
 

const showAlert = (title: string, message: string, onDismiss?: () => void) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
    onDismiss?.();
  } else {
    const AlertModule = require('react-native').Alert;
    AlertModule.alert(title, message, [{ text: 'OK', onPress: onDismiss }]);
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
    active: true,
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  /** Load all routes from SQLite */
  const loadRoutes = async () => {
    setLoading(true);
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
    setFormData({ code: '', name: '', description: '', active: true });
    setShowForm(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      code: route.code,
      name: route.name,
      description: route.description || '',
      active: route.active,
    });
    setShowForm(true);
  };

  /** Save route to SQLite and Web API */
  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      showAlert('Error', 'Code and name are required');
      return;
    }

    setSaving(true);

    try {
      let savedRoute: Route | null = null;

      if (editingRoute) {
        // 1️⃣ Update SQLite first
        savedRoute = await routeApi.update(editingRoute.code, formData);

        // 2️⃣ Update Web API
        try {
          await updateEntity('Route', editingRoute.code, {
            code: formData.code,
            name: formData.name,
            description: formData.description,
            active: formData.active,
          });
        } catch (apiErr) {
          console.warn('Web API update failed, offline sync needed', apiErr);
          showAlert(
            'Warning',
            'Route updated locally but failed to sync with server. It will retry later.'
          );
        }
      } else {
        // 1️⃣ Create in SQLite
        savedRoute = await routeApi.create(formData);

        // 2️⃣ Create Web API
        try {
          await createEntity('Route', {
            code: formData.code,
            name: formData.name,
            description: formData.description,
            active: formData.active,
          });
        } catch (apiErr) {
          console.warn('Web API create failed, offline sync needed', apiErr);
          showAlert(
            'Warning',
            'Route created locally but failed to sync with server. It will retry later.'
          );
        }
      }

      // 3️⃣ Update local state optimistically
      if (editingRoute) {
        setRoutes((prev) =>
          prev.map((r) => (r.code === editingRoute.code ? { ...r, ...formData } : r))
        );
      } else if (savedRoute) {
        setRoutes((prev) => [...prev, { ...savedRoute, ...formData }]);
      }

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
  const handleHardRefresh = async () => {
    setLoading(true);
    try {
      console.log('HARD REFRESH START');
      const apiRoute: Route[] = await fetchEntity('Route');
      console.log('API Route count:', apiRoute.length);

      await routeApi.clearAll();
            console.log('clearAll');
      await routeApi.bulkInsert(apiRoute);
    console.log('bulkInsert');


      showAlert('Success', 'Route refreshed from server');
    } catch (err: any) {
      console.error('Hard refresh failed:', err);
      showAlert('Error', err?.message || 'Failed to refresh warehouses');
    } finally {
      setLoading(false);
    }
          const refreshed = await routeApi.getAll(true);
      console.log('REFRESHED SQLITE DATA:', refreshed);
      setRoutes(refreshed);
  };

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
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Routes</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleHardRefresh}>
              <RefreshCw size={22} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAdd}>
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

      </View>

      {/* SEARCH */}
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search routes..."
          />
        </View>

        {/* ROUTES LIST OR EMPTY */}
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
                key={route.code}
                title={route.name}
                subtitle={`${route.code}${route.description ? ` • ${route.description}` : ''}`}
                isActive={route.active}
                onPress={() => handleEdit(route)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.bottomSheetWrapper}
          >
            <SafeAreaView style={styles.bottomSheet} edges={['bottom']}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingRoute ? 'Edit Route' : 'Add Route'}</Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* FORM */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: 20,
                  paddingBottom: 140,
                }}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Code *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      editingRoute && styles.inputDisabled
                    ]}
                    value={formData.code}
                    editable={!editingRoute}          // 🔒 disable in edit mode
                    selectTextOnFocus={!editingRoute} // prevents cursor on iOS
                    onChangeText={(t) =>
                      setFormData({ ...formData, code: t })
                    }
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
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.textArea}
                    multiline
                    value={formData.description}
                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                  />
                </View>
              <View style={styles.toggleGroup} >
                               <Text style={styles.inputLabel}>Active</Text>
                               <TouchableOpacity
                                 style={styles.toggle  }
                                   disabled={true}  
                                 onPress={() => setFormData({ ...formData, active: !formData.active })}
                               >
                                 <View style={[styles.toggleTrack, formData.active && styles.toggleTrackActive]}>
                                   <View style={[styles.toggleThumb , formData.active && styles.toggleThumbActive]} />
                                 </View>
                                 <Text style={styles.toggleLabel }>{formData.active ? 'Active' : 'Inactive'}</Text>
                               </TouchableOpacity>
                             </View>
                           
              </ScrollView>

              {/* FOOTER */}
              <View style={styles.fixedFooter}>
                <Button title="Cancel" variant="outline" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
                <Button
                  title={saving ? 'Saving...' : 'Save'}
                  onPress={handleSave}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ========================
// STYLES (kept same as yours)
// ========================
const styles = StyleSheet.create({
  inputDisabled: {
  backgroundColor: '#f0f0f0',
  color: '#888',
},
toggleGroup: { gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  toggleTrackActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  toggleThumbActive: { marginLeft: 20 },
  toggleLabel: { fontSize: 14, color: colors.text },
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  addButton: { padding: 8 },
  content: { flex: 1 },
  searchContainer: { padding: 20 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  bottomSheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: { height: '50%', backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: colors.white, minHeight: 44 },
  textArea: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: colors.white, height: 70 },
  fixedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
});
