import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { colors } from '@/constants/colors';
import { Card } from '@/components/common/Card';
import { ChevronLeft, FileText } from 'lucide-react-native';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useVan } from '@/lib/contexts/VanContext';
import { salesInvoiceApi } from '@/lib/services/sqlite-transactions';

export default function InvoicesScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [selectedVan]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await salesInvoiceApi.getAll();
      console.log('=== LOADED INVOICES ===');
      data.forEach(inv => {
        console.log(`${inv.invoice_number}: Total=${inv.total_amount}, Paid=${inv.paid_amount}, Balance=${inv.balance_amount}`);
      });
      console.log('======================');
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderInvoice = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(`/transactions/edit-invoice?id=${item.id}` as any)}
    >
      <Card style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <View style={styles.iconContainer}>
            <FileText size={20} color={colors.primary} />
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
            <Text style={styles.invoiceDate}>{formatDate(item.invoice_date)}</Text>
          </View>
          <View style={styles.invoiceAmount}>
            <Text style={styles.amountText}>{formatCurrency(item.total_amount)}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.payment_status === 'paid'
                      ? colors.success + '20'
                      : item.payment_status === 'partial'
                      ? colors.warning + '20'
                      : colors.error + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.payment_status === 'paid'
                        ? colors.success
                        : item.payment_status === 'partial'
                        ? colors.warning
                        : colors.error,
                  },
                ]}
              >
                {item.payment_status === 'paid'
                  ? 'Paid'
                  : item.payment_status === 'partial'
                  ? 'Partial'
                  : 'Unpaid'}
              </Text>
            </View>
          </View>
        </View>
        {item.customer_name && (
          <Text style={styles.customerName}>Customer: {item.customer_name}</Text>
        )}
        {item.walk_in_customer_name && (
          <Text style={styles.customerName}>Walk-in: {item.walk_in_customer_name}</Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>View and edit invoices</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.centered}>
          <FileText size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No invoices found</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  invoiceCard: {
    marginBottom: 0,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
