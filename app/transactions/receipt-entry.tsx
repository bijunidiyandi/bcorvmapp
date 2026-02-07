import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { useSession } from '@/lib/contexts/SessionContext';
import {
  receiptApi,
  customerApi,
  salesInvoiceApi,
  vanApi,
} from '@/lib/services/sqlite-api';
import {
  CustomerWithDetails,
  SalesInvoiceWithDetails,
  Van,
} from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { SessionBanner } from '@/components/common/SessionBanner';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Receipt, DollarSign } from 'lucide-react-native';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default function ReceiptEntryScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { activeSession, hasActiveSession } = useSession();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);

  const [receiptNumber, setReceiptNumber] = useState('');
  const [vanId, setVanId] = useState(selectedVan?.id || '');
  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<
    'cash' | 'card' | 'cheque' | 'bank_transfer'
  >('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!hasActiveSession()) {
      setShowSessionWarning(true);
    } else if (activeSession?.customer) {
      setCustomerId(activeSession.customer.id);
    }
  }, [activeSession]);

  useEffect(() => {
    if (customerId) {
      loadCustomerInvoices();
    } else {
      setInvoices([]);
      setInvoiceId('');
    }
  }, [customerId]);

  const loadData = async () => {
    try {
      setError(null);
      const [customersData, vansData, generatedReceiptNumber] =
        await Promise.all([
          customerApi.getAll(),
          vanApi.getAll(),
          receiptApi.generateReceiptNumber(),
        ]);
      setCustomers(customersData);
      setVans(vansData);
      setReceiptNumber(generatedReceiptNumber);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInvoices = async () => {
    try {
      const allInvoices = await salesInvoiceApi.getAll(vanId);
      const customerInvoices = allInvoices.filter(
        (inv) =>
          inv.customer_id === customerId &&
          inv.payment_status !== 'paid' &&
          inv.balance_amount > 0
      );
      setInvoices(customerInvoices);
    } catch (err) {
      console.error('Error loading invoices:', err);
    }
  };

  const handleSubmit = async () => {
    if (!vanId) {
      showToast('Please select a van', 'error');
      return;
    }

    if (!customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (
      (paymentMode === 'cheque' || paymentMode === 'bank_transfer') &&
      !referenceNumber
    ) {
      showToast(
        'Please enter a reference number for cheque/bank transfer',
        'error'
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await receiptApi.create({
        receipt_number: receiptNumber,
        van_id: vanId,
        customer_id: customerId,
        invoice_id: invoiceId || null,
        receipt_date: receiptDate,
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        reference_number: referenceNumber || null,
        notes: notes || null,
      });

      showToast('Receipt created successfully', 'success');
      router.back();
    } catch (err) {
      console.error('Error creating receipt:', err);
      setError('Failed to create receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedInvoice = invoices.find((i) => i.id === invoiceId);

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
          <Text style={styles.headerTitle}>Receipt Entry</Text>
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
        <Text style={styles.headerTitle}>Receipt Entry</Text>
        <View style={styles.backButton} />
      </View>

      <SessionBanner />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {error && <ErrorMessage message={error} />}

          <Card>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receipt Details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Receipt Number</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={receiptNumber}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Van *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vanId}
                    onValueChange={(value) => setVanId(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Van" value="" />
                    {vans.map((van) => (
                      <Picker.Item
                        key={van.id}
                        label={`${van.code} - ${van.vehicle_number}`}
                        value={van.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Receipt Date *</Text>
                <TextInput
                  style={styles.input}
                  value={receiptDate}
                  onChangeText={setReceiptDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </Card>

          {showSessionWarning && !hasActiveSession() && (
            <Card style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningTitle}>No Active Session</Text>
              </View>
              <Text style={styles.warningText}>
                You must start a customer session before recording a receipt. Go to Session Management to begin.
              </Text>
              <Button
                title="Go to Session Management"
                onPress={() => router.push('/transactions/session-management' as any)}
                variant="outline"
                style={styles.warningButton}
              />
            </Card>
          )}

          {hasActiveSession() && activeSession && (
            <Card style={styles.sessionInfoCard}>
              <View style={styles.sessionInfoHeader}>
                <Text style={styles.sessionInfoIcon}>✓</Text>
                <Text style={styles.sessionInfoTitle}>Active Session</Text>
              </View>
              <Text style={styles.sessionInfoText}>
                Session active with: <Text style={styles.sessionInfoCustomer}>{activeSession.customer?.name}</Text>
              </Text>
              <Text style={styles.sessionInfoSubtext}>
                Customer selection is locked during active session
              </Text>
            </Card>
          )}

          <Card>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Customer *</Text>
                <View style={[styles.pickerContainer, hasActiveSession() && styles.pickerDisabled]}>
                  <Picker
                    selectedValue={customerId}
                    onValueChange={(value) => {
                      if (!hasActiveSession()) {
                        setCustomerId(value);
                        setInvoiceId('');
                        setAmount('');
                      }
                    }}
                    enabled={!hasActiveSession()}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Customer" value="" />
                    {customers.map((customer) => (
                      <Picker.Item
                        key={customer.id}
                        label={`${customer.code} - ${customer.name}`}
                        value={customer.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {selectedCustomer && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Customer Details:</Text>
                  <Text style={styles.infoText}>
                    Name: {selectedCustomer.name}
                  </Text>
                  {selectedCustomer.phone && (
                    <Text style={styles.infoText}>
                      Phone: {selectedCustomer.phone}
                    </Text>
                  )}
                  {selectedCustomer.route?.name && (
                    <Text style={styles.infoText}>
                      Route: {selectedCustomer.route.name}
                    </Text>
                  )}
                </View>
              )}

              {customerId && invoices.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Invoice (Optional)</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={invoiceId}
                      onValueChange={(value) => {
                        setInvoiceId(value);
                        const invoice = invoices.find((i) => i.id === value);
                        if (invoice) {
                          setAmount(invoice.balance_amount.toString());
                        }
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="No Specific Invoice" value="" />
                      {invoices.map((invoice) => (
                        <Picker.Item
                          key={invoice.id}
                          label={`${invoice.invoice_number} - Balance: ${formatCurrency(invoice.balance_amount)}`}
                          value={invoice.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {selectedInvoice && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Invoice Details:</Text>
                  <Text style={styles.infoText}>
                    Invoice: {selectedInvoice.invoice_number}
                  </Text>
                  <Text style={styles.infoText}>
                    Date: {formatDate(selectedInvoice.invoice_date)}
                  </Text>
                  <Text style={styles.infoText}>
                    Total: {formatCurrency(selectedInvoice.total_amount)}
                  </Text>
                  <Text style={styles.infoText}>
                    Paid: {formatCurrency(selectedInvoice.paid_amount)}
                  </Text>
                  <Text style={[styles.infoText, styles.highlightText]}>
                    Balance: {formatCurrency(selectedInvoice.balance_amount)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount (BHD) *</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.000"
                  keyboardType="decimal-pad"
                />
                {selectedInvoice && parseFloat(amount || '0') > selectedInvoice.balance_amount && (
                  <Text style={styles.warningText}>
                    Amount exceeds invoice balance. Excess will be {formatCurrency(parseFloat(amount) - selectedInvoice.balance_amount)}
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Mode *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={paymentMode}
                    onValueChange={(value) =>
                      setPaymentMode(
                        value as 'cash' | 'card' | 'cheque' | 'bank_transfer'
                      )
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Cash" value="cash" />
                    <Picker.Item label="Card" value="card" />
                    <Picker.Item label="Cheque" value="cheque" />
                    <Picker.Item label="Bank Transfer" value="bank_transfer" />
                  </Picker>
                </View>
              </View>

              {(paymentMode === 'cheque' ||
                paymentMode === 'card' ||
                paymentMode === 'bank_transfer') && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Reference Number *
                    {paymentMode === 'cheque' && ' (Cheque Number)'}
                    {paymentMode === 'card' && ' (Transaction ID)'}
                    {paymentMode === 'bank_transfer' && ' (Transaction ID)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    placeholder="Enter reference number"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes (optional)"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </Card>

          {amount && parseFloat(amount) > 0 && (
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconContainer}>
                  <DollarSign size={24} color={colors.success} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Receipt Amount</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(parseFloat(amount))}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={saving ? 'Saving...' : 'Save Receipt'}
              onPress={handleSubmit}
              disabled={saving}
              style={styles.saveButton}
            />
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="outline"
              disabled={saving}
            />
          </View>
        </View>
      </ScrollView>

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
  section: { gap: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  pickerDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  warningCard: {
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
  },
  warningText: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 6,
    lineHeight: 18,
  },
  warningButton: {
    marginBottom: 0,
  },
  sessionInfoCard: {
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  sessionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sessionInfoIcon: {
    fontSize: 20,
  },
  sessionInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  sessionInfoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  sessionInfoCustomer: {
    fontWeight: '700',
    color: colors.success,
  },
  sessionInfoSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoBox: {
    backgroundColor: colors.info + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: { fontSize: 14, color: colors.text },
  highlightText: { fontWeight: '700', color: colors.primary },
  summaryCard: {
    marginTop: 8,
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '700', color: colors.success },
  buttonContainer: { gap: 12, marginTop: 8 },
  saveButton: { marginBottom: 0 },
});
