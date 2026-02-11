import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useAuth } from '@/lib/contexts/AuthContextNew';
import { userApi } from '@/lib/services/auth';
import { vanApi } from '@/lib/services/sqlite-api';
import { UserWithDetails, Van } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Badge } from '@/components/common/Badge';
import { ChevronLeft, UserPlus, Edit, Trash2, Shield, User, Key, Truck, RefreshCcw, Database } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { resetDatabase } from '@/lib/services/database';

export default function UserManagementScreen() {
  const router = useRouter();
  const { isSalesManager } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    password: '',
    role: 'SALESMAN' as 'SALES_MANAGER' | 'SALESMAN',
    default_van_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (!isSalesManager()) {
      Alert.alert('Access Denied', 'Only Sales Managers can access this screen');
      router.back();
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, vansData] = await Promise.all([
        userApi.getAll(),
        vanApi.getAll(true),
      ]);
      setUsers(usersData);
      setVans(vansData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      user_id: '',
      user_name: '',
      password: '',
      role: 'SALESMAN',
      default_van_id: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (user: UserWithDetails) => {
    setEditingUser(user);
    setFormData({
      user_id: user.user_id,
      user_name: user.user_name,
      password: '',
      role: user.role,
      default_van_id: user.default_van_id || '',
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.user_name.trim()) {
      Alert.alert('Error', 'User name is required');
      return;
    }

    if (!editingUser && !formData.user_id.trim()) {
      Alert.alert('Error', 'User ID is required');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    if (formData.role === 'SALESMAN' && !formData.default_van_id) {
      Alert.alert('Error', 'Default van is required for Salesman');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        const updates: any = {
          user_name: formData.user_name,
          role: formData.role,
          is_active: formData.is_active,
        };
        if (formData.role === 'SALESMAN') {
          updates.default_van_id = formData.default_van_id || null;
        } else {
          updates.default_van_id = null;
        }
        if (formData.password.trim()) {
          updates.password = formData.password;
        }
        await userApi.update(editingUser.id, updates);
        if (Platform.OS === 'web') {
          alert('User updated successfully');
        } else {
          Alert.alert('Success', 'User updated successfully');
        }
      } else {
        await userApi.create({
          user_id: formData.user_id,
          user_name: formData.user_name,
          password: formData.password,
          role: formData.role,
          default_van_id: formData.role === 'SALESMAN' ? formData.default_van_id : null,
          is_active: formData.is_active,
        });
        if (Platform.OS === 'web') {
          alert('User created successfully');
        } else {
          Alert.alert('Success', 'User created successfully');
        }
      }
      setShowModal(false);
      await loadData();
    } catch (error: any) {
      console.error('Save error:', error);
      if (Platform.OS === 'web') {
        alert(error.message || 'Failed to save user');
      } else {
        Alert.alert('Error', error.message || 'Failed to save user');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: UserWithDetails) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`Are you sure you want to delete user ${user.user_name}?`)) {
        return;
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete user ${user.user_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDelete(user) },
        ]
      );
      return;
    }
    performDelete(user);
  };

  const performDelete = async (user: UserWithDetails) => {
    try {
      await userApi.delete(user.id);
      Alert.alert('Success', 'User deleted successfully');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete user');
    }
  };

  const handleResetDatabase = () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('This will delete ALL data and reinitialize with sample data. Continue?')) {
        return;
      }
    } else {
      Alert.alert(
        'Reset Database',
        'This will delete ALL data and reinitialize with sample data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: performReset },
        ]
      );
      return;
    }
    performReset();
  };

  const performReset = async () => {
    try {
      console.log('Starting database reset...');
      setLoading(true);
      await resetDatabase();
      console.log('Database reset complete, reloading data...');
      await loadData();
      console.log('Data reloaded successfully');
      if (Platform.OS === 'web') {
        alert('Database reset successfully!');
      } else {
        Alert.alert('Success', 'Database reset successfully!');
      }
    } catch (error: any) {
      console.error('Reset error:', error);
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message || 'Failed to reset database'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to reset database');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <UserPlus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {users.map((user) => (
          <Card key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <View style={styles.userTitleRow}>
                  <Text style={styles.userName}>{user.user_name}</Text>
                  {user.role === 'SALES_MANAGER' ? (
                    <Shield size={18} color={colors.primary} />
                  ) : (
                    <User size={18} color={colors.success} />
                  )}
                </View>
                <Text style={styles.userId}>@{user.user_id}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity onPress={() => handleEdit(user)} style={styles.iconButton}>
                  <Edit size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(user)} style={styles.iconButton}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.userDetails}>
              <Badge
                label={user.role === 'SALES_MANAGER' ? 'Sales Manager' : 'Salesman'}
                variant={user.role === 'SALES_MANAGER' ? 'primary' : 'success'}
              />
              <Badge
                label={user.is_active ? 'Active' : 'Inactive'}
                variant={user.is_active ? 'success' : 'neutral'}
              />
            </View>

            {user.default_van && (
              <View style={styles.vanInfo}>
                <Truck size={16} color={colors.textSecondary} />
                <Text style={styles.vanText}>
                  Van: {user.default_van.code} - {user.default_van.vehicle_number}
                </Text>
              </View>
            )}
          </Card>
        ))}

        <Card style={styles.userCard}>
          <Text style={styles.sectionTitle}>Database Tools</Text>
          <Text style={styles.sectionDescription}>
            Debug and fix database issues
          </Text>
          <TouchableOpacity onPress={() => router.push('/admin/database-debug' as any)} style={styles.debugButton}>
            <Database size={18} color={colors.primary} />
            <Text style={styles.debugButtonText}>Open Database Debug Tool</Text>
          </TouchableOpacity>
        </Card>

        <Card style={[styles.userCard, styles.dangerZone]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerDescription}>
            Reset database will delete all data and reinitialize with sample data. This includes:
            {'\n'}• 3 users (1 manager + 2 salesmen)
            {'\n'}• 2 vans with assigned salesmen
            {'\n'}• 5 routes with customers
            {'\n'}• Sample items and stock
          </Text>
          <TouchableOpacity onPress={handleResetDatabase} style={styles.resetButton}>
            <RefreshCcw size={18} color={colors.white} />
            <Text style={styles.resetButtonText}>Reset Database & Reload</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>Check browser console (F12) for progress logs</Text>
        </Card>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Create User'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>User ID *</Text>
                <TextInput
                  style={[styles.input, editingUser && styles.inputDisabled]}
                  value={formData.user_id}
                  onChangeText={(text) => setFormData({ ...formData, user_id: text })}
                  placeholder="Enter user ID"
                  autoCapitalize="none"
                  editable={!editingUser}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>User Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.user_name}
                  onChangeText={(text) => setFormData({ ...formData, user_name: text })}
                  placeholder="Enter user name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Enter password"
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value, default_van_id: '' })
                    }
                  >
                    <Picker.Item label="Salesman" value="SALESMAN" />
                    <Picker.Item label="Sales Manager" value="SALES_MANAGER" />
                  </Picker>
                </View>
              </View>

              {formData.role === 'SALESMAN' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Default Van *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.default_van_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, default_van_id: value })
                      }
                    >
                      <Picker.Item label="Select a van" value="" />
                      {vans
                        .filter((v) => v.is_active)
                        .map((van) => (
                          <Picker.Item
                            key={van.id}
                            label={`${van.code} - ${van.vehicle_number}`}
                            value={van.id}
                          />
                        ))}
                    </Picker>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.is_active}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                  >
                    <Picker.Item label="Active" value={true} />
                    <Picker.Item label="Inactive" value={false} />
                  </Picker>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowModal(false)}
                variant="secondary"
                style={styles.modalButton}
                disabled={saving}
              />
              <Button
                title="Save"
                onPress={handleSave}
                style={styles.modalButton}
                loading={saving}
                disabled={saving}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  userId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  userDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  vanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vanText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    maxHeight: '90%',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    fontSize: 24,
    color: colors.textSecondary,
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
  },
  dangerZone: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  dangerHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
