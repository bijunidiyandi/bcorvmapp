import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ChevronLeft, Database, RefreshCw, Trash2 } from 'lucide-react-native';
import { getDatabase } from '@/lib/services/database';
import { useToast } from '@/hooks/useToast';

export default function DatabaseDebugScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const loadInvoicesRaw = async () => {
    try {
      setLoading(true);
      const db = getDatabase();
      const data = await db.getAllAsync('SELECT id, invoice_number, total_amount, paid_amount, balance_amount, payment_status FROM sales_invoices ORDER BY invoice_date DESC');
      console.log('Raw invoice data from SQLite:', data);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading raw invoices:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fixInvoiceData = async () => {
    try {
      setFixing(true);
      const db = getDatabase();

      // Get all invoices
      const allInvoices = await db.getAllAsync('SELECT id, total_amount, paid_amount FROM sales_invoices');

      console.log('=== FIXING INVOICE DATA ===');
      console.log(`Found ${allInvoices.length} invoices to check`);

      let fixedCount = 0;

      for (const invoice of allInvoices) {
        // If paid_amount is 25.7 but total is different, reset it
        if (invoice.paid_amount === 25.7 && invoice.total_amount !== 25.7) {
          console.log(`Fixing invoice ${invoice.id}: total=${invoice.total_amount}, paid was 25.7`);

          // Set paid_amount to 0 and recalculate balance
          await db.runAsync(
            'UPDATE sales_invoices SET paid_amount = 0, balance_amount = total_amount, payment_status = ? WHERE id = ?',
            [invoice.total_amount > 0 ? 'unpaid' : 'paid', invoice.id]
          );

          fixedCount++;
        }
      }

      console.log(`Fixed ${fixedCount} invoices`);
      showToast(`Fixed ${fixedCount} invoice(s)`, 'success');

      // Reload data
      await loadInvoicesRaw();
    } catch (error) {
      console.error('Error fixing invoices:', error);
      showToast('Failed to fix data', 'error');
    } finally {
      setFixing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Database Debug</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Data Inspection</Text>
          <Text style={styles.sectionDesc}>
            This tool shows raw invoice data from SQLite and can fix data corruption issues.
          </Text>

          <View style={styles.buttonRow}>
            <Button
              title="Load Raw Data"
              onPress={loadInvoicesRaw}
              icon={Database}
              disabled={loading || fixing}
            />
            <View style={{ width: 12 }} />
            <Button
              title={fixing ? "Fixing..." : "Fix All 25.7 Issues"}
              onPress={fixInvoiceData}
              icon={RefreshCw}
              disabled={loading || fixing}
            />
          </View>
        </Card>

        {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}

        {invoices.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Found {invoices.length} Invoice(s)</Text>
            {invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
                <View style={styles.invoiceDetails}>
                  <Text style={styles.detailText}>Total: {inv.total_amount?.toFixed(3)} BHD</Text>
                  <Text style={[styles.detailText, inv.paid_amount === 25.7 && styles.errorText]}>
                    Paid: {inv.paid_amount?.toFixed(3)} BHD
                    {inv.paid_amount === 25.7 && inv.total_amount !== 25.7 && ' ⚠️'}
                  </Text>
                  <Text style={styles.detailText}>Balance: {inv.balance_amount?.toFixed(3)} BHD</Text>
                  <Text style={styles.detailText}>Status: {inv.payment_status}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {toast.visible && (
        <Toast message={toast.message} type={toast.type} onHide={hideToast} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  loader: {
    marginVertical: 32,
  },
  invoiceRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  invoiceDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontWeight: '600',
  },
});
