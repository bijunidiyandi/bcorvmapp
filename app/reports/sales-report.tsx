import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { colors } from '@/constants/colors';
import { salesInvoiceApi, vanApi, customerApi } from '@/lib/services/sqlite-api';
import { userApi } from '@/lib/services/auth';
import { SalesInvoiceWithDetails, Van, User, CustomerWithDetails } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { MetricCard } from '@/components/common/MetricCard';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Toast } from '@/components/common/Toast';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, CreditCard, Filter, Printer, X, Download, Share2 } from 'lucide-react-native';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useToast } from '@/hooks/useToast';

export default function SalesReportScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<SalesInvoiceWithDetails[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceWithDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vanId: '',
    userId: '',
    customerId: '',
    paymentStatus: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [invoicesData, vansData, usersData, customersData] = await Promise.all([
        salesInvoiceApi.getAll(),
        vanApi.getAll(),
        userApi.getAll(),
        customerApi.getAll(),
      ]);
      setInvoices(invoicesData);
      setVans(vansData);
      setUsers(usersData.filter((u: User) => u.role === 'SALESMAN'));
      setCustomers(customersData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load sales report data');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (filters.startDate && invoice.invoice_date < filters.startDate) return false;
    if (filters.endDate && invoice.invoice_date > filters.endDate) return false;
    if (filters.vanId && invoice.van_id !== filters.vanId) return false;
    if (filters.userId && invoice.van?.user_id !== filters.userId) return false;
    if (filters.customerId && invoice.customer_id !== filters.customerId) return false;
    if (filters.paymentStatus && invoice.payment_status !== filters.paymentStatus) return false;
    return true;
  });

  const metrics = {
    totalSales: filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    totalInvoices: filteredInvoices.length,
    totalPaid: filteredInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0),
    averageValue: filteredInvoices.length > 0
      ? filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0) / filteredInvoices.length
      : 0,
  };

  const handleViewInvoice = (invoice: SalesInvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice || Platform.OS !== 'web') {
      showToast('Printing is only available on web platform', 'error');
      return;
    }

    const invoice = selectedInvoice;
    const items = invoice.items || [];

    const calculateLineTotal = (item: any) => {
      const subtotal = item.quantity * item.unit_price;
      const discountAmount = (subtotal * item.discount_percent) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * item.tax_rate) / 100;
      return afterDiscount + taxAmount;
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to print the invoice', 'error');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { margin: 0 0 10px; font-size: 28px; }
          h2 { margin: 20px 0 10px; font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 5px; }
          .header { text-align: center; margin-bottom: 40px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: 600; color: #666; }
          .value { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .summary { margin-top: 40px; }
          .summary-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-row { font-size: 20px; font-weight: 700; padding-top: 10px; border-top: 2px solid #333; margin-top: 10px; }
          .footer { margin-top: 60px; text-align: center; color: #666; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALES INVOICE</h1>
          <p style="font-size: 18px; margin: 5px 0;">${invoice.invoice_number}</p>
          <p style="color: #666;">${formatDate(invoice.invoice_date)}</p>
        </div>

        <div class="info-section">
          <div class="info-row">
            <div>
              <div class="label">Van</div>
              <div>${invoice.van?.vehicle_number || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Customer</div>
              <div>${invoice.customer?.name || invoice.walk_in_customer_name || 'Walk-in'}</div>
              ${invoice.customer?.code ? `<div style="color: #666;">${invoice.customer.code}</div>` : ''}
            </div>
          </div>
        </div>

        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Disc%</th>
              <th class="text-right">Tax%</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <div style="font-weight: 600;">${item.item?.name || 'Unknown'}</div>
                  <div style="font-size: 12px; color: #666;">${item.item?.code || ''}</div>
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${item.discount_percent || 0}%</td>
                <td class="text-right">${item.tax_rate || 0}%</td>
                <td class="text-right" style="font-weight: 600;">${formatCurrency(calculateLineTotal(item))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="label">Subtotal</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Discount</span>
            <span>-${formatCurrency(invoice.discount_amount)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Tax</span>
            <span>${formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div class="summary-row total-row">
            <span>TOTAL</span>
            <span>${formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>

        <div class="info-section" style="margin-top: 30px;">
          <h2>Payment Details</h2>
          <div class="info-row">
            <span class="label">Payment Mode</span>
            <span>${invoice.payment_mode.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="label">Amount Paid</span>
            <span>${formatCurrency(invoice.paid_amount)}</span>
          </div>
          <div class="info-row">
            <span class="label">Balance</span>
            <span style="font-weight: 600; color: ${invoice.balance_amount > 0 ? '#ef4444' : '#10b981'};">
              ${formatCurrency(invoice.balance_amount)}
            </span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="info-section">
            <h2>Notes</h2>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    if (!selectedInvoice || Platform.OS !== 'web') {
      showToast('PDF download is only available on web platform', 'error');
      return;
    }

    const invoice = selectedInvoice;
    const items = invoice.items || [];

    const calculateLineTotal = (item: any) => {
      const subtotal = item.quantity * item.unit_price;
      const discountAmount = (subtotal * item.discount_percent) / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = (afterDiscount * item.tax_rate) / 100;
      return afterDiscount + taxAmount;
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to download the PDF', 'error');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { margin: 0 0 10px; font-size: 28px; }
          h2 { margin: 20px 0 10px; font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 5px; }
          .header { text-align: center; margin-bottom: 40px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: 600; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .summary { margin-top: 40px; }
          .summary-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .total-row { font-size: 20px; font-weight: 700; padding-top: 10px; border-top: 2px solid #333; margin-top: 10px; }
          .footer { margin-top: 60px; text-align: center; color: #666; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALES INVOICE</h1>
          <p style="font-size: 18px; margin: 5px 0;">${invoice.invoice_number}</p>
          <p style="color: #666;">${formatDate(invoice.invoice_date)}</p>
        </div>

        <div class="info-section">
          <div class="info-row">
            <div>
              <div class="label">Van</div>
              <div>${invoice.van?.vehicle_number || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Customer</div>
              <div>${invoice.customer?.name || invoice.walk_in_customer_name || 'Walk-in'}</div>
              ${invoice.customer?.code ? `<div style="color: #666;">${invoice.customer.code}</div>` : ''}
            </div>
          </div>
        </div>

        <h2>Items</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Disc%</th>
              <th class="text-right">Tax%</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <div style="font-weight: 600;">${item.item?.name || 'Unknown'}</div>
                  <div style="font-size: 12px; color: #666;">${item.item?.code || ''}</div>
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${item.discount_percent || 0}%</td>
                <td class="text-right">${item.tax_rate || 0}%</td>
                <td class="text-right" style="font-weight: 600;">${formatCurrency(calculateLineTotal(item))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="label">Subtotal</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Discount</span>
            <span>-${formatCurrency(invoice.discount_amount)}</span>
          </div>
          <div class="summary-row">
            <span class="label">Tax</span>
            <span>${formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div class="summary-row total-row">
            <span>TOTAL</span>
            <span>${formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>

        <div class="info-section" style="margin-top: 30px;">
          <h2>Payment Details</h2>
          <div class="info-row">
            <span class="label">Payment Mode</span>
            <span>${invoice.payment_mode.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="label">Amount Paid</span>
            <span>${formatCurrency(invoice.paid_amount)}</span>
          </div>
          <div class="info-row">
            <span class="label">Balance</span>
            <span style="font-weight: 600; color: ${invoice.balance_amount > 0 ? '#ef4444' : '#10b981'};">
              ${formatCurrency(invoice.balance_amount)}
            </span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="info-section">
            <h2>Notes</h2>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    if (!selectedInvoice) {
      return;
    }

    const invoice = selectedInvoice;
    const customerPhone = invoice.customer?.phone;

    if (!customerPhone) {
      showToast('Customer phone number is not available', 'error');
      return;
    }

    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

    const message = `Hello ${invoice.customer?.name || 'Customer'},\n\nYour invoice ${invoice.invoice_number} dated ${formatDate(invoice.invoice_date)} is ready.\n\nInvoice Amount: ${formatCurrency(invoice.total_amount)}\nAmount Paid: ${formatCurrency(invoice.paid_amount)}\nBalance: ${formatCurrency(invoice.balance_amount)}\n\nThank you for your business!`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank');
    } else {
      showToast('WhatsApp sharing is only available on web platform', 'error');
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      vanId: '',
      userId: '',
      customerId: '',
      paymentStatus: '',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales Report</Text>
          <View style={styles.backButton} />
        </View>
        <Loading message="Loading sales report..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales Report</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <Filter size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <ErrorMessage message={error} onRetry={loadData} style={styles.error} />
      )}

      <ScrollView style={styles.scrollView}>
        {showFilters && (
          <Card style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>Filters</Text>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>From</Text>
                  <TextInput
                    style={styles.input}
                    value={filters.startDate}
                    onChangeText={(text) => setFilters({ ...filters, startDate: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>To</Text>
                  <TextInput
                    style={styles.input}
                    value={filters.endDate}
                    onChangeText={(text) => setFilters({ ...filters, endDate: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Van</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.vanId}
                  onValueChange={(value) => setFilters({ ...filters, vanId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="All Vans" value="" />
                  {vans.map((v) => (
                    <Picker.Item key={v.id} label={v.vehicle_number} value={v.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>User</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.userId}
                  onValueChange={(value) => setFilters({ ...filters, userId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="All Users" value="" />
                  {users.map((u) => (
                    <Picker.Item key={u.id} label={u.user_name} value={u.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Customer</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.customerId}
                  onValueChange={(value) => setFilters({ ...filters, customerId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="All Customers" value="" />
                  {customers.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Payment Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.paymentStatus}
                  onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="All Status" value="" />
                  <Picker.Item label="Paid" value="paid" />
                  <Picker.Item label="Partial" value="partial" />
                  <Picker.Item label="Unpaid" value="unpaid" />
                </Picker>
              </View>
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </Card>
        )}

        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <MetricCard
                title="Total Sales"
                value={formatCurrency(metrics.totalSales)}
                icon={DollarSign}
                color={colors.success}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Invoices"
                value={metrics.totalInvoices.toString()}
                icon={ShoppingBag}
                color={colors.primary}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <MetricCard
                title="Total Paid"
                value={formatCurrency(metrics.totalPaid)}
                icon={CreditCard}
                color={colors.accent}
              />
            </View>
            <View style={styles.metricCard}>
              <MetricCard
                title="Avg. Value"
                value={formatCurrency(metrics.averageValue)}
                icon={TrendingUp}
                color={colors.info}
              />
            </View>
          </View>
        </View>

        <View style={styles.invoicesSection}>
          <Text style={styles.sectionTitle}>Sales Invoices</Text>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No Sales Found"
              message="No sales invoices match your filters"
            />
          ) : (
            <View style={styles.invoicesList}>
              {filteredInvoices.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  activeOpacity={0.7}
                  onPress={() => handleViewInvoice(invoice)}
                >
                  <Card style={styles.invoiceCard}>
                    <View style={styles.invoiceHeader}>
                      <View style={styles.invoiceHeaderLeft}>
                        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                        <Text style={styles.invoiceDate}>{formatDate(invoice.invoice_date)}</Text>
                      </View>
                      <View style={styles.invoiceHeaderRight}>
                        <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total_amount)}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            invoice.payment_status === 'paid' && styles.statusPaid,
                            invoice.payment_status === 'partial' && styles.statusPartial,
                            invoice.payment_status === 'unpaid' && styles.statusUnpaid,
                          ]}
                        >
                          <Text style={styles.statusText}>{invoice.payment_status?.toUpperCase() || 'UNPAID'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.invoiceDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Customer:</Text>
                        <Text style={styles.detailValue}>
                          {invoice.customer?.name || invoice.walk_in_customer_name || 'Walk-in'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Van:</Text>
                        <Text style={styles.detailValue}>{invoice.van?.vehicle_number || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment:</Text>
                        <Text style={styles.detailValue}>{invoice.payment_mode.toUpperCase()}</Text>
                      </View>
                      {invoice.paid_amount > 0 && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Paid:</Text>
                          <Text style={[styles.detailValue, styles.paidAmount]}>
                            {formatCurrency(invoice.paid_amount)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.invoiceActions}>
                      <TouchableOpacity
                        style={styles.printButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedInvoice(invoice);
                          setShowInvoiceModal(true);
                        }}
                      >
                        <Printer size={16} color={colors.primary} />
                        <Text style={styles.printButtonText}>View & Print</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showInvoiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Details</Text>
              <TouchableOpacity
                onPress={() => setShowInvoiceModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.invoicePreview}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewInvoiceNumber}>
                      {selectedInvoice.invoice_number}
                    </Text>
                    <Text style={styles.previewDate}>
                      {formatDate(selectedInvoice.invoice_date)}
                    </Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Customer</Text>
                    <Text style={styles.previewValue}>
                      {selectedInvoice.customer?.name || selectedInvoice.walk_in_customer_name || 'Walk-in'}
                    </Text>
                    {selectedInvoice.customer?.code && (
                      <Text style={styles.previewSubvalue}>{selectedInvoice.customer.code}</Text>
                    )}
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Van</Text>
                    <Text style={styles.previewValue}>
                      {selectedInvoice.van?.vehicle_number || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.previewDivider} />

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Items</Text>
                    {selectedInvoice.items?.map((item: any, index: number) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.item?.name || 'Unknown'}</Text>
                          <Text style={styles.itemCode}>{item.item?.code || ''}</Text>
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemQuantity}>{item.quantity} x {formatCurrency(item.unit_price)}</Text>
                          <Text style={styles.itemTotal}>{formatCurrency(item.line_total)}</Text>
                        </View>
                      </View>
                    )) || <Text>No items</Text>}
                  </View>

                  <View style={styles.previewDivider} />

                  <View style={styles.previewSection}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(selectedInvoice.subtotal)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount</Text>
                      <Text style={styles.summaryValue}>-{formatCurrency(selectedInvoice.discount_amount)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tax</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(selectedInvoice.tax_amount)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotalLabel}>Total</Text>
                      <Text style={styles.summaryTotalValue}>
                        {formatCurrency(selectedInvoice.total_amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.previewDivider} />

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Payment Details</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Payment Mode</Text>
                      <Text style={styles.summaryValue}>{selectedInvoice.payment_mode.toUpperCase()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Amount Paid</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(selectedInvoice.paid_amount)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Balance</Text>
                      <Text style={[
                        styles.summaryValue,
                        selectedInvoice.balance_amount > 0 ? styles.balanceUnpaid : styles.balancePaid
                      ]}>
                        {formatCurrency(selectedInvoice.balance_amount)}
                      </Text>
                    </View>
                  </View>

                  {selectedInvoice.notes && (
                    <>
                      <View style={styles.previewDivider} />
                      <View style={styles.previewSection}>
                        <Text style={styles.previewSectionTitle}>Notes</Text>
                        <Text style={styles.previewValue}>{selectedInvoice.notes}</Text>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionButton} onPress={handlePrintInvoice}>
                <Printer size={20} color={colors.white} />
                <Text style={styles.modalActionButtonText}>Print</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalActionButton} onPress={handleDownloadPDF}>
                <Download size={20} color={colors.white} />
                <Text style={styles.modalActionButtonText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.whatsappButton]}
                onPress={handleWhatsAppShare}
              >
                <Share2 size={20} color={colors.white} />
                <Text style={styles.modalActionButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
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
  filterButton: { padding: 8 },
  error: { margin: 20 },
  scrollView: { flex: 1 },
  filtersCard: { margin: 20, marginBottom: 12 },
  filtersTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  filterGroup: { marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateInput: { flex: 1 },
  dateLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  clearButton: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: { fontSize: 14, fontWeight: '600', color: colors.text },
  metricsContainer: { paddingHorizontal: 20, marginBottom: 20 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1 },
  invoicesSection: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  invoicesList: { gap: 12 },
  invoiceCard: { marginBottom: 0 },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  invoiceHeaderLeft: { flex: 1 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  invoiceDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  invoiceHeaderRight: { alignItems: 'flex-end' },
  invoiceAmount: { fontSize: 18, fontWeight: '700', color: colors.success, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusPaid: { backgroundColor: colors.success + '20' },
  statusPartial: { backgroundColor: colors.warning + '20' },
  statusUnpaid: { backgroundColor: colors.error + '20' },
  statusText: { fontSize: 10, fontWeight: '700' },
  invoiceDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  paidAmount: { color: colors.success },
  invoiceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
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
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  invoicePreview: {
    padding: 20,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  previewInvoiceNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    color: colors.text,
  },
  previewSubvalue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  balancePaid: {
    color: colors.success,
  },
  balanceUnpaid: {
    color: colors.error,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
});
