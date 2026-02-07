import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Toast } from '@/components/common/Toast';
import { scheduleApi, routeApi, customerApi, userApi } from '@/lib/services/sqlite-api';
import { ChevronLeft, MapPin, Calendar, SquareCheck as CheckSquare, Square, Search, User } from 'lucide-react-native';

export default function CreateScheduleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<
    { customer_id: string; visit_order: number; planned_time: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      loadRouteCustomers(selectedRoute);
    }
  }, [selectedRoute]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, routesData] = await Promise.all([
        userApi.getAll(),
        routeApi.getAll(),
      ]);
      setUsers(usersData.filter((u: any) => u.role === 'SALESMAN'));
      setRoutes(routesData.filter((r: any) => r.is_active));
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadRouteCustomers = async (routeId: string) => {
    try {
      const allCustomers = await customerApi.getAll();
      const routeCustomers = allCustomers.filter(
        (c: any) => c.route_id === routeId && c.is_active
      );
      setCustomers(routeCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const toggleCustomer = (customerId: string) => {
    const isSelected = selectedCustomers.find((c) => c.customer_id === customerId);

    if (isSelected) {
      const updated = selectedCustomers
        .filter((c) => c.customer_id !== customerId)
        .map((c, index) => ({ ...c, visit_order: index + 1 }));
      setSelectedCustomers(updated);
    } else {
      const nextOrder = selectedCustomers.length + 1;
      setSelectedCustomers([
        ...selectedCustomers,
        {
          customer_id: customerId,
          visit_order: nextOrder,
          planned_time: '',
        },
      ]);
    }
  };

  const isCustomerSelected = (customerId: string) => {
    return selectedCustomers.some((c) => c.customer_id === customerId);
  };

  const getFilteredCustomers = () => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      customer.code.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  };

  const updatePlannedTime = (customerId: string, time: string) => {
    setSelectedCustomers(
      selectedCustomers.map((c) =>
        c.customer_id === customerId ? { ...c, planned_time: time } : c
      )
    );
  };

  const handleSave = async () => {
    if (!selectedUser) {
      setToast({ message: 'Please select a user', type: 'error' });
      return;
    }
    if (!selectedRoute) {
      setToast({ message: 'Please select a route', type: 'error' });
      return;
    }
    if (!scheduleDate) {
      setToast({ message: 'Please select a date', type: 'error' });
      return;
    }

    // Validate date is not in the past
    const today = new Date().toISOString().split('T')[0];
    if (scheduleDate < today) {
      setToast({ message: 'Cannot schedule in the past. Please select today or a future date', type: 'error' });
      return;
    }

    if (selectedCustomers.length === 0) {
      setToast({ message: 'Please add at least one customer', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      const schedule = {
        user_id: selectedUser,
        route_id: selectedRoute,
        schedule_date: scheduleDate,
        status: 'planned',
        notes: notes || null,
      };

      const scheduleCustomers = selectedCustomers.map((c) => ({
        customer_id: c.customer_id,
        visit_order: c.visit_order,
        planned_time: c.planned_time || null,
        visit_status: 'pending',
      }));

      console.log('About to create schedule with customers:', scheduleCustomers.length);
      console.log('Selected customers:', JSON.stringify(scheduleCustomers, null, 2));

      const result = await scheduleApi.create(schedule, scheduleCustomers);
      console.log('Schedule created successfully:', result);

      setToast({ message: `Schedule created with ${scheduleCustomers.length} customer(s)`, type: 'success' });
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error('Error creating schedule:', error);
      setToast({ message: 'Failed to create schedule', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Unknown';
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
        <Text style={styles.headerTitle}>Create Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>User *</Text>
            <View style={styles.pickerContainer}>
              <User size={18} color={colors.textSecondary} />
              <Picker
                selectedValue={selectedUser}
                onValueChange={setSelectedUser}
                style={styles.picker}
              >
                <Picker.Item label="Select User" value="" />
                {users.map((u) => (
                  <Picker.Item key={u.id} label={u.user_name} value={u.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Route *</Text>
            <View style={styles.pickerContainer}>
              <MapPin size={18} color={colors.textSecondary} />
              <Picker
                selectedValue={selectedRoute}
                onValueChange={setSelectedRoute}
                style={styles.picker}
              >
                <Picker.Item label="Select Route" value="" />
                {routes.map((r) => (
                  <Picker.Item key={r.id} label={r.name} value={r.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Schedule Date *</Text>
            <View style={styles.inputContainer}>
              <Calendar size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={scheduleDate}
                onChangeText={setScheduleDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                {...({
                  type: 'date',
                  min: new Date().toISOString().split('T')[0],
                } as any)}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes for this schedule..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Customers ({selectedCustomers.length})</Text>
          </View>

          {selectedRoute ? (
            <>
              <View style={styles.searchContainer}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search customers by name, code, or phone..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {customers.length === 0 ? (
                <Text style={styles.helperText}>No customers found for this route</Text>
              ) : (
                <ScrollView style={styles.customerSelectionList} nestedScrollEnabled>
                  {getFilteredCustomers().map((customer) => {
                    const selected = isCustomerSelected(customer.id);
                    return (
                      <TouchableOpacity
                        key={customer.id}
                        style={[
                          styles.customerCheckItem,
                          selected && styles.customerCheckItemSelected,
                        ]}
                        onPress={() => toggleCustomer(customer.id)}
                      >
                        <View style={styles.checkboxContainer}>
                          {selected ? (
                            <CheckSquare size={24} color={colors.primary} />
                          ) : (
                            <Square size={24} color={colors.textSecondary} />
                          )}
                        </View>
                        <View style={styles.customerDetails}>
                          <Text
                            style={[
                              styles.customerCheckName,
                              selected && styles.customerCheckNameSelected,
                            ]}
                          >
                            {customer.name}
                          </Text>
                          <Text style={styles.customerMeta}>
                            {customer.code} • {customer.phone || 'No phone'}
                          </Text>
                          {customer.address && (
                            <Text style={styles.customerAddress} numberOfLines={1}>
                              {customer.address}
                            </Text>
                          )}
                        </View>
                        {selected && (
                          <View style={styles.orderBadgeSmall}>
                            <Text style={styles.orderTextSmall}>
                              #{selectedCustomers.find((c) => c.customer_id === customer.id)?.visit_order}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {selectedCustomers.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.selectedSection}>
                    <Text style={styles.selectedTitle}>
                      Selected Customers ({selectedCustomers.length})
                    </Text>
                    {selectedCustomers
                      .sort((a, b) => a.visit_order - b.visit_order)
                      .map((sc) => {
                        const customer = customers.find((c) => c.id === sc.customer_id);
                        if (!customer) return null;
                        return (
                          <View key={sc.customer_id} style={styles.selectedCustomerItem}>
                            <View style={styles.selectedCustomerInfo}>
                              <View style={styles.orderBadge}>
                                <Text style={styles.orderText}>#{sc.visit_order}</Text>
                              </View>
                              <View style={styles.selectedCustomerDetails}>
                                <Text style={styles.selectedCustomerName}>{customer.name}</Text>
                                <Text style={styles.selectedCustomerMeta}>
                                  {customer.code} • {customer.phone || 'No phone'}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => toggleCustomer(sc.customer_id)}
                              style={styles.removeButton}
                            >
                              <Text style={styles.removeButtonText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </View>
                </>
              )}
            </>
          ) : (
            <Text style={styles.helperText}>Select a route first to add customers</Text>
          )}
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={saving ? 'Creating...' : 'Create Schedule'}
            onPress={handleSave}
            disabled={saving}
          />
        </View>
      </ScrollView>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  customerSelectionList: {
    maxHeight: 400,
  },
  customerCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  customerCheckItemSelected: {
    backgroundColor: '#ecfeff',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkboxContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
    gap: 4,
  },
  customerCheckName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  customerCheckNameSelected: {
    color: colors.primary,
  },
  customerMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  customerAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  orderBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  orderTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  selectedSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ecfeff',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  selectedSection: {
    gap: 12,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  selectedCustomerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  selectedCustomerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  selectedCustomerDetails: {
    flex: 1,
    gap: 4,
  },
  selectedCustomerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  selectedCustomerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  buttonContainer: {
    marginBottom: 40,
  },
});
