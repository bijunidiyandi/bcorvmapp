import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { Toast } from '@/components/common/Toast';
import { scheduleApi, routeApi } from '@/lib/services/sqlite-api';
import { Calendar, ChevronLeft, Plus, User, MapPin, Clock, Edit, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';

export default function ScheduleManagementScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [filterDate])
  );

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleApi.getAll(undefined, filterDate || undefined);
      setSchedules(data);
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    router.push('/scheduler/create-schedule' as any);
  };

  const handleEditSchedule = (scheduleId: string) => {
    router.push(`/scheduler/edit-schedule?id=${scheduleId}` as any);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (Platform.OS === 'web') {
      if (deleteConfirmId === scheduleId) {
        confirmDelete(scheduleId);
      } else {
        setDeleteConfirmId(scheduleId);
      }
    } else {
      setDeleteConfirmId(scheduleId);
    }
  };

  const confirmDelete = async (scheduleId: string) => {
    try {
      console.log('Deleting schedule:', scheduleId);
      await scheduleApi.delete(scheduleId);
      setToast({ message: 'Schedule deleted successfully', type: 'success' });
      setDeleteConfirmId(null);
      await loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      setToast({ message: 'Failed to delete schedule', type: 'error' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return colors.info;
      case 'in_progress':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
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
        <Text style={styles.headerTitle}>Schedule Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Calendar size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.dateInput}
            placeholder="Filter by date (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            value={filterDate}
            onChangeText={setFilterDate}
          />
          {filterDate !== '' && (
            <TouchableOpacity onPress={() => setFilterDate('')}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {schedules.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Schedules Found"
            message="Create your first schedule to get started"
          />
        ) : (
          <View style={styles.scheduleList}>
            {schedules.map((schedule) => (
              <Card key={schedule.id} style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleDate}>
                      {format(new Date(schedule.schedule_date), 'MMM dd, yyyy')}
                    </Text>
                    <View style={styles.scheduleDetails}>
                      <User size={14} color={colors.textSecondary} />
                      <Text style={styles.scheduleDetailText}>
                        {schedule.user?.user_name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.scheduleDetails}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={styles.scheduleDetailText}>
                        {schedule.route?.name || 'No route'}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={getStatusLabel(schedule.status)}
                    variant={
                      schedule.status === 'completed'
                        ? 'success'
                        : schedule.status === 'in_progress'
                        ? 'warning'
                        : schedule.status === 'cancelled'
                        ? 'error'
                        : 'info'
                    }
                  />
                </View>

                <View style={styles.customerCount}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.customerCountText}>
                    {schedule.customers?.length || 0} customers scheduled
                  </Text>
                </View>

                {schedule.notes && (
                  <Text style={styles.scheduleNotes} numberOfLines={2}>
                    {schedule.notes}
                  </Text>
                )}

                {deleteConfirmId === schedule.id ? (
                  <View style={styles.confirmDeleteContainer}>
                    <Text style={styles.confirmDeleteText}>Delete this schedule?</Text>
                    <View style={styles.confirmDeleteActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={cancelDelete}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.confirmDeleteButton]}
                        onPress={() => confirmDelete(schedule.id)}
                      >
                        <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditSchedule(schedule.id)}
                    >
                      <Edit size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 size={18} color={colors.error} />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.fab}>
        <Button
          title="Create Schedule"
          onPress={handleCreateSchedule}
          icon={Plus}
        />
      </View>

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
  filterSection: {
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  clearButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scheduleList: {
    gap: 16,
  },
  scheduleCard: {
    padding: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scheduleInfo: {
    flex: 1,
    gap: 6,
  },
  scheduleDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  scheduleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },
  customerCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scheduleNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
  },
  deleteButtonText: {
    color: colors.error,
  },
  confirmDeleteContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
  confirmDeleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: colors.textSecondary + '15',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmDeleteButton: {
    backgroundColor: colors.error,
  },
  confirmDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});
