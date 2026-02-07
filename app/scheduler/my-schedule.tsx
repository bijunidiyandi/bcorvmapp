import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { scheduleApi, salesSessionApi } from '@/lib/services/sqlite-api';
import { useSession } from '@/lib/contexts/SessionContext';
import { useVan } from '@/lib/contexts/VanContext';
import { useToast } from '@/hooks/useToast';
import { ChevronLeft, MapPin, Phone, Clock, CheckCircle, Play, Square, Edit, AlertTriangle } from 'lucide-react-native';
import { format } from 'date-fns';

export default function MyScheduleScreen() {
  const router = useRouter();
  const { activeSession, refreshSession } = useSession();
  const { selectedVan } = useVan();
  const { showToast } = useToast();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [customerToEnd, setCustomerToEnd] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadTodaySchedule();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      loadTodaySchedule();
    }
  }, [activeSession]);

  const loadTodaySchedule = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const allSchedules = await scheduleApi.getAll(undefined, today);
      const data = allSchedules.length > 0 ? allSchedules[0] : null;
      setSchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };


  const openMaps = (customer: any) => {
    if (!customer.latitude || !customer.longitude) {
      return;
    }

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
      web: 'https://www.google.com/maps/search/?api=1&query=',
    });

    const latLng = `${customer.latitude},${customer.longitude}`;
    const label = encodeURIComponent(customer.name);

    const url = Platform.select({
      ios: `${scheme}?q=${label}&ll=${latLng}`,
      android: `${scheme}${latLng}?q=${label}`,
      web: `${scheme}${latLng}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const callCustomer = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleStartSession = async (scheduleCustomer: any) => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    if (activeSession && activeSession.status === 'active') {
      showToast('Another session is already active. Please end the current session first.', 'error');
      return;
    }

    try {
      setProcessing(scheduleCustomer.id);

      // Start sales session
      const session = await salesSessionApi.startSession(
        selectedVan.id,
        scheduleCustomer.customer_id,
        null, // salesman_id - can be added if available
        scheduleCustomer.customer.latitude || 0,
        scheduleCustomer.customer.longitude || 0
      );

      // Update visit status to in_progress
      await scheduleApi.updateCustomerVisitStatus(
        scheduleCustomer.id,
        'in_progress',
        new Date().toISOString()
      );

      // Reload schedule and session context
      await loadTodaySchedule();
      await refreshSession();
      showToast('Session started successfully', 'success');
    } catch (error) {
      console.error('Error starting session:', error);
      showToast('Failed to start session', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleEndSession = (scheduleCustomer: any) => {
    if (!activeSession || activeSession.customer_id !== scheduleCustomer.customer_id) {
      showToast('Cannot end session for this customer', 'error');
      return;
    }

    setCustomerToEnd(scheduleCustomer);
    setShowEndModal(true);
  };

  const confirmEndSession = async () => {
    if (!customerToEnd || !activeSession) return;

    try {
      setProcessing(customerToEnd.id);

      // End sales session
      await salesSessionApi.endSession(
        activeSession.id,
        customerToEnd.customer.latitude || 0,
        customerToEnd.customer.longitude || 0
      );

      // Update visit status to completed
      await scheduleApi.updateCustomerVisitStatus(
        customerToEnd.id,
        'completed',
        new Date().toISOString()
      );

      // Reload schedule and refresh sessions
      await loadTodaySchedule();
      await refreshSession();

      setShowEndModal(false);
      setCustomerToEnd(null);
      showToast('Session ended successfully', 'success');
    } catch (error) {
      console.error('Error ending session:', error);
      showToast('Failed to end session', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const getVisitStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.warning;
      case 'skipped':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getVisitStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return <Loading />;
  }

  if (!schedule) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.content}>
          <EmptyState
            icon={Clock}
            title="No Schedule Today"
            message="You don't have any scheduled visits for today"
          />
        </View>
      </View>
    );
  }

  const sortedCustomers = [...(schedule.customers || [])].sort(
    (a, b) => a.visit_order - b.visit_order
  );

  const completedCount = sortedCustomers.filter((c) => c.visit_status === 'completed').length;
  const totalCount = sortedCustomers.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity
          onPress={() => router.push(`/scheduler/edit-schedule?id=${schedule.id}` as any)}
          style={styles.editButton}
        >
          <Edit size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryDate}>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Route</Text>
              <Text style={styles.summaryValue}>{schedule.route?.name || 'N/A'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Progress</Text>
              <Text style={styles.summaryValue}>
                {completedCount} / {totalCount}
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedCount / totalCount) * 100}%` },
              ]}
            />
          </View>
        </Card>

        <View style={styles.customerList}>
          <Text style={styles.listTitle}>Customers ({totalCount})</Text>
          {sortedCustomers.map((scheduleCustomer) => {
            const customer = scheduleCustomer.customer;
            return (
              <Card key={scheduleCustomer.id} style={styles.customerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{scheduleCustomer.visit_order}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    {customer.address && (
                      <View style={styles.customerDetail}>
                        <MapPin size={14} color={colors.textSecondary} />
                        <Text style={styles.customerDetailText} numberOfLines={1}>
                          {customer.address}
                        </Text>
                      </View>
                    )}
                    {scheduleCustomer.planned_time && (
                      <View style={styles.customerDetail}>
                        <Clock size={14} color={colors.textSecondary} />
                        <Text style={styles.customerDetailText}>
                          Planned: {scheduleCustomer.planned_time}
                        </Text>
                      </View>
                    )}
                  </View>
                  {scheduleCustomer.visit_status === 'completed' && (
                    <CheckCircle size={24} color={colors.success} />
                  )}
                </View>

                <View style={styles.statusRow}>
                  <Badge
                    label={getVisitStatusLabel(scheduleCustomer.visit_status)}
                    variant={
                      scheduleCustomer.visit_status === 'completed'
                        ? 'success'
                        : scheduleCustomer.visit_status === 'in_progress'
                        ? 'warning'
                        : scheduleCustomer.visit_status === 'skipped'
                        ? 'error'
                        : 'neutral'
                    }
                  />
                </View>

                <View style={styles.customerActions}>
                  {scheduleCustomer.visit_status === 'completed' ? (
                    <View style={styles.completedContainer}>
                      <CheckCircle size={20} color={colors.success} />
                      <Text style={styles.completedText}>Visit Completed</Text>
                    </View>
                  ) : activeSession && activeSession.status === 'active' ? (
                    activeSession.customer_id === scheduleCustomer.customer_id ? (
                      <Button
                        title="End Session"
                        onPress={() => handleEndSession(scheduleCustomer)}
                        variant="danger"
                        icon={Square}
                        loading={processing === scheduleCustomer.id}
                        disabled={processing !== null}
                      />
                    ) : (
                      <Button
                        title="Start Session"
                        onPress={() => {}}
                        icon={Play}
                        disabled={true}
                      />
                    )
                  ) : (
                    <Button
                      title="Start Session"
                      onPress={() => handleStartSession(scheduleCustomer)}
                      icon={Play}
                      loading={processing === scheduleCustomer.id}
                      disabled={processing !== null}
                    />
                  )}
                  {customer.phone && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => callCustomer(customer.phone)}
                    >
                      <Phone size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {scheduleCustomer.notes && (
                  <Text style={styles.customerNotes}>{scheduleCustomer.notes}</Text>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showEndModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !processing && setShowEndModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <AlertTriangle size={48} color={colors.warning} />
            </View>

            <Text style={styles.modalTitle}>End Session</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to end the session with {customerToEnd?.customer?.name}?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEndModal(false);
                  setCustomerToEnd(null);
                }}
                disabled={processing !== null}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <Button
                title={processing ? 'Ending...' : 'End Session'}
                onPress={confirmEndSession}
                disabled={processing !== null}
                variant="danger"
                style={styles.confirmButton}
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
  editButton: {
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
  summaryCard: {
    padding: 20,
    marginBottom: 24,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  customerList: {
    gap: 16,
    marginBottom: 40,
  },
  customerCard: {
    padding: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  customerInfo: {
    flex: 1,
    gap: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  statusRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },
  customerActions: {
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
  completedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.success + '10',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  customerNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    marginBottom: 0,
  },
});
