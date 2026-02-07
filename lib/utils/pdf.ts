import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { SalesInvoiceWithDetails } from '@/lib/types/database';
import { formatCurrency } from './format';

interface InvoiceData {
  invoice: SalesInvoiceWithDetails;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const { invoice, companyName = 'Van Sales Company', companyAddress, companyPhone, companyEmail } = data;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            background: #ffffff;
          }

          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }

          .company-info h1 {
            font-size: 28px;
            color: #2563eb;
            margin-bottom: 10px;
          }

          .company-info p {
            font-size: 12px;
            color: #666;
            line-height: 1.6;
          }

          .invoice-info {
            text-align: right;
          }

          .invoice-info h2 {
            font-size: 32px;
            color: #1a1a1a;
            margin-bottom: 10px;
          }

          .invoice-info p {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }

          .invoice-number {
            font-weight: 700;
            color: #2563eb;
            font-size: 14px !important;
          }

          .customer-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .customer-section h3 {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .customer-section p {
            font-size: 14px;
            color: #1a1a1a;
            line-height: 1.6;
          }

          .customer-name {
            font-size: 18px !important;
            font-weight: 600;
            margin-bottom: 8px !important;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }

          thead {
            background: #f1f5f9;
          }

          th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #cbd5e1;
          }

          th.text-right {
            text-align: right;
          }

          td {
            padding: 12px;
            font-size: 13px;
            color: #1a1a1a;
            border-bottom: 1px solid #e2e8f0;
          }

          td.text-right {
            text-align: right;
          }

          tbody tr:hover {
            background: #f8fafc;
          }

          .item-code {
            font-size: 11px;
            color: #64748b;
            display: block;
            margin-top: 2px;
          }

          .summary {
            margin-left: auto;
            width: 300px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }

          .summary-row.total {
            border-top: 2px solid #cbd5e1;
            margin-top: 8px;
            padding-top: 12px;
            font-size: 18px;
            font-weight: 700;
            color: #2563eb;
          }

          .summary-label {
            color: #64748b;
          }

          .summary-value {
            font-weight: 600;
            color: #1a1a1a;
          }

          .total .summary-value {
            color: #2563eb;
          }

          .notes {
            margin-top: 30px;
            padding: 15px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
          }

          .notes h4 {
            font-size: 12px;
            color: #92400e;
            margin-bottom: 6px;
            text-transform: uppercase;
          }

          .notes p {
            font-size: 13px;
            color: #78350f;
            line-height: 1.5;
          }

          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }

          .payment-badge {
            display: inline-block;
            padding: 4px 12px;
            background: ${invoice.payment_status === 'paid' ? '#dcfce7' : '#fef3c7'};
            color: ${invoice.payment_status === 'paid' ? '#166534' : '#92400e'};
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${companyName}</h1>
            ${companyAddress ? `<p>${companyAddress}</p>` : ''}
            ${companyPhone ? `<p>Phone: ${companyPhone}</p>` : ''}
            ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ''}
          </div>
          <div class="invoice-info">
            <h2>INVOICE</h2>
            <p class="invoice-number">${invoice.invoice_number}</p>
            <p>Date: ${format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</p>
            <p><span class="payment-badge">${invoice.payment_status.toUpperCase()}</span></p>
          </div>
        </div>

        <div class="customer-section">
          <h3>Bill To</h3>
          <p class="customer-name">${invoice.customer?.name || 'N/A'}</p>
          ${invoice.customer?.code ? `<p>Customer Code: ${invoice.customer.code}</p>` : ''}
          ${invoice.customer?.phone ? `<p>Phone: ${invoice.customer.phone}</p>` : ''}
          ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Item Name</th>
              <th class="text-right" style="width: 10%;">Qty</th>
              <th class="text-right" style="width: 12%;">Price</th>
              <th class="text-right" style="width: 14%;">Amount</th>
              <th class="text-right" style="width: 12%;">Tax</th>
              <th class="text-right" style="width: 14%;">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items?.map(item => {
              const subtotalBeforeTax = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
              const taxAmount = subtotalBeforeTax * (item.tax_percentage / 100);
              return `
              <tr>
                <td>
                  ${item.item?.name || 'Unknown Item'}
                  ${item.item?.code ? `<span class="item-code">Code: ${item.item.code}</span>` : ''}
                </td>
                <td class="text-right">${item.quantity.toFixed(2)}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${formatCurrency(subtotalBeforeTax)}</td>
                <td class="text-right">${formatCurrency(taxAmount)}</td>
                <td class="text-right">${formatCurrency(item.total_amount)}</td>
              </tr>
            `;
            }).join('') || '<tr><td colspan="6" style="text-align: center;">No items</td></tr>'}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Subtotal:</span>
            <span class="summary-value">${formatCurrency(invoice.subtotal_amount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Discount:</span>
            <span class="summary-value">-${formatCurrency(invoice.discount_amount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Tax:</span>
            <span class="summary-value">${formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div class="summary-row total">
            <span class="summary-label">Total:</span>
            <span class="summary-value">${formatCurrency(invoice.total_amount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Amount Paid:</span>
            <span class="summary-value">${formatCurrency(invoice.paid_amount || 0)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Balance Due:</span>
            <span class="summary-value">${formatCurrency(invoice.balance_amount || 0)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <h4>Notes</h4>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${invoice.invoice_number}`,
      });
    } else {
      console.warn('Sharing is not available on this platform');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
