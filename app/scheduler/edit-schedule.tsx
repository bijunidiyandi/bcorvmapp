import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { Toast } from '@/components/common/Toast';
import { scheduleApi, routeApi, customerApi } from '@/lib/services/sqlite-api';
import { ChevronLeft, Plus, Trash2, MapPin, Calendar } from 'lucide-react-native';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function EditScheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [routes, setRoutes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [selectedRoute, setSelectedRoute] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<
    { customer_id: string; visit_order: number; planned_time: string }[]
  >([]);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (selectedRoute) {
      loadRouteCustomers(selectedRoute);
    }
  }, [selectedRoute]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, schedule] = await Promise.all([
        routeApi.getAll(),
        scheduleApi.getById(id as string),
      ]);

      setRoutes(routesData.filter((r: any) => r.is_active));

      if (schedule) {
        setSelectedRoute(schedule.route_id || '');
        setScheduleDate(schedule.schedule_date || new Date().toISOString().split('T')[0]);
        setNotes(schedule.notes || '');

        if (schedule.customers) {
          const customerData = schedule.customers.map((sc: any) => ({
            customer_id: sc.customer_id,
            visit_order: sc.visit_order,
            planned_time: sc.planned_time || '',
          }));
          setSelectedCustomers(customerData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Failed to load schedule data', type: 'error' });
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

  const addCustomer = (customerId: string) => {
    if (selectedCustomers.find((c) => c.customer_id === customerId)) {
      setToast({ message: 'Customer already added to schedule', type: 'error' });
      return;
    }

    const nextOrder = selectedCustomers.length + 1;
    setSelectedCustomers([
      ...selectedCustomers,
      {
        customer_id: customerId,
        visit_order: nextOrder,
        planned_time: '',
      },
    ]);
  };

  const removeCustomer = (customerId: string) => {
    const updated = selectedCustomers
      .filter((c) => c.customer_id !== customerId)
      .map((c, index) => ({ ...c, visit_order: index + 1 }));
    setSelectedCustomers(updated);
  };

  const updatePlannedTime = (customerId: string, time: string) => {
    setSelectedCustomers(
      selectedCustomers.map((c) =>
        c.customer_id === customerId ? { ...c, planned_time: time } : c
      )
    );
  };

  const handleSave = async () => {
    if (!user?.id) {
      setToast({ message: 'User not authenticated', type: 'error' });
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
        user_id: user.id,
        route_id: selectedRoute,
        schedule_date: scheduleDate,
        notes: notes || null,
      };

      const scheduleCustomers = selectedCustomers.map((c) => ({
        customer_id: c.customer_id,
        visit_order: c.visit_order,
        planned_time: c.planned_time || null,
      }));

      await scheduleApi.update(id as string, schedule, scheduleCustomers);

      setToast({ message: 'Schedule updated successfully', type: 'success' });
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error('Error updating schedule:', error);
      setToast({ message: 'Failed to update schedule', type: 'error' });
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
        <Text style={styles.headerTitle}>Edit Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Salesman</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>{user?.user_name || 'N/A'}</Text>
              {user?.salesman_type && (
                <Text style={styles.infoSubtext}>Type: {user.salesman_type.replace('_', ' ')}</Text>
              )}
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
                  <Picker.Item key={r.id} label={`${r.name} (${r.area})`} value={r.id} />
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
            <Text style={styles.sectionTitle}>Customers ({selectedCustomers.length})</Text>
          </View>

          {selectedRoute ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Add Customer</Text>
                <View style={styles.pickerContainer}>
                  <Plus size={18} color={colors.textSecondary} />
                  <Picker
                    selectedValue=""
                    onValueChange={(value) => value && addCustomer(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select customer to add" value="" />
                    {customers
                      .filter((c) => !selectedCustomers.find((sc) => sc.customer_id === c.id))
                      .map((c) => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                      ))}
                  </Picker>
                </View>
              </View>

              {selectedCustomers.length > 0 && (
                <View style={styles.customerList}>
                  {selectedCustomers.map((customer) => (
                    <View key={customer.customer_id} style={styles.customerItem}>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderText}>{customer.visit_order}</Text>
                      </View>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerName}>
                          {getCustomerName(customer.customer_id)}
                        </Text>
                        <TextInput
                          style={styles.timeInput}
                          value={customer.planned_time}
                          onChangeText={(time) =>
                            updatePlannedTime(customer.customer_id, time)
                          }
                          placeholder="HH:MM (optional)"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => removeCustomer(customer.customer_id)}
                        style={styles.removeButton}
                      >
                        <Trash2 size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.helperText}>Select a route first to add customers</Text>
          )}
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={saving ? 'Updating...' : 'Update Schedule'}
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
  infoBox: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  customerList: {
    gap: 12,
    marginTop: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  timeInput: {
    fontSize: 13,
    color: colors.textSecondary,
    padding: 0,
  },
  removeButton: {
    padding: 8,
  },
  buttonContainer: {
    marginBottom: 40,
  },
});
