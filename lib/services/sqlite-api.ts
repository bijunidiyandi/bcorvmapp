import { getDatabase } from './database';
import {
  Van,
  Customer,
  Item,
  Receipt,
  SalesSession,
  DashboardMetrics,
  Route,
  Warehouse,
  ItemCategory,
  Unit,
  CustomerCategory,
  VanStock,
  User,
  CreateRouteInput,
  CreateWarehouseInput,
  CreateVanInput,
  CreateCustomerCategoryInput,
} from '../types/database';
import { requireEnv } from '../utils/env';
import { getLoggedInUserName } from './auth.api';
import { Input } from '../../components/common/Input';
export const COMPANY_ID = requireEnv('EXPO_PUBLIC_COMPANY_ID');
export const SITE_ID = requireEnv('EXPO_PUBLIC_SITE_ID');
/**
 * Standardizes any object (API or SQLite) to have lowercase keys.
 * This prevents casing-related "undefined" bugs on iOS/Android.
 */
const normalizeData = (row: any) => {
  if (!row) return {};
  const normalized: any = {};
  for (const key in row) {
    normalized[key.toLowerCase()] = row[key];
  }
  return normalized;
};


function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const vanApi = {
  /* ---------------- CLEAR ALL ---------------- */
  async clearAll(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM vans');
    console.log('Vans cleared');
  },

  /* ---------------- BULK INSERT ---------------- */
  async bulkInsert(vans: any[]): Promise<void> {
    const db = getDatabase();
    if (!vans || vans.length === 0) return;

    try {
      await db.runAsync('BEGIN');

      const sql = `
        INSERT OR REPLACE INTO vans
        (code, vehicleNumber, warehouseCode, userCode, routeCode, active, lastModifiedOn, lastModifiedBy)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const user = await getLoggedInUserName();

      for (const v of vans) {
        // ✅ Normalize API data (handles 'vehicleNumber' or 'vehiclenumber')
        const n = normalizeData(v);

        await db.runAsync(sql, [
          n.code,
          n.vehiclenumber ?? n.vehiclenumber, // Handles both casings from API
          n.warehousecode ?? null,
          n.usercode ?? null,
          n.routecode ?? null,
          (n.active === 1 || n.active === true) ? 1 : 0,
          n.lastmodifiedon ?? new Date().toISOString(),
          n.lastmodifiedby ?? user,
        ]);
      }

      await db.runAsync('COMMIT');
    } catch (err) {
      await db.runAsync('ROLLBACK');
      console.error('Van bulkInsert FAILED:', err);
      throw err;
    }
  },

  /* ---------------- GET ALL ---------------- */
  async getAll(includeInactive = false): Promise<Van[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM vans ORDER BY code'
      : 'SELECT * FROM vans WHERE active = 1 ORDER BY code';

    const rows = await db.getAllAsync(query);

    // ✅ Map each row individually using normalizeData
    return rows.map((r: any) => {
      const n = normalizeData(r);
      return {
        code: n.code ?? '',
        vehicleNumber: n.vehiclenumber ?? '',
        warehouseCode: n.warehousecode ?? '',
        userCode: n.usercode ?? '',
        routeCode: n.routecode ?? '',
        active: n.active === 1 || n.active === true,
        lastModifiedBy: n.lastmodifiedby ?? '',
        lastModifiedOn: n.lastmodifiedon ?? '',
      };
    });
  },

  /* ---------------- GET BY CODE ---------------- */
  async getById(code: string): Promise<Van | null> {
    const db = getDatabase();
    const rows: any[] = await db.getAllAsync('SELECT * FROM vans WHERE code = ?', [code]);
    
    if (!rows.length) return null;
    
    const n = normalizeData(rows[0]);
    return {
      code: n.code ?? '',
      vehicleNumber: n.vehiclenumber ?? '',
      warehouseCode: n.warehousecode ?? '',
      userCode: n.usercode ?? '',
      routeCode: n.routecode ?? '',
      active: n.active === 1 || n.active === true,
      lastModifiedBy: n.lastmodifiedby ?? '',
      lastModifiedOn: n.lastmodifiedon ?? '',
    };
  },

  /* ---------------- CREATE ---------------- */
  async create(input: any): Promise<Van> {
    const db = getDatabase();
    const user = await getLoggedInUserName();
    const now = new Date().toISOString();

    // Map input to standardized object
    const van: Van = {
      code: input.code,
      vehicleNumber: input.vehicleNumber,
      warehouseCode: input.warehouseCode ?? null,
      userCode: input.userCode ?? null,
      routeCode: input.routeCode ?? null,
      active: input.active ?? true,
      lastModifiedBy: user,
      lastModifiedOn: now,
    };

    await db.runAsync(
      `INSERT INTO vans (code, vehicleNumber, warehouseCode, userCode, routeCode, active, lastModifiedOn, lastModifiedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        van.code,
        van.vehicleNumber,
        van.warehouseCode,
        van.userCode,
        van.routeCode,
        van.active ? 1 : 0,
        van.lastModifiedOn,
        van.lastModifiedBy,
      ]
    );

    return van;
  },

  /* ---------------- UPDATE ---------------- */
  async update(code: string, data: Partial<Van>): Promise<Van> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    // Map JS keys to the SQL Column Names used in your CREATE TABLE
    const columnMap: Record<string, string> = {
      vehicleNumber: 'vehicleNumber',
      warehouseCode: 'warehouseCode',
      userCode: 'userCode',
      routeCode: 'routeCode',
      active: 'active',
      lastModifiedBy: 'lastModifiedBy',
      lastModifiedOn: 'lastModifiedOn'
    };

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'code' && value !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(code);
      await db.runAsync(`UPDATE vans SET ${fields.join(', ')} WHERE code = ?`, values);
    }

    return (await this.getById(code))!;
  },
};


export const customerApi = {
  async getAll(includeInactive = false): Promise<Customer[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM customers ORDER BY name'
      : 'SELECT * FROM customers WHERE is_active = 1 ORDER BY name';

      const rows = await db.getAllAsync(query);
    const r = normalizeData(rows);
      return r.map((n: any) => ({
        code: n.code ?? '',
        name: n.name ?? n.customername ?? '', // Handles 'name' or 'customerName'
        categoryCode: n.categorycode ?? '',   // Handles 'categoryCode' or 'categorycode'
        address: n.address ?? '',
        contactNumber: n.contactnumber ?? '',
        active: n.active === 1 || n.active === true
    }))
  },

  async getById(id: string): Promise<Customer | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM customers WHERE code = ?', [id]);
     if (!result.length) return null;
    const n=normalizeData(result[0]) ;
    return {
        code: n.code ?? '',
        name: n.name ?? n.customername ?? '', // Handles 'name' or 'customerName'
        categorycode: n.categorycode ?? '',   // Handles 'categoryCode' or 'categorycode'
        address: n.address ?? '',
        phone: n.contactnumber ?? '',
        active: n.active === 1 || n.active === true
    }
  },

  async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO customers (id, code, name, category_id, route_id, phone, email, address, latitude, longitude, credit_limit, outstanding_balance, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        customer.code,
        customer.name,
        customer.categorycode || null,
        customer.routecode || null,
        customer.phone || null,
        customer.email || null,
        customer.address || null,
        customer.latitude || null,
        customer.longitude || null,
        customer.credit_limit || 0,
        customer.outstanding_balance || 0,
        customer.active !== undefined ? (customer.active ? 1 : 0) : 1,
        created_at,
      ]
    );

    return { id, ...customer, created_at } as Customer;
  },

  async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(customer).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  },
};

export const itemApi = {
  async getAll(includeInactive = false): Promise<Item[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM items ORDER BY name'
      : 'SELECT * FROM items WHERE is_active = 1 ORDER BY name';
    return await db.getAllAsync(query);
  },

  async getById(id: string): Promise<Item | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM items WHERE id = ?', [id]);
    return result[0] || null;
  },

  async create(item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    await db.runAsync(
      `INSERT INTO items (id, code, name, description, category_id, unit_id, barcode, price, tax_rate, taxcode, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.code,
        item.name,
        item.description || null,
        item.category_id || null,
        item.unit_id || null,
        item.barcode || null,
        item.price,
        item.tax_rate || 0,
        item.taxcode || 'tx5',
        item.is_active !== undefined ? (item.is_active ? 1 : 0) : 1,
        created_at,
        updated_at,
      ]
    );

    return { id, ...item, created_at, updated_at, is_active: item.is_active !== undefined ? item.is_active : true } as Item;
  },

  async update(id: string, item: Partial<Item>): Promise<Item> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  },

  async search(term: string): Promise<ItemWithDetails[]> {
    const db = getDatabase();
    const searchTerm = `%${term}%`;
    const query = `
      SELECT
        i.*,
        c.name as category_name,
        u.name as unit_name,
        u.abbreviation as unit_abbreviation
      FROM items i
      LEFT JOIN item_categories c ON i.category_id = c.id
      LEFT JOIN item_units u ON i.unit_id = u.id
      WHERE i.is_active = 1
        AND (i.name LIKE ? OR i.code LIKE ? OR i.barcode LIKE ?)
      ORDER BY i.name
      LIMIT 50
    `;
    const results = await db.getAllAsync(query, [searchTerm, searchTerm, searchTerm]);
    return results.map((row: any) => ({
      ...row,
      is_active: row.is_active === 1,
      category: row.category_name ? { id: row.category_id, name: row.category_name } : null,
      unit: row.unit_name ? {
        id: row.unit_id,
        name: row.unit_name,
        abbreviation: row.unit_abbreviation
      } : null,
    }));
  },
};

export const salesSessionApi = {
  async getActive(): Promise<SalesSession | null> {
    const db = getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM sales_sessions WHERE status = ? ORDER BY start_time DESC LIMIT 1',
      ['active']
    );
    return result[0] || null;
  },

  async getAllActive(): Promise<SalesSession[]> {
    const db = getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM sales_sessions WHERE status = ? ORDER BY start_time DESC',
      ['active']
    );
  },

  async startSession(
    vanId: string,
    customerId: string,
    routeId: string | null,
    latitude: number,
    longitude: number
  ): Promise<SalesSession> {
    const db = getDatabase();
    const id = generateUUID();
    const start_time = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sales_sessions (id, van_id, customer_id, start_time, start_latitude, start_longitude, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, vanId, customerId, start_time, latitude, longitude, 'active', start_time, start_time]
    );

    const result = await db.getAllAsync('SELECT * FROM sales_sessions WHERE id = ?', [id]);
    return result[0];
  },

  async endSession(id: string, latitude: number, longitude: number): Promise<void> {
    const db = getDatabase();
    const end_time = new Date().toISOString();

    await db.runAsync(
      'UPDATE sales_sessions SET end_time = ?, end_latitude = ?, end_longitude = ?, status = ?, updated_at = ? WHERE id = ?',
      [end_time, latitude, longitude, 'completed', end_time, id]
    );
  },

  async getByVanId(vanId: string): Promise<SalesSession[]> {
    const db = getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM sales_sessions WHERE van_id = ? ORDER BY start_time DESC',
      [vanId]
    );
  },
};

export const receiptApi = {
  async create(receipt: Omit<Receipt, 'id' | 'created_at'>): Promise<Receipt> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO receipts (id, receipt_number, customer_id, salesman_id, session_id, amount, payment_method, reference_number, notes, latitude, longitude, receipt_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        receipt.receipt_number,
        receipt.customer_id,
        receipt.salesman_id,
        receipt.session_id || null,
        receipt.amount,
        receipt.payment_method || 'cash',
        receipt.reference_number || null,
        receipt.notes || null,
        receipt.latitude || null,
        receipt.longitude || null,
        receipt.receipt_date || created_at,
        created_at,
      ]
    );

    return { id, ...receipt, created_at } as Receipt;
  },

  async getByCustomerId(customerId: string): Promise<Receipt[]> {
    const db = getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM receipts WHERE customer_id = ? ORDER BY receipt_date DESC',
      [customerId]
    );
  },

  async getBySalesmanId(salesmanId: string): Promise<Receipt[]> {
    const db = getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM receipts WHERE salesman_id = ? ORDER BY receipt_date DESC',
      [salesmanId]
    );
  },
};

export const dashboardApi = {
  async getMetrics(): Promise<DashboardMetrics> {
    const db = getDatabase();

    const vans = await db.getAllAsync('SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active FROM vans');
    const customers = await db.getAllAsync('SELECT COUNT(*) as total FROM customers WHERE is_active = 1');

    return {
      totalVans: vans[0]?.total || 0,
      activeVans: vans[0]?.active || 0,
      totalCustomers: customers[0]?.total || 0,
      todaySales: 0,
      todayCollections: 0,
      pendingDayCloses: 0,
    };
  },
};

export const routeApi = {

  /* ---------------- CLEAR ALL ---------------- */
  async clearAll(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM Routes');
    console.log('Routes cleared');
  },

  /* ---------------- BULK INSERT ---------------- */
  async bulkInsert(routes: any[]): Promise<void> {
    const db = getDatabase();
    if (!routes || routes.length === 0) return;

    try {
      await db.runAsync('BEGIN');
      const sql = `
        INSERT OR REPLACE INTO Routes 
        (Code, Name, Description, Active, LastModifiedOn, LastModifiedBy) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const user = await getLoggedInUserName();

      for (const r of routes) {
        // ✅ Normalize input in case API sends "Code" or "code"
        const n = normalizeData(r); 
        
        await db.runAsync(sql, [
          n.code,
          n.name,
          n.description ?? '',
          (n.active === 1 || n.active === true) ? 1 : 0, // Handle bool or int
          n.lastmodifiedon ?? new Date().toISOString(),
          n.lastmodifiedby ?? user,
        ]);
      }

      await db.runAsync('COMMIT');
      console.log('Routes synced:', routes.length);
    } catch (err) {
      await db.runAsync('ROLLBACK');
      console.error('Route bulkInsert FAILED:', err);
      throw err;
    }
  },

  /* ---------------- GET ALL ---------------- */
  async getAll(includeInactive = false): Promise<Route[]> {
    const db = getDatabase();
    const query = includeInactive 
      ? 'SELECT * FROM Routes ORDER BY Name' 
      : 'SELECT * FROM Routes WHERE Active = 1 ORDER BY Name';

    const rows = await db.getAllAsync(query);

    return rows.map((r: any) => {
      const n = normalizeData(r); // ✅ Standardize SQLite row keys to lowercase
      return {
        code: n.code ?? '',
        name: n.name ?? '',
        description: n.description ?? '',
        active: n.active === 1 || n.active === true, // ✅ Convert to boolean
        lastModifiedBy: n.lastmodifiedby ?? '',
        lastModifiedOn: n.lastmodifiedon ?? '',
      };
    });
  },

  /* ---------------- GET BY CODE ---------------- */
  async getById(code: string): Promise<Route | null> {
    const db = getDatabase();
    const rows: any[] = await db.getAllAsync('SELECT * FROM Routes WHERE Code = ?', [code]);

    if (!rows.length) return null;

    const n = normalizeData(rows[0]);
    return {
      code: n.code ?? '',
      name: n.name ?? '',
      description: n.description ?? '',
      active: n.active === 1 || n.active === true,
      lastModifiedBy: n.lastmodifiedby ?? '',
      lastModifiedOn: n.lastmodifiedon ?? '',
    };
  },

  /* ---------------- CREATE ---------------- */
  async create(input: CreateRouteInput): Promise<Route> {
    const db = getDatabase();
    const user = await getLoggedInUserName();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO Routes (Code, Name, Description, Active, LastModifiedOn, LastModifiedBy) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.description ?? '',
        input.active !== false ? 1 : 0,
        now,
        user
      ]
    );

    return { 
      ...input, 
      active: input.active !== false, 
      lastModifiedBy: user, 
      lastModifiedOn: now 
    } as Route;
  },

  /* ---------------- UPDATE ---------------- */
  async update(code: string, route: Partial<Route>): Promise<Route> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    // Ensure we map JS camelCase keys to the SQL Column Names
    const columnMap: Record<string, string> = {
      name: 'Name',
      description: 'Description',
      active: 'Active',
      lastModifiedBy: 'LastModifiedBy',
      lastModifiedOn: 'LastModifiedOn'
    };

    Object.entries(route).forEach(([key, value]) => {
      if (key !== 'code' && value !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(code);
      await db.runAsync(`UPDATE Routes SET ${fields.join(', ')} WHERE Code = ?`, values);
    }

    return (await this.getById(code))!;
  },

  /* ---------------- DELETE ---------------- */
  async delete(code: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM Routes WHERE Code = ?', [code]);
  },
};
/* ============================================================
   WAREHOUSE API (Offline First)
   Same structure as routeApi
============================================================ */

export const warehousesApi = {

  /* ---------------- CLEAR ALL ---------------- */
  async clearAll(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM Warehouses');
    console.log('Warehouses cleared');
  },

  /* ---------------- BULK INSERT ---------------- */
  async bulkInsert(warehouses: any[]): Promise<void> {
    const db = getDatabase();
    if (!warehouses || warehouses.length === 0) return;

    try {
      await db.runAsync('BEGIN');
      const sql = `
        INSERT OR REPLACE INTO Warehouses 
        (Code, Name, Location, Active, LastModifiedOn, LastModifiedBy) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const user = await getLoggedInUserName();

      for (const w of warehouses) {
        // ✅ Normalize input: Handles API JSON whether it's "code" or "Code"
        const n = normalizeData(w); 
        
        await db.runAsync(sql, [
          n.code,
          n.name,
          n.location ?? '',
          (n.active === 1 || n.active === true) ? 1 : 0,
          n.lastmodifiedon ?? new Date().toISOString(),
          n.lastmodifiedby ?? user,
        ]);
      }

      await db.runAsync('COMMIT');
      console.log('Warehouses synced:', warehouses.length);
    } catch (err) {
      await db.runAsync('ROLLBACK');
      console.error('Warehouse bulkInsert FAILED:', err);
      throw err;
    }
  },

  /* ---------------- GET ALL ---------------- */
  async getAll(includeInactive = false): Promise<Warehouse[]> {
    const db = getDatabase();
    const query = includeInactive 
      ? 'SELECT * FROM Warehouses ORDER BY Name' 
      : 'SELECT * FROM Warehouses WHERE Active = 1 ORDER BY Name';

    const rows = await db.getAllAsync(query);

    return rows.map((r: any) => {
      const n = normalizeData(r); // ✅ Standardize SQLite row keys to lowercase
      return {
        code: n.code ?? '',
        name: n.name ?? '',
        location: n.location ?? '',
        active: n.active === 1 || n.active === true,
        lastModifiedBy: n.lastmodifiedby ?? '',
        lastModifiedOn: n.lastmodifiedon ?? '',
      };
    });
  },

  /* ---------------- GET BY CODE ---------------- */
  async getById(code: string): Promise<Warehouse | null> {
    const db = getDatabase();
    const rows: any[] = await db.getAllAsync('SELECT * FROM Warehouses WHERE Code = ?', [code]);

    if (!rows.length) return null;

    const n = normalizeData(rows[0]);
    return {
      code: n.code ?? '',
      name: n.name ?? '',
      location: n.location ?? '',
      active: n.active === 1 || n.active === true,
      lastModifiedBy: n.lastmodifiedby ?? '',
      lastModifiedOn: n.lastmodifiedon ?? '',
    };
  },

  /* ---------------- CREATE ---------------- */
  async create(input: Warehouse): Promise<Warehouse> {
    const db = getDatabase();
    const user = await getLoggedInUserName();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO Warehouses (Code, Name, Location, Active, LastModifiedOn, LastModifiedBy) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.location ?? '',
        input.active !== false ? 1 : 0,
        now,
        user
      ]
    );

    return { 
      ...input, 
      active: input.active !== false, 
      lastModifiedBy: user, 
      lastModifiedOn: now 
    };
  },

  /* ---------------- UPDATE ---------------- */
  async update(code: string, warehouse: Partial<Warehouse>): Promise<Warehouse> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    const columnMap: Record<string, string> = {
      name: 'Name',
      location: 'Location',
      active: 'Active',
      lastModifiedBy: 'LastModifiedBy',
      lastModifiedOn: 'LastModifiedOn'
    };

    Object.entries(warehouse).forEach(([key, value]) => {
      if (key !== 'code' && value !== undefined && columnMap[key]) {
        fields.push(`${columnMap[key]} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(code);
      await db.runAsync(`UPDATE Warehouses SET ${fields.join(', ')} WHERE Code = ?`, values);
    }

    return (await this.getById(code))!;
  },
};

export const userApi = {
  async getAll(includeInactive = false): Promise<User[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM users ORDER BY user_name'
      : 'SELECT * FROM users WHERE is_active = 1 ORDER BY user_name';
    return await db.getAllAsync(query);
  },

  async getById(id: string): Promise<User | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM users WHERE id = ?', [id]);
    return result[0] || null;
  },

  async getByUserId(userId: string): Promise<User | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM users WHERE user_id = ?', [userId]);
    return result[0] || null;
  },

  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    await db.runAsync(
      `INSERT INTO users (id, user_id, user_name, password_hash, role, default_van_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.user_id,
        user.user_name,
        user.password_hash,
        user.role,
        user.default_van_id || null,
        user.is_active !== undefined ? (user.is_active ? 1 : 0) : 1,
        created_at,
        updated_at,
      ]
    );

    return { id, ...user, created_at, updated_at } as User;
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(user).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
  },
};

export const itemCategoryApi = {
  async getAll(includeInactive = false): Promise<ItemCategory[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM item_categories ORDER BY name'
      : 'SELECT * FROM item_categories WHERE is_active = 1 ORDER BY name';
    return await db.getAllAsync(query);
  },

  async getById(id: string): Promise<ItemCategory | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM item_categories WHERE id = ?', [id]);
    return result[0] || null;
  },

  async create(category: Omit<ItemCategory, 'id' | 'created_at'>): Promise<ItemCategory> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO item_categories (id, code, name, description, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        category.code,
        category.name,
        category.description || null,
        category.is_active !== undefined ? (category.is_active ? 1 : 0) : 1,
        created_at,
      ]
    );

    return { id, ...category, created_at } as ItemCategory;
  },

  async update(id: string, category: Partial<ItemCategory>): Promise<ItemCategory> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(category).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE item_categories SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM item_categories WHERE id = ?', [id]);
  },
};

export const unitApi = {
  async getAll(includeInactive = false): Promise<Unit[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM units ORDER BY name'
      : 'SELECT * FROM units WHERE is_active = 1 ORDER BY name';
    return await db.getAllAsync(query);
  },

  async getById(id: string): Promise<Unit | null> {
    const db = getDatabase();
    const result = await db.getAllAsync('SELECT * FROM units WHERE id = ?', [id]);
    return result[0] || null;
  },

  async create(unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    await db.runAsync(
      `INSERT INTO units (id, code, name, abbreviation, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        unit.code,
        unit.name,
        unit.abbreviation,
        unit.is_active !== undefined ? (unit.is_active ? 1 : 0) : 1,
        created_at,
        updated_at,
      ]
    );

    return { id, ...unit, created_at, updated_at, is_active: unit.is_active !== undefined ? unit.is_active : true } as Unit;
  },

  async update(id: string, unit: Partial<Unit>): Promise<Unit> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(unit).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE units SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    return (await this.getById(id))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM units WHERE id = ?', [id]);
  },
};

/* -------------------------------------------------------------------------- */
/* CUSTOMER CATEGORY API                                                      */
/* -------------------------------------------------------------------------- */

export const customerCategoryApi = {
  /* ---------------- CLEAR ALL ---------------- */
  async clearAll(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM customer_categories');
    console.log('CustomerCategories cleared');
  },

  /* ---------------- BULK INSERT ---------------- */
  async bulkInsert(categories: any[]): Promise<void> {
    const db = getDatabase();
    if (!categories || categories.length === 0) return;

    try {
      await db.runAsync('BEGIN');
      const sql = `
        INSERT OR REPLACE INTO customer_categories 
        (code, name, description, discount_percentage, active, lastModifiedOn, lastModifiedBy)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const user = await getLoggedInUserName();

      for (const c of categories) {
        // Use normalized mapping to handle API vs Local property casing
        const normalized = normalizeData(c);
        await db.runAsync(sql, [
          normalized.code,
          normalized.name,
          normalized.description ?? '',
          normalized.discount_percentage ?? 0,
          normalized.active === false ? 0 : 1,
          normalized.lastmodifiedon ?? new Date().toISOString(),
          normalized.lastmodifiedby ?? user,
        ]);
      }
      await db.runAsync('COMMIT');
      console.log(`Synced ${categories.length} Customer Categories`);
    } catch (err) {
      await db.runAsync('ROLLBACK');
      console.error('CustomerCategory bulkInsert FAILED:', err);
      throw err;
    }
  },

  /* ---------------- GET ALL ---------------- */
  async getAll(includeInactive = false): Promise<CustomerCategory[]> {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM customer_categories ORDER BY name'
      : 'SELECT * FROM customer_categories WHERE active = 1 ORDER BY name';

    const rows = await db.getAllAsync(query);
    
    // Normalize and map to the Type
    return (rows || []).map((row: any) => {
      const r = normalizeData(row);
      return {
        code: r.code,
        name: r.name,
        description: r.description,
        discount_percentage: r.discount_percentage,
        active: r.active === 1,
        lastModifiedBy: r.lastmodifiedby,
        lastModifiedOn: r.lastmodifiedon,
      };
    });
  },

  /* ---------------- GET BY ID ---------------- */
  async getById(code: string): Promise<CustomerCategory | null> {
    const db = getDatabase();
    const row: any = await db.getFirstAsync(
      'SELECT * FROM customer_categories WHERE code = ?',
      [code]
    );
    if (!row) return null;

    const r = normalizeData(row);
    return {
      code: r.code,
      name: r.name,
      description: r.description,
      discount_percentage: r.discount_percentage,
      active: r.active === 1,
      lastModifiedBy: r.lastmodifiedby,
      lastModifiedOn: r.lastmodifiedon,
    };
  },

  /* ---------------- CREATE ---------------- */
  async create(input: CreateCustomerCategoryInput): Promise<CustomerCategory> {
    const db = getDatabase();
    const user = await getLoggedInUserName();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO customer_categories 
       (code, name, description, discount_percentage, active, lastModifiedOn, lastModifiedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code.trim(),
        input.name.trim(),
        input.description ?? '',
        input.discount_percentage ?? 0,
        input.active ? 1 : 0,
        now,
        user
      ]
    );

    

    return {
      ...input,
      lastModifiedBy: user,
      lastModifiedOn: now
    } as CustomerCategory;
  },
async update(code: string, data: Partial<CustomerCategory>): Promise<void> {
  const db = getDatabase();
  const user = await getLoggedInUserName();
  const now = new Date().toISOString();

  // ✅ spread params (NOT [code])
  const bfr = await db.getAllAsync(
    'SELECT * FROM customer_categories WHERE code = ?',
    code
  );
  console.log('Verification before update:', bfr);

  const fields: string[] = ['lastModifiedOn = ?', 'lastModifiedBy = ?'];
  const values: any[] = [now, user];

  const updatable = ['name', 'description', 'discount_percentage', 'active'];

  Object.entries(data).forEach(([key, val]) => {
    const col = key.toLowerCase();

    // skip non-updatable and undefined
    if (!updatable.includes(col) || val === undefined) return;

    fields.push(`${col} = ?`);
    values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
  });

  const sql = `UPDATE customer_categories SET ${fields.join(', ')} WHERE code = ?`;
  values.push(code);

  console.log(sql);
  console.log(values);

  // ✅ spread params (NOT values array)
  await db.runAsync(sql, ...values);

  // ✅ spread params
  const verify = await db.getAllAsync(
    'SELECT * FROM customer_categories WHERE code = ?',
    code
  );
  console.log('Verification after update:', verify);
}
,
  /* ---------------- DELETE ---------------- */
  async delete(code: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM customer_categories WHERE code = ?', [code]);
  },
};


export const scheduleApi = {
  async getAll(userId?: string, date?: string): Promise<any[]> {
    const db = getDatabase();
    let schedules = await db.getAllAsync('SELECT * FROM schedules ORDER BY schedule_date DESC');

    console.log(`[scheduleApi.getAll] Found ${schedules.length} schedules`);

    if (userId) {
      schedules = schedules.filter((s: any) => s.user_id === userId);
      console.log(`[scheduleApi.getAll] Filtered to ${schedules.length} schedules for user ${userId}`);
    }

    if (date) {
      schedules = schedules.filter((s: any) => s.schedule_date === date);
      console.log(`[scheduleApi.getAll] Filtered to ${schedules.length} schedules for date ${date}`);
    }

    const schedulesWithDetails = await Promise.all(
      schedules.map(async (schedule: any) => {
        const user = await db.getAllAsync('SELECT * FROM users WHERE id = ?', [schedule.user_id]);
        const route = await db.getAllAsync('SELECT * FROM routes WHERE id = ?', [schedule.route_id]);
        const scheduleCustomers = await db.getAllAsync(
          'SELECT * FROM schedule_customers WHERE schedule_id = ? ORDER BY visit_order',
          [schedule.id]
        );

        console.log(`[scheduleApi.getAll] Schedule ${schedule.id} (${schedule.schedule_date}) has ${scheduleCustomers.length} customers:`,
          scheduleCustomers.map((sc: any) => `${sc.customer_id.substring(0, 8)}...`));

        const customersWithDetails = await Promise.all(
          scheduleCustomers.map(async (sc: any) => {
            const customer = await db.getAllAsync('SELECT * FROM customers WHERE id = ?', [sc.customer_id]);
            return {
              ...sc,
              customer: customer[0] || null,
            };
          })
        );

        return {
          ...schedule,
          user: user[0] || null,
          route: route[0] || null,
          customers: customersWithDetails,
        };
      })
    );

    console.log('[scheduleApi.getAll] Returning schedules:', schedulesWithDetails.map(s => ({ id: s.id, date: s.schedule_date, customerCount: s.customers?.length || 0 })));

    return schedulesWithDetails;
  },

  async getById(id: string): Promise<any | null> {
    const db = getDatabase();
    const schedules = await db.getAllAsync('SELECT * FROM schedules WHERE id = ?', [id]);

    if (!schedules || schedules.length === 0) {
      return null;
    }

    const schedule = schedules[0];
    const user = await db.getAllAsync('SELECT * FROM users WHERE id = ?', [schedule.user_id]);
    const route = await db.getAllAsync('SELECT * FROM routes WHERE id = ?', [schedule.route_id]);
    const scheduleCustomers = await db.getAllAsync(
      'SELECT * FROM schedule_customers WHERE schedule_id = ? ORDER BY visit_order',
      [schedule.id]
    );

    console.log(`[scheduleApi.getById] Schedule ${id} has ${scheduleCustomers.length} customers`);

    const customersWithDetails = await Promise.all(
      scheduleCustomers.map(async (sc: any) => {
        const customer = await db.getAllAsync('SELECT * FROM customers WHERE id = ?', [sc.customer_id]);
        return {
          ...sc,
          customer: customer[0] || null,
        };
      })
    );

    return {
      ...schedule,
      user: user[0] || null,
      route: route[0] || null,
      customers: customersWithDetails,
    };
  },

  async getTodaySchedule(userId: string): Promise<any | null> {
    const today = new Date().toISOString().split('T')[0];
    const schedules = await this.getAll(userId, today);
    return schedules.length > 0 ? schedules[0] : null;
  },

  async create(schedule: any, customers: any[]): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    console.log('Creating schedule:', { schedule, customers });

    await db.runAsync(
      `INSERT INTO schedules (id, user_id, route_id, schedule_date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        schedule.user_id,
        schedule.route_id,
        schedule.schedule_date,
        schedule.status || 'planned',
        schedule.notes || null,
        created_at,
        updated_at,
      ]
    );

    console.log(`Schedule created with ID: ${id}, adding ${customers.length} customers`);

    if (customers && customers.length > 0) {
      for (const customer of customers) {
        const customerId = generateUUID();
        await db.runAsync(
          `INSERT INTO schedule_customers (id, schedule_id, customer_id, visit_order, planned_time, visit_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            id,
            customer.customer_id,
            customer.visit_order,
            customer.planned_time || null,
            customer.visit_status || 'pending',
            created_at,
            updated_at,
          ]
        );
        console.log(`Added customer ${customer.customer_id} with order ${customer.visit_order}`);
      }
    }

    console.log('Schedule creation complete');
    return { id, ...schedule, created_at, updated_at };
  },

  async update(id: string, schedule: any, customers?: any[]): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    console.log(`[scheduleApi.update] Updating schedule ${id} with ${customers?.length || 0} customers`);

    Object.entries(schedule).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // Always delete existing customers first to avoid duplicates
    const existingCustomers = await db.getAllAsync(
      'SELECT * FROM schedule_customers WHERE schedule_id = ?',
      [id]
    );
    console.log(`[scheduleApi.update] Deleting ${existingCustomers.length} existing customers`);
    await db.runAsync('DELETE FROM schedule_customers WHERE schedule_id = ?', [id]);

    if (customers && customers.length > 0) {
      console.log(`[scheduleApi.update] Adding ${customers.length} new customers`);
      for (const customer of customers) {
        const customerId = generateUUID();
        const created_at = new Date().toISOString();
        const updated_at = created_at;
        await db.runAsync(
          `INSERT INTO schedule_customers (id, schedule_id, customer_id, visit_order, planned_time, visit_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            id,
            customer.customer_id,
            customer.visit_order,
            customer.planned_time || null,
            customer.visit_status || 'pending',
            created_at,
            updated_at,
          ]
        );
        console.log(`[scheduleApi.update] Added customer ${customer.customer_id.substring(0, 8)}... with order ${customer.visit_order}`);
      }
    }

    console.log(`[scheduleApi.update] Schedule ${id} update complete`);
    return await this.getById(id);
  },

  async cleanupDuplicateCustomers(scheduleId: string): Promise<void> {
    const db = getDatabase();

    // Get all schedule_customers for this schedule
    const scheduleCustomers = await db.getAllAsync(
      'SELECT * FROM schedule_customers WHERE schedule_id = ? ORDER BY created_at ASC',
      [scheduleId]
    );

    // Keep track of unique customer_ids
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const sc of scheduleCustomers as any[]) {
      if (seen.has(sc.customer_id)) {
        toDelete.push(sc.id);
      } else {
        seen.add(sc.customer_id);
      }
    }

    // Delete duplicates
    for (const id of toDelete) {
      await db.runAsync('DELETE FROM schedule_customers WHERE id = ?', [id]);
    }

    console.log(`[scheduleApi.cleanupDuplicateCustomers] Removed ${toDelete.length} duplicate entries for schedule ${scheduleId}`);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM schedule_customers WHERE schedule_id = ?', [id]);
    await db.runAsync('DELETE FROM schedules WHERE id = ?', [id]);
  },

  async addCustomer(scheduleCustomer: any): Promise<any> {
    const db = getDatabase();
    const id = generateUUID();
    const created_at = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO schedule_customers (id, schedule_id, customer_id, visit_order, planned_time, visit_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        scheduleCustomer.schedule_id,
        scheduleCustomer.customer_id,
        scheduleCustomer.visit_order,
        scheduleCustomer.planned_time || null,
        scheduleCustomer.visit_status || 'pending',
        created_at,
      ]
    );

    return { id, ...scheduleCustomer, created_at };
  },

  async updateCustomer(id: string, scheduleCustomer: any): Promise<any> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(scheduleCustomer).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE schedule_customers SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const result = await db.getAllAsync('SELECT * FROM schedule_customers WHERE id = ?', [id]);
    return result[0] || null;
  },

  async removeCustomer(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM schedule_customers WHERE id = ?', [id]);
  },

  async updateCustomerVisitStatus(id: string, visitStatus: string, actualVisitTime?: string): Promise<any> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE schedule_customers SET visit_status = ?, actual_visit_time = ? WHERE id = ?`,
      [visitStatus, actualVisitTime || null, id]
    );

    const result = await db.getAllAsync('SELECT * FROM schedule_customers WHERE id = ?', [id]);
    return result[0] || null;
  },
};

export const vanStockApi = {
  async getByVanId(vanId: string): Promise<VanStock[]> {
    const db = getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM van_stocks WHERE van_id = ?',
      [vanId]
    );
  },

  async updateStock(vanId: string, itemId: string, quantity: number): Promise<void> {
    const db = getDatabase();
    const existing = await db.getAllAsync(
      'SELECT * FROM van_stocks WHERE van_id = ? AND item_id = ?',
      [vanId, itemId]
    );

    if (existing.length > 0) {
      await db.runAsync(
        'UPDATE van_stocks SET quantity = ?, last_updated = ? WHERE van_id = ? AND item_id = ?',
        [quantity, new Date().toISOString(), vanId, itemId]
      );
    } else {
      await db.runAsync(
        'INSERT INTO van_stocks (id, van_id, item_id, quantity, last_updated) VALUES (?, ?, ?, ?, ?)',
        [generateUUID(), vanId, itemId, quantity, new Date().toISOString()]
      );
    }
  },
};

 
