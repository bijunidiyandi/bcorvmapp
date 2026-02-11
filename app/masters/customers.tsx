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
import { customerApi, customerCategoryApi, routeApi } from '@/lib/services/sqlite-api';
import { CustomerWithDetails, CustomerCategory, Route } from '@/lib/types/database';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { MasterListItem } from '@/components/masters/MasterListItem';
import { SearchBar } from '@/components/masters/SearchBar';
import { Toast } from '@/components/common/Toast';
import { ArrowLeft, Plus, Users, X, MapPin } from 'lucide-react-native';
import { getCurrentPosition } from '@/lib/utils/geo';
import { useToast } from '@/hooks/useToast';
import { KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function CustomersScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithDetails | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: null as string | null,
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    tax_number: '',
    credit_limit: '',
    credit_days: '',
    route_id: null as string | null,
    latitude: '',
    longitude: '',
    notes: '',
    is_active: true,
  });
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersData, categoriesData, routesData] = await Promise.all([
        customerApi.getAll(true),
        customerCategoryApi.getAll(),
        routeApi.getAll(),
      ]);
      setCustomers(customersData);
      setCategories(categoriesData);
      setRoutes(routesData);
    } catch (err) {
      console.error('Error loading data:', err);
      showAlert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      code: '',
      name: '',
      category_id: null,
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      tax_number: '',
      credit_limit: '0',
      credit_days: '0',
      route_id: null,
      latitude: '',
      longitude: '',
      notes: '',
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (customer: CustomerWithDetails) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      category_id: customer.category_id,
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      postal_code: customer.postal_code || '',
      tax_number: customer.tax_number || '',
      credit_limit: customer.credit_limit?.toString() || '0',
      credit_days: customer.credit_days?.toString() || '0',
      route_id: customer.route_id,
      latitude: customer.latitude?.toString() || '',
      longitude: customer.longitude?.toString() || '',
      notes: customer.notes || '',
      is_active: customer.is_active,
    });
    setShowForm(true);
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const position = await getCurrentPosition();
      setFormData({
        ...formData,
        latitude: position.latitude.toFixed(6),
        longitude: position.longitude.toFixed(6),
      });
      showToast('Location captured successfully', 'success');
    } catch (err: any) {
      console.error('Error getting location:', err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('permission')) {
        showToast('Location permission denied. Please enable location access in your device settings.', 'error');
      } else {
        showToast('Failed to get current location. Please try again.', 'error');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      showAlert('Error', 'Code and name are required');
      return;
    }

    const creditLimit = parseFloat(formData.credit_limit || '0');
    const creditDays = parseInt(formData.credit_days || '0');

    if (isNaN(creditLimit) || creditLimit < 0) {
      showAlert('Error', 'Invalid credit limit');
      return;
    }

    if (isNaN(creditDays) || creditDays < 0) {
      showAlert('Error', 'Invalid credit days');
      return;
    }

    const latitude = formData.latitude ? parseFloat(formData.latitude) : null;
    const longitude = formData.longitude ? parseFloat(formData.longitude) : null;

    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      showAlert('Error', 'Invalid latitude (must be between -90 and 90)');
      return;
    }

    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      showAlert('Error', 'Invalid longitude (must be between -180 and 180)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        category_id: formData.category_id,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postal_code || null,
        tax_number: formData.tax_number || null,
        credit_limit: creditLimit,
        credit_days: creditDays,
        route_id: formData.route_id,
        latitude,
        longitude,
        notes: formData.notes || null,
        is_active: formData.is_active,
      };

      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, payload);
      } else {
        await customerApi.create(payload as any);
      }
      await loadData();
      setShowForm(false);
    } catch (err: any) {
      console.error('Error saving customer:', err);
      showAlert('Error', err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading customers..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search customers..." />
        </View>

        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            message={searchQuery ? 'No customers match your search' : 'Add your first customer to get started'}
            actionLabel={searchQuery ? undefined : 'Add Customer'}
            onAction={searchQuery ? undefined : handleAdd}
          />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {filteredCustomers.map((customer) => (
              <MasterListItem
                key={customer.id}
                title={customer.name}
                subtitle={`${customer.code}${customer.phone ? ` • ${customer.phone}` : ''}`}
                badge={customer.category?.name}
                isActive={customer.is_active}
                onPress={() => handleEdit(customer)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</Text>
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
                  <Text style={styles.inputLabel}>Contact Person</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contact_person}
                    onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                    placeholder="Enter contact person"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="Enter phone"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder="Enter email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Enter address"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
                      placeholder="Enter city"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.state}
                      onChangeText={(text) => setFormData({ ...formData, state: text })}
                      placeholder="Enter state"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.postal_code}
                      onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                      placeholder="Enter postal code"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Tax Number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.tax_number}
                      onChangeText={(text) => setFormData({ ...formData, tax_number: text })}
                      placeholder="Enter tax number"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Credit Limit</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.credit_limit}
                      onChangeText={(text) => setFormData({ ...formData, credit_limit: text })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Credit Days</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.credit_days}
                      onChangeText={(text) => setFormData({ ...formData, credit_days: text })}
                      placeholder="0"
                      keyboardType="number-pad"
                    />
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
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Geo Location</Text>
                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={getCurrentLocation}
                      disabled={loadingLocation}
                    >
                      <MapPin size={16} color={colors.primary} />
                      <Text style={styles.locationButtonText}>
                        {loadingLocation ? 'Getting Location...' : 'Get Current Location'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabelSmall}>Latitude</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.latitude}
                        onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                        placeholder="e.g., 23.8103"
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabelSmall}>Longitude</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.longitude}
                        onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                        placeholder="e.g., 90.4125"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    placeholder="Enter notes"
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
              <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} style={styles.actionButton} />
            </View>
          </View>
        </View>
      </Modal> */}
<Modal
  visible={showForm}
  animationType="slide"
  transparent
  statusBarTranslucent
  onRequestClose={() => setShowForm(false)}
>
  <View style={styles.modalOverlay}>

    {/* Bottom Sheet Wrapper */}
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.bottomSheetWrapper}
    >
      <SafeAreaView style={styles.bottomSheet} edges={['bottom']}>

        {/* HEADER */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingCustomer ? 'Edit Customer' : 'Add Customer'}
          </Text>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* FORM */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 160, // 🔥 space for footer
          }}
        >
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
                  <Text style={styles.inputLabel}>Contact Person</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contact_person}
                    onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                    placeholder="Enter contact person"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="Enter phone"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder="Enter email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Enter address"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
                      placeholder="Enter city"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.state}
                      onChangeText={(text) => setFormData({ ...formData, state: text })}
                      placeholder="Enter state"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.postal_code}
                      onChangeText={(text) => setFormData({ ...formData, postal_code: text })}
                      placeholder="Enter postal code"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Tax Number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.tax_number}
                      onChangeText={(text) => setFormData({ ...formData, tax_number: text })}
                      placeholder="Enter tax number"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Credit Limit</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.credit_limit}
                      onChangeText={(text) => setFormData({ ...formData, credit_limit: text })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.inputLabel}>Credit Days</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.credit_days}
                      onChangeText={(text) => setFormData({ ...formData, credit_days: text })}
                      placeholder="0"
                      keyboardType="number-pad"
                    />
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
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Geo Location</Text>
                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={getCurrentLocation}
                      disabled={loadingLocation}
                    >
                      <MapPin size={16} color={colors.primary} />
                      <Text style={styles.locationButtonText}>
                        {loadingLocation ? 'Getting Location...' : 'Get Current Location'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabelSmall}>Latitude</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.latitude}
                        onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                        placeholder="e.g., 23.8103"
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, styles.flex1]}>
                      <Text style={styles.inputLabelSmall}>Longitude</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.longitude}
                        onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                        placeholder="e.g., 90.4125"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={styles.textArea}
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    placeholder="Enter notes"
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

          {/* ⬇️ keep the rest of your form exactly the same */}
        </ScrollView>

        {/* FIXED FOOTER */}
        <View style={styles.fixedFooter}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => setShowForm(false)}
            style={{ flex: 1 }}
          />
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
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
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
    minHeight: 60,
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
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  locationButtonText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputLabelSmall: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  formActions: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { flex: 1 },
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
bottomSheetWrapper: {
  flex: 1,
  justifyContent: 'flex-end',
},

bottomSheet: {
  height: '90%',               // 🔥 EXACT REQUIREMENT
  backgroundColor: colors.white,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  overflow: 'hidden',
},

});
