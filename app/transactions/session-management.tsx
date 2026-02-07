import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { useSession } from '@/lib/contexts/SessionContext';
import { salesSessionApi, customerApi } from '@/lib/services/sqlite-api';
import { CustomerWithDetails } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SessionBanner } from '@/components/common/SessionBanner';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  PlayCircle,
  StopCircle,
  MapPin,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  X,
  Check,
  Search,
} from 'lucide-react-native';
import { formatDate } from '@/lib/utils/format';
import { calculateDistance, getCurrentPosition } from '@/lib/utils/geo';

export default function SessionManagementScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { refreshSession } = useSession();
  const { toast, showToast, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadCustomers(), loadActiveSessions()]);
    setLoading(false);
  };

  const loadCustomers = async () => {
    try {
      setError(null);
      const customersData = await customerApi.getAll();
      const customersWithLocation = customersData.filter(
        (c) => c.latitude !== null && c.longitude !== null
      );
      setCustomers(customersWithLocation);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers');
    }
  };

  const loadActiveSessions = async () => {
    try {
      const sessions = await salesSessionApi.getAllActive();

      // Load customer details for each session
      const sessionsWithCustomers = await Promise.all(
        sessions.map(async (session) => {
          const customer = await customerApi.getById(session.customer_id);
          return { ...session, customer };
        })
      );

      setActiveSessions(sessionsWithCustomers);
    } catch (err) {
      console.error('Error loading active sessions:', err);
    }
  };

  const handleStartSession = async () => {
    if (!selectedVan) {
      showToast('No van selected. Please select a van first.', 'error');
      return;
    }

    if (!selectedCustomerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      showToast('Customer not found', 'error');
      return;
    }

    if (customer.latitude === null || customer.longitude === null) {
      showToast('Customer location not available', 'error');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      let position = { latitude: 0, longitude: 0 };
      let distance = 0;
      let gpsAvailable = true;

      try {
        position = await getCurrentPosition();
        distance = calculateDistance(
          position.latitude,
          position.longitude,
          customer.latitude,
          customer.longitude
        );

        if (distance > 100) {
          showToast(
            `You are ${Math.round(distance)} meters away from the customer. Recommended distance is within 100 meters. Session will be created anyway.`,
            'warning'
          );
        }
      } catch (gpsError: any) {
        console.warn('GPS not available:', gpsError);
        gpsAvailable = false;

        const errorMessage = gpsError?.message || '';
        if (errorMessage.includes('permission')) {
          showToast(
            'Location permission required. Please enable location access in your device settings. Session will be created without location data.',
            'warning'
          );
        } else {
          showToast(
            'GPS location is not available. Session will be created without location data.',
            'warning'
          );
        }
      }

      await salesSessionApi.startSession(
        selectedVan.id,
        customer.id,
        null,
        gpsAvailable ? position.latitude : 0,
        gpsAvailable ? position.longitude : 0
      );

      await loadActiveSessions();
      await refreshSession();

      showToast(`Session started for ${customer.name}`, 'success');
      setSelectedCustomerId('');
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError('Failed to start session. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setShowCustomerSelector(false);
    setSearchTerm('');
  };

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.code.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search)
    );
  });

  const handleEndSession = async (sessionId: string, customerName: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to end the session with ${customerName}?`
      );
      if (!confirmed) return;
    }

    setProcessing(true);
    setError(null);

    try {
      let position = { latitude: 0, longitude: 0 };

      try {
        position = await getCurrentPosition();
      } catch (gpsError: any) {
        console.warn('GPS not available when ending session:', gpsError);
      }

      await salesSessionApi.endSession(
        sessionId,
        position.latitude,
        position.longitude
      );

      await loadActiveSessions();
      await refreshSession();

      showToast(`Session ended for ${customerName}`, 'success');
    } catch (err: any) {
      console.error('Error ending session:', err);
      setError('Failed to end session. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Management</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Management</Text>
        <View style={styles.backButton} />
      </View>

      <SessionBanner />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {error && <ErrorMessage message={error} />}

          {activeSessions.length > 0 && (
            <>
              <View style={styles.sessionsHeader}>
                <Text style={styles.sectionTitle}>Active Sessions ({activeSessions.length})</Text>
                <Text style={styles.sectionSubtitle}>
                  {activeSessions.length === 1 ? '1 session in progress' : `${activeSessions.length} sessions in progress`}
                </Text>
              </View>

              {activeSessions.map((session) => (
                <Card key={session.id} style={styles.activeSessionCard}>
                  <View style={styles.sessionStatusHeader}>
                    <View style={styles.sessionStatusIcon}>
                      <CheckCircle size={24} color={colors.success} />
                    </View>
                    <View style={styles.sessionStatusContent}>
                      <Text style={styles.sessionStatusTitle}>{session.customer?.name}</Text>
                      <Text style={styles.sessionStatusSubtitle}>
                        {session.customer?.code}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <View style={styles.sessionDetailRow}>
                      <View style={styles.sessionDetailIcon}>
                        <Clock size={20} color={colors.primary} />
                      </View>
                      <View style={styles.sessionDetailContent}>
                        <Text style={styles.sessionDetailLabel}>Started At</Text>
                        <Text style={styles.sessionDetailValue}>
                          {formatDate(session.start_time)}
                        </Text>
                      </View>
                    </View>

                    {session.customer?.address && (
                      <View style={styles.sessionDetailRow}>
                        <View style={styles.sessionDetailIcon}>
                          <MapPin size={20} color={colors.primary} />
                        </View>
                        <View style={styles.sessionDetailContent}>
                          <Text style={styles.sessionDetailLabel}>Address</Text>
                          <Text style={styles.sessionDetailValue}>
                            {session.customer.address}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <Button
                    title={processing ? 'Ending...' : 'End Session'}
                    onPress={() => handleEndSession(session.id, session.customer?.name || 'Customer')}
                    disabled={processing}
                    variant="danger"
                    icon={StopCircle}
                    style={styles.endSessionButton}
                  />
                </Card>
              ))}
            </>
          )}

          <Card>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {activeSessions.length > 0 ? 'Start Another Session' : 'Start New Session'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                Select a customer to begin a sales session. You will be asked for location permission to record GPS coordinates.
              </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Customer *</Text>
                    {customers.length === 0 ? (
                      <View style={styles.noCustomersBox}>
                        <Text style={styles.noCustomersText}>
                          No customers with GPS coordinates found. Please add GPS coordinates to customer records in Masters → Customers.
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.customerSelectorButton}
                        onPress={() => setShowCustomerSelector(true)}
                        activeOpacity={0.7}
                      >
                        <User size={20} color={selectedCustomer ? colors.primary : colors.textSecondary} />
                        <Text style={[
                          styles.customerSelectorText,
                          !selectedCustomer && styles.customerSelectorPlaceholder
                        ]}>
                          {selectedCustomer ? `${selectedCustomer.code} - ${selectedCustomer.name}` : 'Choose a customer'}
                        </Text>
                        <ChevronDown size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {selectedCustomer && (
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerInfoTitle}>Customer Details</Text>
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>Name:</Text>
                        <Text style={styles.customerInfoValue}>
                          {selectedCustomer.name}
                        </Text>
                      </View>
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>Code:</Text>
                        <Text style={styles.customerInfoValue}>
                          {selectedCustomer.code}
                        </Text>
                      </View>
                      {selectedCustomer.phone && (
                        <View style={styles.customerInfoRow}>
                          <Text style={styles.customerInfoLabel}>Phone:</Text>
                          <Text style={styles.customerInfoValue}>
                            {selectedCustomer.phone}
                          </Text>
                        </View>
                      )}
                      {selectedCustomer.address && (
                        <View style={styles.customerInfoRow}>
                          <Text style={styles.customerInfoLabel}>Address:</Text>
                          <Text style={styles.customerInfoValue}>
                            {selectedCustomer.address}
                          </Text>
                        </View>
                      )}
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>GPS:</Text>
                        <Text style={styles.customerInfoValue}>
                          {selectedCustomer.latitude?.toFixed(6)},{' '}
                          {selectedCustomer.longitude?.toFixed(6)}
                        </Text>
                      </View>
                    </View>
                  )}

              <Button
                title={processing ? 'Starting Session...' : 'Start Session'}
                onPress={handleStartSession}
                disabled={!selectedCustomerId || processing}
                style={styles.startButton}
              />
            </View>
          </Card>

          <Card style={styles.requirementsCard}>
            <View style={styles.requirementsHeader}>
              <AlertCircle size={20} color={colors.info} />
              <Text style={styles.requirementsTitle}>Session Information</Text>
            </View>
            <View style={styles.requirementsList}>
              <View style={styles.requirementItem}>
                <View style={styles.requirementBullet} />
                <Text style={styles.requirementText}>
                  You can have multiple sessions active at the same time
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <View style={styles.requirementBullet} />
                <Text style={styles.requirementText}>
                  GPS location will be recorded if you grant location permission
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <View style={styles.requirementBullet} />
                <Text style={styles.requirementText}>
                  Only customers with saved GPS coordinates are available
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <View style={styles.requirementBullet} />
                <Text style={styles.requirementText}>
                  End each session individually when done
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <Modal
        visible={showCustomerSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCustomerSelector(false);
                  setSearchTerm('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, code, or phone"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => handleSelectCustomer(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.customerItemContent}>
                    <User size={20} color={colors.primary} />
                    <View style={styles.customerItemText}>
                      <Text style={styles.customerItemName}>{item.name}</Text>
                      <Text style={styles.customerItemCode}>{item.code}</Text>
                      {item.phone && (
                        <Text style={styles.customerItemPhone}>{item.phone}</Text>
                      )}
                    </View>
                  </View>
                  {selectedCustomerId === item.id && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>
                    {searchTerm ? 'No customers found matching your search' : 'No customers available'}
                  </Text>
                </View>
              )}
            />
          </View>
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
  scrollView: { flex: 1 },
  content: { padding: 20, gap: 16 },
  sessionsHeader: {
    marginBottom: 8,
  },
  activeSessionCard: {
    backgroundColor: colors.success + '05',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  sessionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sessionStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionStatusContent: { flex: 1 },
  sessionStatusTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sessionStatusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionDetails: { gap: 16, marginBottom: 20 },
  sessionDetailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sessionDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionDetailContent: { flex: 1 },
  sessionDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  sessionDetailValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  sessionDetailSubvalue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  endSessionButton: { marginBottom: 0 },
  section: { gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: -8 },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  customerSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  customerSelectorText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  customerSelectorPlaceholder: {
    color: colors.textSecondary,
  },
  noCustomersBox: {
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: 8,
    padding: 16,
  },
  noCustomersText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  customerInfo: {
    backgroundColor: colors.info + '10',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  customerInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  customerInfoRow: { flexDirection: 'row', gap: 8 },
  customerInfoLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, width: 80 },
  customerInfoValue: { fontSize: 14, color: colors.text, flex: 1 },
  startButton: { marginBottom: 0, marginTop: 8 },
  infoCard: {
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', color: colors.info },
  infoText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  requirementsCard: {
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requirementsTitle: { fontSize: 16, fontWeight: '700', color: colors.info },
  requirementsList: { gap: 12 },
  requirementItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  requirementBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info,
    marginTop: 6,
  },
  requirementText: { fontSize: 14, color: colors.text, flex: 1, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 8,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  customerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerItemText: {
    flex: 1,
    gap: 2,
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  customerItemCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerItemPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
