import { getDatabase } from './database';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const vanLoadApi = {
  async getAll(vanId?: string, status?: string): Promise<any[]> {
    const db = getDatabase();
    let loads = await db.getAllAsync('SELECT * FROM van_loads ORDER BY load_date DESC');

    if (vanId) {
      loads = loads.filter((l: any) => l.van_id === vanId);
    }

    if (status) {
      loads = loads.filter((l: any) => l.status === status);
    }

    return loads;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const loads = await db.getAllAsync('SELECT * FROM van_loads WHERE id = ?', [id]);
    if (!loads || loads.length === 0) return null;

    const load = loads[0];
    const items = await db.getAllAsync('SELECT * FROM van_load_items WHERE van_load_id = ?', [id]);

    return { ...load, items };
  },

  async create(vanLoad: any, items: any[]): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO van_loads (id, van_id, warehouse_id, salesman_id, load_date, load_number, status, notes, total_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        vanLoad.van_id,
        vanLoad.warehouse_id || null,
        vanLoad.salesman_id || null,
        vanLoad.load_date,
        vanLoad.load_number,
        vanLoad.status || 'pending',
        vanLoad.notes || null,
        vanLoad.total_amount || 0,
        created_at,
      ]
    );

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO van_load_items (id, van_load_id, item_id, quantity, unit_price, total_price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          id,
          item.item_id,
          item.quantity,
          item.unit_price,
          item.total_price || item.quantity * item.unit_price,
          created_at,
        ]
      );
    }

    return { id, ...vanLoad, created_at };
  },

  async update(id: string, vanLoad: any): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(vanLoad).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE van_loads SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM van_load_items WHERE van_load_id = ?', [id]);
    await db.runAsync('DELETE FROM van_loads WHERE id = ?', [id]);
  },
};

export const salesInvoiceApi = {
  async getAll(vanId?: string): Promise<any[]> {
    const db = getDatabase();
    const query = `
      SELECT
        si.*,
        c.name as customer_name
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      ORDER BY si.invoice_date DESC, si.created_at DESC
    `;
    let invoices = await db.getAllAsync(query);

    if (vanId) {
      invoices = invoices.filter((i: any) => i.van_id === vanId);
    }

    return invoices;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const query = `
      SELECT
        si.*,
        c.name as customer_name
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      WHERE si.id = ?
    `;
    const invoices = await db.getAllAsync(query, [id]);
    if (!invoices || invoices.length === 0) return null;

    const invoice = invoices[0];
    const items = await db.getAllAsync('SELECT * FROM sales_invoice_items WHERE sales_invoice_id = ?', [id]);

    return { ...invoice, items };
  },

  async create(invoice: any, items: any[]): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sales_invoices (id, invoice_number, van_id, customer_id, walk_in_customer_name, invoice_date, subtotal, tax_amount, discount_amount, total_amount, payment_mode, payment_status, paid_amount, balance_amount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        invoice.invoice_number,
        invoice.van_id,
        invoice.customer_id || null,
        invoice.walk_in_customer_name || null,
        invoice.invoice_date,
        invoice.subtotal || 0,
        invoice.tax_amount || 0,
        invoice.discount_amount || 0,
        invoice.total_amount,
        invoice.payment_mode || 'cash',
        invoice.payment_status || 'unpaid',
        invoice.paid_amount || 0,
        invoice.balance_amount || invoice.total_amount,
        invoice.notes || null,
        created_at,
        created_at,
      ]
    );

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sales_invoice_items (id, sales_invoice_id, item_id, quantity, unit_price, discount_percentage, tax_percentage, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          id,
          item.item_id,
          item.quantity,
          item.unit_price,
          item.discount_percentage || 0,
          item.tax_percentage || 0,
          item.total_price,
        ]
      );
    }

    return { id, ...invoice, created_at, updated_at: created_at };
  },

  async update(id: string, invoice: any, items?: any[]): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(invoice).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE sales_invoices SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    if (items) {
      await db.runAsync('DELETE FROM sales_invoice_items WHERE sales_invoice_id = ?', [id]);

      for (const item of items) {
        await db.runAsync(
          `INSERT INTO sales_invoice_items (id, sales_invoice_id, item_id, quantity, unit_price, discount_percentage, tax_percentage, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            id,
            item.item_id,
            item.quantity,
            item.unit_price,
            item.discount_percentage || 0,
            item.tax_percentage || 0,
            item.total_price,
          ]
        );
      }
    }

    return await this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM sales_invoice_items WHERE sales_invoice_id = ?', [id]);
    await db.runAsync('DELETE FROM sales_invoices WHERE id = ?', [id]);
  },
};

export const salesReturnApi = {
  async getAll(vanId?: string): Promise<any[]> {
    const db = getDatabase();
    let returns = await db.getAllAsync('SELECT * FROM sales_returns ORDER BY return_date DESC');

    if (vanId) {
      returns = returns.filter((r: any) => r.van_id === vanId);
    }

    return returns;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const returns = await db.getAllAsync('SELECT * FROM sales_returns WHERE id = ?', [id]);
    if (!returns || returns.length === 0) return null;

    const returnData = returns[0];
    const items = await db.getAllAsync('SELECT * FROM sales_return_items WHERE sales_return_id = ?', [id]);

    return { ...returnData, items };
  },

  async create(salesReturn: any, items: any[]): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sales_returns (id, return_number, van_id, customer_id, sales_invoice_id, return_date, reason, total_amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        salesReturn.return_number,
        salesReturn.van_id,
        salesReturn.customer_id,
        salesReturn.sales_invoice_id || null,
        salesReturn.return_date,
        salesReturn.reason || null,
        salesReturn.total_amount,
        salesReturn.notes || null,
        created_at,
      ]
    );

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sales_return_items (id, sales_return_id, item_id, quantity, unit_price, total_price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          id,
          item.item_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          created_at,
        ]
      );
    }

    return { id, ...salesReturn, created_at };
  },

  async update(id: string, salesReturn: any): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(salesReturn).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE sales_returns SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM sales_return_items WHERE sales_return_id = ?', [id]);
    await db.runAsync('DELETE FROM sales_returns WHERE id = ?', [id]);
  },
};

export const dayCloseApi = {
  async getAll(vanId?: string, status?: string): Promise<any[]> {
    const db = getDatabase();
    let closes = await db.getAllAsync('SELECT * FROM day_closes ORDER BY close_date DESC');

    if (vanId) {
      closes = closes.filter((c: any) => c.van_id === vanId);
    }

    if (status) {
      closes = closes.filter((c: any) => c.status === status);
    }

    return closes;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const closes = await db.getAllAsync('SELECT * FROM day_closes WHERE id = ?', [id]);
    if (!closes || closes.length === 0) return null;

    const close = closes[0];
    const expenses = await db.getAllAsync('SELECT * FROM day_close_expenses WHERE day_close_id = ?', [id]);

    return { ...close, expenses };
  },

  async create(dayClose: any, expenses: any[]): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO day_closes (id, van_id, close_date, opening_cash, sales_cash, collections_cash, total_cash, expenses_amount, closing_cash, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dayClose.van_id,
        dayClose.close_date,
        dayClose.opening_cash || 0,
        dayClose.sales_cash || 0,
        dayClose.collections_cash || 0,
        dayClose.total_cash || 0,
        dayClose.expenses_amount || 0,
        dayClose.closing_cash || 0,
        dayClose.status || 'pending',
        dayClose.notes || null,
        created_at,
      ]
    );

    for (const expense of expenses) {
      await db.runAsync(
        `INSERT INTO day_close_expenses (id, day_close_id, expense_type, description, amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          id,
          expense.expense_type,
          expense.description || null,
          expense.amount,
          created_at,
        ]
      );
    }

    return { id, ...dayClose, created_at };
  },

  async update(id: string, dayClose: any): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(dayClose).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE day_closes SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM day_close_expenses WHERE day_close_id = ?', [id]);
    await db.runAsync('DELETE FROM day_closes WHERE id = ?', [id]);
  },
};

export const settlementApi = {
  async getAll(vanId?: string): Promise<any[]> {
    const db = getDatabase();
    let settlements = await db.getAllAsync('SELECT * FROM settlements ORDER BY settlement_date DESC');

    if (vanId) {
      settlements = settlements.filter((s: any) => s.van_id === vanId);
    }

    return settlements;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const settlements = await db.getAllAsync('SELECT * FROM settlements WHERE id = ?', [id]);
    return settlements[0] || null;
  },

  async create(settlement: any): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO settlements (id, van_id, day_close_id, warehouse_id, settlement_date, cash_amount, cheque_amount, total_amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        settlement.van_id,
        settlement.day_close_id || null,
        settlement.warehouse_id || null,
        settlement.settlement_date,
        settlement.cash_amount || 0,
        settlement.cheque_amount || 0,
        settlement.total_amount || 0,
        settlement.notes || null,
        created_at,
      ]
    );

    return { id, ...settlement, created_at };
  },

  async update(id: string, settlement: any): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(settlement).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE settlements SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return await this.getById(id);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM settlements WHERE id = ?', [id]);
  },
};
