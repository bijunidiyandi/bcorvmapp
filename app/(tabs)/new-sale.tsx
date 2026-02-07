import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useVan } from '@/lib/contexts/VanContext';
import { useSession } from '@/lib/contexts/SessionContext';
import { customerApi, itemApi } from '@/lib/services/sqlite-api';
import { salesInvoiceApi } from '@/lib/services/sqlite-transactions';
import { Customer, CustomerWithDetails, ItemWithDetails, PaymentMode } from '@/lib/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Loading } from '@/components/common/Loading';
import { SessionBanner } from '@/components/common/SessionBanner';
import { Toast } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils/format';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  X,
  Check,
  User,
  AlertTriangle,
  Printer,
  Share2,
  CheckCircle,
  Download,
} from 'lucide-react-native';
import { generateInvoicePDF } from '@/lib/utils/pdf';

interface SaleItem {
  item: ItemWithDetails;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
}

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const time = date.getTime().toString().slice(-6);
  return `INV-${year}${month}${day}-${time}`;
};

export default function NewSaleScreen() {
  const router = useRouter();
  const { selectedVan } = useVan();
  const { activeSession, hasActiveSession } = useSession();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<any>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [customerType, setCustomerType] = useState<'registered' | 'walkin'>('registered');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [walkInCustomerName, setWalkInCustomerName] = useState('');
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [items, setItems] = useState<ItemWithDetails[]>([]);
  const [searchItemTerm, setSearchItemTerm] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [showPaymentModeSelector, setShowPaymentModeSelector] = useState(false);

  const [invoiceNumber] = useState(generateInvoiceNumber());

  useEffect(() => {
    if (!hasActiveSession()) {
      setShowSessionWarning(true);
    } else if (activeSession?.customer) {
      setCustomerType('registered');
      setSelectedCustomer(activeSession.customer as CustomerWithDetails);
    }
  }, [activeSession]);

  const searchCustomers = async (term: string) => {
    if (!term.trim()) {
      setCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const data = await customerApi.search(term);
      setCustomers(data);
    } catch (err) {
      console.error('Error searching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(searchCustomerTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchCustomerTerm]);

  const searchItems = async (term: string) => {
    if (!term.trim()) {
      setItems([]);
      return;
    }

    setLoadingItems(true);
    try {
      const data = await itemApi.search(term);
      setItems(data);
    } catch (err) {
      console.error('Error searching items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchItems(searchItemTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchItemTerm]);

  const getTaxRateFromCode = (taxcode: string): number => {
    switch (taxcode?.toLowerCase()) {
      case 'tx5':
        return 5;
      case 'tx10':
        return 10;
      default:
        return 0;
    }
  };

  const handleAddItem = (item: ItemWithDetails) => {
    const existingItem = saleItems.find((si) => si.item.id === item.id);
    if (existingItem) {
      showToast('This item is already in the sale list', 'warning');
      return;
    }

    const taxRate = getTaxRateFromCode(item.taxcode);

    setSaleItems([
      ...saleItems,
      {
        item,
        quantity: 1,
        unit_price: item.price || 0,
        discount_percent: 0,
        tax_rate: taxRate,
      },
    ]);
    setShowItemSelector(false);
    setSearchItemTerm('');
    setItems([]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'unit_price' | 'discount_percent',
    value: string
  ) => {
    const newItems = [...saleItems];
    const numValue = parseFloat(value) || 0;
    newItems[index][field] = numValue;
    setSaleItems(newItems);
  };

  const calculateLineTotal = (item: SaleItem) => {
    const subtotal = parseFloat((item.quantity * item.unit_price).toFixed(3));
    const discountAmount = parseFloat(((subtotal * item.discount_percent) / 100).toFixed(3));
    const afterDiscount = parseFloat((subtotal - discountAmount).toFixed(3));
    const taxAmount = parseFloat(((afterDiscount * item.tax_rate) / 100).toFixed(3));
    return parseFloat((afterDiscount + taxAmount).toFixed(3));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let total = 0;

    saleItems.forEach((item) => {
      const itemSubtotal = parseFloat((item.quantity * item.unit_price).toFixed(3));
      const discountAmount = parseFloat(((itemSubtotal * item.discount_percent) / 100).toFixed(3));
      const afterDiscount = parseFloat((itemSubtotal - discountAmount).toFixed(3));
      const taxAmount = parseFloat(((afterDiscount * item.tax_rate) / 100).toFixed(3));
      const lineTotal = parseFloat((afterDiscount + taxAmount).toFixed(3));

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalTax += taxAmount;
      total += lineTotal;
    });

    const paid = parseFloat(paidAmount) || 0;
    const balance = parseFloat((total - paid).toFixed(3));

    return { subtotal, totalDiscount, totalTax, total, paid, balance };
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      if (!createdInvoiceData) return;

      const { invoice, items, customer, van, totals } = createdInvoiceData;

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
            <p style="color: #666;">${new Date(invoice.invoice_date).toLocaleDateString()}</p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <div>
                <div class="label">Van</div>
                <div>${van.code} - ${van.vehicle_number}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Customer</div>
                <div>${customer.name}</div>
                ${customer.code ? `<div style="color: #666;">${customer.code}</div>` : ''}
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
              ${items.map((item: SaleItem, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div style="font-weight: 600;">${item.item.name}</div>
                    <div style="font-size: 12px; color: #666;">${item.item.code}</div>
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.unit_price)}</td>
                  <td class="text-right">${item.discount_percent}%</td>
                  <td class="text-right">${item.tax_rate}%</td>
                  <td class="text-right" style="font-weight: 600;">${formatCurrency(calculateLineTotal(item))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span class="label">Subtotal</span>
              <span>${formatCurrency(totals.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Discount</span>
              <span>-${formatCurrency(totals.totalDiscount)}</span>
            </div>
            <div class="summary-row">
              <span class="label">Tax</span>
              <span>${formatCurrency(totals.totalTax)}</span>
            </div>
            <div class="summary-row total-row">
              <span>TOTAL</span>
              <span>${formatCurrency(totals.total)}</span>
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
              <span>${formatCurrency(totals.paid)}</span>
            </div>
            <div class="info-row">
              <span class="label">Balance</span>
              <span style="font-weight: 600; color: ${totals.balance > 0 ? '#ef4444' : '#10b981'};">
                ${formatCurrency(totals.balance)}
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
    } else {
      showToast('Printing is only available on web platform. Use Share to send the invoice.', 'info');
    }
  };

  const handleShare = async () => {
    if (!createdInvoiceData) return;

    const { invoice, items, customer, van, totals } = createdInvoiceData;

    const invoiceText = `
SALES INVOICE
${'-'.repeat(40)}

Invoice: ${invoice.invoice_number}
Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
Van: ${van.code} - ${van.vehicle_number}
Customer: ${customer.name}
${customer.code ? `Code: ${customer.code}` : ''}

${'-'.repeat(40)}
ITEMS
${'-'.repeat(40)}

${items.map((item: SaleItem, index: number) => {
  return `${index + 1}. ${item.item.name}
   Code: ${item.item.code}
   Qty: ${item.quantity} x ${formatCurrency(item.unit_price)}
   Discount: ${item.discount_percent}%
   Tax: ${item.tax_rate}%
   Total: ${formatCurrency(calculateLineTotal(item))}
`;
}).join('\n')}

${'-'.repeat(40)}
SUMMARY
${'-'.repeat(40)}

Subtotal: ${formatCurrency(totals.subtotal)}
Discount: -${formatCurrency(totals.totalDiscount)}
Tax: ${formatCurrency(totals.totalTax)}
${'='.repeat(40)}
TOTAL: ${formatCurrency(totals.total)}
${'='.repeat(40)}

Payment: ${invoice.payment_mode.toUpperCase()}
Paid: ${formatCurrency(totals.paid)}
Balance: ${formatCurrency(totals.balance)}

${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}

Thank you for your business!
    `.trim();

    if (Platform.OS === 'web') {
      const blob = new Blob([invoiceText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Invoice downloaded successfully', 'success');
    } else {
      const Share = require('react-native').Share;
      try {
        await Share.share({
          message: invoiceText,
          title: `Invoice ${invoice.invoice_number}`,
        });
      } catch (err: any) {
        console.error('Error sharing:', err);
        showToast('Failed to share invoice', 'error');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdInvoiceId || !createdInvoiceData) {
      showToast('Invoice data not available', 'error');
      return;
    }

    setDownloadingPDF(true);
    try {
      const fullInvoice = await salesInvoiceApi.getById(createdInvoiceId);
      if (!fullInvoice) {
        showToast('Invoice not found', 'error');
        return;
      }

      const itemsWithDetails = await Promise.all(
        fullInvoice.items.map(async (invoiceItem: any) => {
          const item = await itemApi.getById(invoiceItem.item_id);
          return {
            ...invoiceItem,
            item: item,
            quantity: invoiceItem.quantity,
            unit_price: invoiceItem.unit_price,
            discount_percentage: invoiceItem.discount_percentage,
            tax_percentage: invoiceItem.tax_percentage,
            total_amount: invoiceItem.total_price,
          };
        })
      );

      const invoiceWithDetails = {
        ...fullInvoice,
        customer: createdInvoiceData.customer,
        van: createdInvoiceData.van,
        items: itemsWithDetails,
        subtotal_amount: createdInvoiceData.totals.subtotal,
        discount_amount: createdInvoiceData.totals.totalDiscount,
        tax_amount: createdInvoiceData.totals.totalTax,
        payment_status: fullInvoice.balance_amount === 0 ? 'paid' : fullInvoice.balance_amount < fullInvoice.total_amount ? 'partial' : 'unpaid',
      };

      await generateInvoicePDF({
        invoice: invoiceWithDetails,
        companyName: 'Van Sales Company',
      });

      showToast('PDF generated successfully', 'success');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setCreatedInvoiceData(null);
    setCreatedInvoiceId(null);
    router.back();
  };

  const handleSave = async () => {
    if (!selectedVan) {
      showToast('Please select a van first', 'error');
      return;
    }

    if (customerType === 'registered' && !selectedCustomer) {
      showToast('Please select a customer', 'error');
      return;
    }

    if (customerType === 'walkin' && !walkInCustomerName.trim()) {
      showToast('Please enter walk-in customer name', 'error');
      return;
    }

    if (saleItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const invalidItems = saleItems.filter((item) => item.quantity <= 0 || item.unit_price < 0);
    if (invalidItems.length > 0) {
      showToast('All items must have valid quantity and price', 'error');
      return;
    }

    const totals = calculateTotals();

    setLoading(true);
    try {
      const invoice = {
        invoice_number: invoiceNumber,
        van_id: selectedVan.id,
        customer_id: customerType === 'registered' ? selectedCustomer!.id : null,
        walk_in_customer_name: customerType === 'walkin' ? walkInCustomerName : null,
        invoice_date: new Date().toISOString().split('T')[0],
        subtotal: totals.subtotal,
        tax_amount: totals.totalTax,
        discount_amount: totals.totalDiscount,
        total_amount: totals.total,
        payment_mode: paymentMode,
        payment_status: (totals.balance === 0 ? 'paid' : totals.balance < totals.total ? 'partial' : 'unpaid') as 'paid' | 'partial' | 'unpaid',
        paid_amount: totals.paid,
        balance_amount: totals.balance,
        notes: notes || null,
      };

      const items = saleItems.map((item) => {
        const itemSubtotal = item.quantity * item.unit_price;
        const discountAmount = (itemSubtotal * item.discount_percent) / 100;
        const afterDiscount = itemSubtotal - discountAmount;
        const taxAmount = (afterDiscount * item.tax_rate) / 100;
        const lineTotal = afterDiscount + taxAmount;

        return {
          item_id: item.item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percent,
          tax_percentage: item.tax_rate,
          total_price: lineTotal,
        };
      });

      const createdInvoice = await salesInvoiceApi.create(invoice, items);

      setCreatedInvoiceId(createdInvoice.id);
      setCreatedInvoiceData({
        invoice,
        items: saleItems,
        customer: customerType === 'registered' ? selectedCustomer : { name: walkInCustomerName },
        van: selectedVan,
        totals,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error creating sale:', err);
      showToast(err.message || 'Failed to create sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedVan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Sale</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Please select a van first</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={styles.emptyButton}
          />
        </View>
      </View>
    );
  }

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Sale</Text>
        <View style={styles.backButton} />
      </View>

      <SessionBanner />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Number</Text>
          <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Van</Text>
          <View style={styles.vanInfo}>
            <Text style={styles.vanCode}>{selectedVan.code}</Text>
            <Text style={styles.vanVehicle}>{selectedVan.vehicle_number}</Text>
          </View>
        </Card>

        {showSessionWarning && !hasActiveSession() && (
          <Card style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>No Active Session</Text>
            </View>
            <Text style={styles.warningText}>
              You must start a customer session before creating an invoice. Go to Session Management to begin.
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

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Type *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => !hasActiveSession() && setCustomerType('registered')}
              disabled={hasActiveSession()}
            >
              <View style={[styles.radio, customerType === 'registered' && styles.radioSelected]}>
                {customerType === 'registered' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Registered Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => !hasActiveSession() && setCustomerType('walkin')}
              disabled={hasActiveSession()}
            >
              <View style={[styles.radio, customerType === 'walkin' && styles.radioSelected]}>
                {customerType === 'walkin' && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.radioLabel}>Walk-in Customer</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {customerType === 'registered' ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Customer *</Text>
            <TouchableOpacity
              style={[styles.selector, hasActiveSession() && styles.selectorDisabled]}
              onPress={() => !hasActiveSession() && setShowCustomerSelector(true)}
              disabled={hasActiveSession()}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.selectorText,
                    !selectedCustomer && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
                </Text>
                {selectedCustomer && (
                  <Text style={styles.customerCodeInline}>
                    Code: {selectedCustomer.code}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {selectedCustomer && selectedCustomer.phone && (
              <View style={styles.customerDetails}>
                <Text style={styles.customerInfo}>{selectedCustomer.phone}</Text>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={walkInCustomerName}
              onChangeText={setWalkInCustomerName}
              placeholder="Enter customer name"
            />
          </Card>
        )}

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowItemSelector(true)}
            >
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {saleItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <ShoppingCart size={48} color={colors.textSecondary} />
              <Text style={styles.emptyItemsText}>No items added yet</Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {saleItems.map((saleItem, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{saleItem.item.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Trash2 size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemCode}>{saleItem.item.code}</Text>
                  <View style={styles.itemInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Qty *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.quantity.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'quantity', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Price *</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.unit_price.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'unit_price', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Disc %</Text>
                      <TextInput
                        style={styles.smallInput}
                        value={saleItem.discount_percent.toString()}
                        onChangeText={(text) => handleUpdateItem(index, 'discount_percent', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemTaxLabel}>Tax: {saleItem.tax_rate}%</Text>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(calculateLineTotal(saleItem))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {saleItems.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(totals.totalDiscount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.totalTax)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totals.total)}</Text>
            </View>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details *</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Mode</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPaymentModeSelector(true)}
            >
              <Text style={styles.selectorText}>
                {paymentMode === 'cash' ? 'Cash' : paymentMode === 'credit' ? 'Credit' : 'Card'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount Paid (BHD)</Text>
            <TextInput
              style={styles.input}
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="numeric"
              placeholder="0.000"
            />
            {parseFloat(paidAmount || '0') > totals.total && totals.total > 0 && (
              <Text style={styles.warningText}>
                Amount paid exceeds total. Change will be {formatCurrency(parseFloat(paidAmount) - totals.total)}
              </Text>
            )}
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={[styles.balanceValue, totals.balance > 0 && styles.balancePositive]}>
              {formatCurrency(Math.max(0, totals.balance))}
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this sale..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        <Button
          title={loading ? 'Creating Sale...' : 'Create Sale'}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveButton}
        />
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
                  setSearchCustomerTerm('');
                  setCustomers([]);
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
                value={searchCustomerTerm}
                onChangeText={setSearchCustomerTerm}
                placeholder="Search customers by name, code, or phone..."
                autoFocus
              />
            </View>
            {loadingCustomers ? (
              <View style={styles.modalLoading}>
                <Loading message="Searching..." />
              </View>
            ) : (
              <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      setSelectedCustomer(item);
                      setShowCustomerSelector(false);
                      setSearchCustomerTerm('');
                      setCustomers([]);
                    }}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>
                        {item.code} {item.phone && `• ${item.phone}`}
                      </Text>
                    </View>
                    {selectedCustomer?.id === item.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchCustomerTerm ? 'No customers found' : 'Start typing to search...'}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showItemSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowItemSelector(false);
                  setSearchItemTerm('');
                  setItems([]);
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
                value={searchItemTerm}
                onChangeText={setSearchItemTerm}
                placeholder="Search items by name, code, or barcode..."
                autoFocus
              />
            </View>
            {loadingItems ? (
              <View style={styles.modalLoading}>
                <Loading message="Searching..." />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleAddItem(item)}
                  >
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{item.name}</Text>
                      <Text style={styles.listItemSubtitle}>
                        {item.code} • {formatCurrency(item.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchItemTerm ? 'No items found' : 'Start typing to search...'}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIcon}>
              <CheckCircle size={64} color={colors.success} />
            </View>

            <Text style={styles.successTitle}>Invoice Created!</Text>
            <Text style={styles.successSubtitle}>
              Invoice {createdInvoiceData?.invoice.invoice_number} has been created successfully
            </Text>

            {createdInvoiceData && (
              <View style={styles.invoicePreview}>
                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Customer</Text>
                  <Text style={styles.previewValue}>{createdInvoiceData.customer.name}</Text>
                  {createdInvoiceData.customer.code && (
                    <Text style={styles.previewSubvalue}>{createdInvoiceData.customer.code}</Text>
                  )}
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Van</Text>
                  <Text style={styles.previewValue}>
                    {createdInvoiceData.van.code} - {createdInvoiceData.van.vehicle_number}
                  </Text>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Total Amount</Text>
                  <Text style={styles.previewTotal}>
                    {formatCurrency(createdInvoiceData.totals.total)}
                  </Text>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Payment Status</Text>
                  <Text style={[
                    styles.previewValue,
                    createdInvoiceData.totals.balance === 0 && styles.previewPaid,
                    createdInvoiceData.totals.balance > 0 && styles.previewUnpaid
                  ]}>
                    {createdInvoiceData.totals.balance === 0
                      ? 'Fully Paid'
                      : createdInvoiceData.totals.balance < createdInvoiceData.totals.total
                      ? `Partial (Balance: ${formatCurrency(createdInvoiceData.totals.balance)})`
                      : `Unpaid (${formatCurrency(createdInvoiceData.totals.balance)})`
                    }
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.successActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
                <Printer size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Print</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, downloadingPDF && styles.actionButtonDisabled]}
                onPress={handleDownloadPDF}
                disabled={downloadingPDF}
              >
                <Download size={20} color={downloadingPDF ? colors.textSecondary : colors.primary} />
                <Text style={[styles.actionButtonText, downloadingPDF && styles.actionButtonTextDisabled]}>
                  {downloadingPDF ? 'Generating...' : 'PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Share2 size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>
                  {Platform.OS === 'web' ? 'Download' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Done"
              onPress={handleCloseSuccess}
              style={styles.doneButton}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentModeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Mode</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModeSelector(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.paymentModeList}>
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('cash');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Cash</Text>
                </View>
                {paymentMode === 'cash' && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('credit');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Credit</Text>
                </View>
                {paymentMode === 'credit' && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.paymentModeItem}
                onPress={() => {
                  setPaymentMode('card');
                  const currentTotals = calculateTotals();
                  setPaidAmount(currentTotals.total.toFixed(2));
                  setShowPaymentModeSelector(false);
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>Card</Text>
                </View>
                {paymentMode === 'card' && (
                  <Check size={20} color={colors.primary} />
                )}
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
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
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  vanInfo: {
    gap: 4,
  },
  vanCode: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  vanVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: colors.text,
  },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  selectorText: {
    fontSize: 16,
    color: colors.text,
  },
  selectorPlaceholder: {
    color: colors.textSecondary,
  },
  selectorDisabled: {
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
  customerDetails: {
    gap: 4,
  },
  customerCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  customerCodeInline: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  customerInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyItems: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyItemsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemCode: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  itemInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemTaxLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  balancePositive: {
    color: colors.error,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 20,
  },
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
  modalLoading: {
    height: 200,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  emptySearch: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    minWidth: 120,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    gap: 20,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  invoicePreview: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  previewSection: {
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 16,
    color: colors.text,
  },
  previewSubvalue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  previewPaid: {
    color: colors.success,
    fontWeight: '600',
  },
  previewUnpaid: {
    color: colors.error,
    fontWeight: '600',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.textSecondary,
  },
  actionButtonTextDisabled: {
    color: colors.textSecondary,
  },
  doneButton: {
    width: '100%',
    marginBottom: 0,
  },
  paymentModeList: {
    paddingVertical: 8,
  },
  paymentModeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
