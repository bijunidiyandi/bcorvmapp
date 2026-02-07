import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let db: any = null;
let initialized = false;
let isNative = Platform.OS !== 'web';

const DB_NAME = 'vansales.db';
const DB_KEY = '@vansales_db';

let inMemoryDB: { [table: string]: any[] } = {};

export const initDatabase = async (): Promise<void> => {
  if (initialized && db) return;

  try {
    if (isNative) {
      const SQLite = require('expo-sqlite');
      db = await SQLite.openDatabaseAsync(DB_NAME);
      await createTablesNative();
      await seedInitialDataNative();
      console.log('SQLite database initialized successfully');
    } else {
      const stored = await AsyncStorage.getItem(DB_KEY);
      if (stored) {
        inMemoryDB = JSON.parse(stored);
      } else {
        await createTablesWeb();
        await seedInitialDataWeb();
        await persistDatabase();
      }
      console.log('Web database initialized successfully');
    }
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const resetDatabase = async (): Promise<void> => {
  if (isNative && db) {
    await db.closeAsync();
    const SQLite = require('expo-sqlite');
    await SQLite.deleteDatabaseAsync(DB_NAME);
    db = null;
  } else {
    await AsyncStorage.removeItem(DB_KEY);
    inMemoryDB = {};
  }
  initialized = false;
  await initDatabase();
};

const persistDatabase = async () => {
  if (!isNative) {
    try {
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(inMemoryDB));
    } catch (error) {
      console.error('Failed to persist database:', error);
    }
  }
};

export const getDatabase = (): any => {
  if (isNative) {
    if (!db) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
  } else {
    return {
      getAllAsync: async (query: string, params: any[] = []) => {
        const tableName = extractTableName(query);
        let data = inMemoryDB[tableName] || [];

        if (query.includes('LEFT JOIN')) {
          data = handleJoinQuery(query, params);
        } else if (query.includes('WHERE')) {
          data = filterData(data, query, params);
        }

        if (query.includes('COUNT(*)')) {
          const count = data.length;
          return [{ count }];
        }

        if (query.includes('ORDER BY')) {
          data = sortData(data, query);
        }

        if (query.includes('LIMIT')) {
          const limitMatch = query.match(/LIMIT (\d+)/i);
          if (limitMatch) {
            data = data.slice(0, parseInt(limitMatch[1]));
          }
        }

        return data;
      },

      getFirstAsync: async (query: string, params: any[] = []) => {
        const results = await getDatabase().getAllAsync(query, params);
        return results.length > 0 ? results[0] : null;
      },

      runAsync: async (query: string, params: any[] = []) => {
        const tableName = extractTableName(query);

        if (query.trim().toUpperCase().startsWith('INSERT')) {
          const record = parseInsert(query, params);
          if (!inMemoryDB[tableName]) {
            inMemoryDB[tableName] = [];
          }
          inMemoryDB[tableName].push(record);
        } else if (query.trim().toUpperCase().startsWith('UPDATE')) {
          const updates = parseUpdate(query, params);
          if (inMemoryDB[tableName]) {
            inMemoryDB[tableName] = inMemoryDB[tableName].map((record: any) => {
              if (matchesWhere(record, query, params)) {
                return { ...record, ...updates };
              }
              return record;
            });
          }
        } else if (query.trim().toUpperCase().startsWith('DELETE')) {
          if (inMemoryDB[tableName]) {
            inMemoryDB[tableName] = inMemoryDB[tableName].filter((record: any) => {
              return !matchesWhere(record, query, params);
            });
          }
        }

        await persistDatabase();
      },

      execAsync: async (sql: string) => {
        return;
      },
    };
  }
};

function extractTableName(query: string): string {
  const match = query.match(/FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)|DELETE\s+FROM\s+(\w+)/i);
  return match ? (match[1] || match[2] || match[3] || match[4]) : '';
}

function filterData(data: any[], query: string, params: any[]): any[] {
  return data.filter((record) => matchesWhere(record, query, params));
}

function matchesWhere(record: any, query: string, params: any[]): boolean {
  if (query.includes('WHERE id = ?')) {
    return record.id === params[params.length - 1];
  }
  if (query.includes('WHERE sales_invoice_id = ?')) {
    return record.sales_invoice_id === params[params.length - 1];
  }
  if (query.includes('WHERE van_load_id = ?')) {
    return record.van_load_id === params[params.length - 1];
  }
  if (query.includes('WHERE sales_return_id = ?')) {
    return record.sales_return_id === params[params.length - 1];
  }
  if (query.includes('WHERE day_close_id = ?')) {
    return record.day_close_id === params[params.length - 1];
  }
  if (query.includes('WHERE schedule_id = ?')) {
    return record.schedule_id === params[params.length - 1];
  }
  if (query.includes('WHERE is_active = 1')) {
    return record.is_active === 1 || record.is_active === true;
  }
  if (query.includes('WHERE status = ?')) {
    return record.status === params[0];
  }
  if (query.includes('LIKE ?')) {
    const whereClause = query.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i)?.[1];
    if (whereClause) {
      const conditions = whereClause.split(/\s+AND\s+/i);
      let paramIndex = 0;

      for (const condition of conditions) {
        const likeMatch = condition.match(/(\w+(?:\.\w+)?)\s+LIKE\s+\?/i);
        if (likeMatch) {
          const field = likeMatch[1].includes('.') ? likeMatch[1].split('.')[1] : likeMatch[1];
          const pattern = params[paramIndex];
          if (pattern && typeof pattern === 'string') {
            const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
            const fieldValue = record[field];
            if (!fieldValue || !regex.test(String(fieldValue))) {
              return false;
            }
          }
          paramIndex++;
        } else if (condition.includes('is_active = 1')) {
          if (!(record.is_active === 1 || record.is_active === true)) {
            return false;
          }
        }
      }
      return true;
    }
  }
  return true;
}

function handleJoinQuery(query: string, params: any[]): any[] {
  if (query.includes('FROM items')) {
    const items = inMemoryDB.items || [];
    const categories = inMemoryDB.item_categories || [];
    const units = inMemoryDB.units || [];

    let results = items.map(item => {
      const category = categories.find(c => c.id === item.category_id);
      const unit = units.find(u => u.id === item.unit_id);

      return {
        ...item,
        category_name: category?.name || null,
        unit_name: unit?.name || null,
        unit_abbreviation: unit?.abbreviation || null,
      };
    });

    if (query.includes('WHERE')) {
      results = results.filter(record => matchesWhere(record, query, params));
    }

    return results;
  }

  if (query.includes('FROM sales_invoices')) {
    const invoices = inMemoryDB.sales_invoices || [];
    const customers = inMemoryDB.customers || [];

    let results = invoices.map(invoice => {
      const customer = customers.find(c => c.id === invoice.customer_id);

      return {
        ...invoice,
        customer_name: customer?.name || null,
      };
    });

    if (query.includes('WHERE')) {
      results = results.filter(record => matchesWhere(record, query, params));
    }

    return results;
  }

  return [];
}

function sortData(data: any[], query: string): any[] {
  const orderMatch = query.match(/ORDER BY (\w+)(\s+(ASC|DESC))?/i);
  if (orderMatch) {
    const field = orderMatch[1];
    const isDesc = orderMatch[3]?.toUpperCase() === 'DESC';
    return [...data].sort((a, b) => {
      if (a[field] < b[field]) return isDesc ? 1 : -1;
      if (a[field] > b[field]) return isDesc ? -1 : 1;
      return 0;
    });
  }
  return data;
}

function parseInsert(query: string, params: any[]): any {
  const columnsMatch = query.match(/\(([^)]+)\)/);
  if (!columnsMatch) return {};

  const columns = columnsMatch[1].split(',').map(c => c.trim());
  const record: any = {};

  columns.forEach((col, idx) => {
    record[col] = params[idx] ?? null;
  });

  return record;
}

function parseUpdate(query: string, params: any[]): any {
  const updates: any = {};
  const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
  if (!setMatch) return updates;

  const setParts = setMatch[1].split(',');
  setParts.forEach((part, idx) => {
    const [column] = part.split('=').map(s => s.trim());
    updates[column] = params[idx];
  });

  return updates;
}

const createTablesNative = async () => {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`
    -- Warehouses
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Routes
    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      user_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('SALES_MANAGER', 'SALESMAN')),
      default_van_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Vans
    CREATE TABLE IF NOT EXISTS vans (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      vehicle_number TEXT NOT NULL,
      warehouse_id TEXT,
      user_id TEXT,
      route_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    -- Customer Categories
    CREATE TABLE IF NOT EXISTS customer_categories (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      discount_percentage REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      route_id TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      latitude REAL,
      longitude REAL,
      credit_limit REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES customer_categories(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    -- Item Categories
    CREATE TABLE IF NOT EXISTS item_categories (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Units
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Items
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      unit_id TEXT,
      barcode TEXT,
      price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      taxcode TEXT DEFAULT 'tx5',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES item_categories(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    -- Van Stocks
    CREATE TABLE IF NOT EXISTS van_stocks (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      last_updated TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (item_id) REFERENCES items(id),
      UNIQUE(van_id, item_id)
    );

    -- Sales Sessions
    CREATE TABLE IF NOT EXISTS sales_sessions (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      start_latitude REAL,
      start_longitude REAL,
      end_latitude REAL,
      end_longitude REAL,
      distance_from_customer REAL,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Receipts
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receipt_number TEXT UNIQUE NOT NULL,
      van_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      invoice_id TEXT,
      receipt_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'cash',
      reference_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Schedules
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      route_id TEXT,
      schedule_date TEXT NOT NULL,
      status TEXT DEFAULT 'planned',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    -- Schedule Customers
    CREATE TABLE IF NOT EXISTS schedule_customers (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      visit_order INTEGER NOT NULL,
      planned_time TEXT,
      visit_status TEXT DEFAULT 'pending',
      actual_visit_time TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      UNIQUE(schedule_id, customer_id)
    );

    -- Van Loads
    CREATE TABLE IF NOT EXISTS van_loads (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      load_number TEXT UNIQUE NOT NULL,
      load_date TEXT NOT NULL,
      warehouse_id TEXT,
      loaded_by TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    -- Van Load Items
    CREATE TABLE IF NOT EXISTS van_load_items (
      id TEXT PRIMARY KEY,
      van_load_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (van_load_id) REFERENCES van_loads(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    -- Sales Invoices
    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      van_id TEXT NOT NULL,
      customer_id TEXT,
      walk_in_customer_name TEXT,
      invoice_date TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'unpaid',
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Sales Invoice Items
    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id TEXT PRIMARY KEY,
      sales_invoice_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount_percentage REAL DEFAULT 0,
      tax_percentage REAL DEFAULT 0,
      line_total REAL NOT NULL,
      FOREIGN KEY (sales_invoice_id) REFERENCES sales_invoices(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    -- Sales Returns
    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT UNIQUE NOT NULL,
      van_id TEXT NOT NULL,
      customer_id TEXT,
      invoice_id TEXT,
      return_date TEXT NOT NULL,
      return_type TEXT DEFAULT 'good',
      total_amount REAL DEFAULT 0,
      reason TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id)
    );

    -- Sales Return Items
    CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      sales_return_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    -- Day Closes
    CREATE TABLE IF NOT EXISTS day_closes (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      close_date TEXT NOT NULL,
      total_sales REAL DEFAULT 0,
      total_cash_collected REAL DEFAULT 0,
      total_expenses REAL DEFAULT 0,
      variance REAL DEFAULT 0,
      opening_stock_value REAL DEFAULT 0,
      closing_stock_value REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id)
    );

    -- Day Close Expenses
    CREATE TABLE IF NOT EXISTS day_close_expenses (
      id TEXT PRIMARY KEY,
      day_close_id TEXT NOT NULL,
      expense_type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      FOREIGN KEY (day_close_id) REFERENCES day_closes(id)
    );

    -- Settlements
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      van_id TEXT NOT NULL,
      day_close_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      settlement_date TEXT NOT NULL,
      stock_returned_value REAL DEFAULT 0,
      cash_deposited REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (van_id) REFERENCES vans(id),
      FOREIGN KEY (day_close_id) REFERENCES day_closes(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_vans_warehouse ON vans(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_vans_user ON vans(user_id);
    CREATE INDEX IF NOT EXISTS idx_vans_route ON vans(route_id);
    CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category_id);
    CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route_id);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_van_stocks_van ON van_stocks(van_id);
    CREATE INDEX IF NOT EXISTS idx_van_stocks_item ON van_stocks(item_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_receipts_van ON receipts(van_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_van ON sales_invoices(van_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_route ON schedules(route_id);
  `);

  // Migration: Add unique constraint to schedule_customers
  try {
    // Check if migration is needed by trying to insert a duplicate
    const testScheduleId = 'test-schedule-migration-check';
    const testCustomerId = 'test-customer-migration-check';

    await db.runAsync(
      'INSERT OR IGNORE INTO schedule_customers (id, schedule_id, customer_id, visit_order, visit_status, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
      ['test1', testScheduleId, testCustomerId, 'pending', new Date().toISOString(), new Date().toISOString()]
    );
    await db.runAsync(
      'INSERT OR IGNORE INTO schedule_customers (id, schedule_id, customer_id, visit_order, visit_status, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)',
      ['test2', testScheduleId, testCustomerId, 'pending', new Date().toISOString(), new Date().toISOString()]
    );

    const duplicates = await db.getAllAsync(
      'SELECT COUNT(*) as count FROM schedule_customers WHERE schedule_id = ? AND customer_id = ?',
      [testScheduleId, testCustomerId]
    );

    // Clean up test data
    await db.runAsync('DELETE FROM schedule_customers WHERE schedule_id = ?', [testScheduleId]);

    // If we were able to insert duplicates, migration is needed
    if (duplicates[0]?.count > 1) {
      console.log('[Migration] Adding unique constraint to schedule_customers...');

      // Step 1: Create new table with unique constraint
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedule_customers_new (
          id TEXT PRIMARY KEY,
          schedule_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          visit_order INTEGER NOT NULL,
          planned_time TEXT,
          visit_status TEXT DEFAULT 'pending',
          actual_visit_time TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (schedule_id) REFERENCES schedules(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          UNIQUE(schedule_id, customer_id)
        );
      `);

      // Step 2: Copy unique data from old table (keep only first occurrence of each customer per schedule)
      await db.execAsync(`
        INSERT INTO schedule_customers_new
        SELECT sc.*
        FROM schedule_customers sc
        INNER JOIN (
          SELECT schedule_id, customer_id, MIN(created_at) as first_created
          FROM schedule_customers
          GROUP BY schedule_id, customer_id
        ) unique_sc
        ON sc.schedule_id = unique_sc.schedule_id
        AND sc.customer_id = unique_sc.customer_id
        AND sc.created_at = unique_sc.first_created;
      `);

      // Step 3: Drop old table
      await db.execAsync('DROP TABLE schedule_customers;');

      // Step 4: Rename new table
      await db.execAsync('ALTER TABLE schedule_customers_new RENAME TO schedule_customers;');

      console.log('[Migration] Successfully added unique constraint to schedule_customers');
    } else {
      console.log('[Migration] Unique constraint already exists on schedule_customers');
    }
  } catch (error) {
    console.error('[Migration] Error adding unique constraint:', error);
  }
};

const createTablesWeb = () => {
  inMemoryDB = {
    warehouses: [],
    routes: [],
    users: [],
    vans: [],
    customer_categories: [],
    customers: [],
    item_categories: [],
    units: [],
    items: [],
    van_stocks: [],
    sales_sessions: [],
    receipts: [],
    schedules: [],
    schedule_customers: [],
    van_loads: [],
    van_load_items: [],
    sales_invoices: [],
    sales_invoice_items: [],
    sales_returns: [],
    sales_return_items: [],
    day_closes: [],
    day_close_expenses: [],
    settlements: [],
  };
};

const seedInitialDataNative = async () => {
  if (!db) throw new Error('Database not initialized');

  const warehouseCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM warehouses'
  );

  if (warehouseCount && warehouseCount.count > 0) {
    console.log('Database already seeded');
    return;
  }

  const now = new Date().toISOString();

  const warehouseIds = [generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO warehouses (id, code, name, location, is_active, created_at, updated_at) VALUES
      (?, 'WH001', 'Main Warehouse', '123 Main St, Downtown', 1, ?, ?),
      (?, 'WH002', 'North Warehouse', '456 North Ave, Uptown', 1, ?, ?),
      (?, 'WH003', 'South Distribution Center', '789 South Blvd, Southside', 1, ?, ?)`,
    [warehouseIds[0], now, now, warehouseIds[1], now, now, warehouseIds[2], now, now]
  );

  const routeIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO routes (id, code, name, description, is_active, created_at, updated_at) VALUES
      (?, 'RT001', 'Downtown Route', 'Downtown commercial area', 1, ?, ?),
      (?, 'RT002', 'North District', 'Northern residential and commercial area', 1, ?, ?),
      (?, 'RT003', 'South Industrial', 'Southern industrial zone', 1, ?, ?),
      (?, 'RT004', 'East Side', 'Eastern suburbs and retail parks', 1, ?, ?),
      (?, 'RT005', 'West Coast', 'Western coastal areas', 1, ?, ?)`,
    [
      routeIds[0], now, now,
      routeIds[1], now, now,
      routeIds[2], now, now,
      routeIds[3], now, now,
      routeIds[4], now, now
    ]
  );

  const userIds = [generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO users (id, user_id, user_name, password_hash, role, default_van_id, is_active, created_at, updated_at) VALUES
      (?, 'manager', 'Sales Manager', 'manager', 'SALES_MANAGER', NULL, 1, ?, ?),
      (?, 'sm1', 'Mike Johnson', 'sm1', 'SALESMAN', NULL, 1, ?, ?),
      (?, 'sm2', 'Sarah Williams', 'sm2', 'SALESMAN', NULL, 1, ?, ?)`,
    [
      userIds[0], now, now,
      userIds[1], now, now,
      userIds[2], now, now
    ]
  );

  const vanIds = [generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO vans (id, code, vehicle_number, warehouse_id, user_id, route_id, is_active, created_at, updated_at) VALUES
      (?, 'VAN001', 'ABC-1234', ?, ?, ?, 1, ?, ?),
      (?, 'VAN002', 'DEF-5678', ?, ?, ?, 1, ?, ?)`,
    [
      vanIds[0], warehouseIds[0], userIds[1], routeIds[0], now, now,
      vanIds[1], warehouseIds[0], userIds[2], routeIds[1], now, now
    ]
  );

  await db.runAsync(
    `UPDATE users SET default_van_id = ? WHERE id = ?`,
    [vanIds[0], userIds[1]]
  );
  await db.runAsync(
    `UPDATE users SET default_van_id = ? WHERE id = ?`,
    [vanIds[1], userIds[2]]
  );

  const customerCategoryIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO customer_categories (id, code, name, description, discount_percentage, is_active, created_at, updated_at) VALUES
      (?, 'CAT001', 'Regular', 'Standard customers', 0, 1, ?, ?),
      (?, 'CAT002', 'Premium', 'Premium customers with benefits', 5, 1, ?, ?),
      (?, 'CAT003', 'Wholesale', 'Wholesale bulk buyers', 10, 1, ?, ?),
      (?, 'CAT004', 'VIP', 'VIP customers', 15, 1, ?, ?)`,
    [
      customerCategoryIds[0], now, now,
      customerCategoryIds[1], now, now,
      customerCategoryIds[2], now, now,
      customerCategoryIds[3], now, now
    ]
  );

  const itemCategoryIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO item_categories (id, code, name, description, is_active, created_at, updated_at) VALUES
      (?, 'ICAT001', 'Beverages', 'Soft drinks and juices', 1, ?, ?),
      (?, 'ICAT002', 'Snacks', 'Chips, crackers, and snacks', 1, ?, ?),
      (?, 'ICAT003', 'Dairy', 'Milk, cheese, and dairy products', 1, ?, ?),
      (?, 'ICAT004', 'Bakery', 'Bread, pastries, and baked goods', 1, ?, ?),
      (?, 'ICAT005', 'Confectionery', 'Candies and chocolates', 1, ?, ?)`,
    [
      itemCategoryIds[0], now, now,
      itemCategoryIds[1], now, now,
      itemCategoryIds[2], now, now,
      itemCategoryIds[3], now, now,
      itemCategoryIds[4], now, now
    ]
  );

  const unitIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  await db.runAsync(
    `INSERT INTO units (id, code, name, abbreviation, is_active, created_at, updated_at) VALUES
      (?, 'CAN', 'Can', 'can', 1, ?, ?),
      (?, 'BTL', 'Bottle', 'btl', 1, ?, ?),
      (?, 'BAG', 'Bag', 'bag', 1, ?, ?),
      (?, 'PCK', 'Pack', 'pack', 1, ?, ?),
      (?, 'CUP', 'Cup', 'cup', 1, ?, ?),
      (?, 'PCS', 'Piece', 'pcs', 1, ?, ?)`,
    [
      unitIds[0], now, now,
      unitIds[1], now, now,
      unitIds[2], now, now,
      unitIds[3], now, now,
      unitIds[4], now, now,
      unitIds[5], now, now
    ]
  );

  const customers = [
    { code: 'CUST001', name: 'ABC Store', route: 0, cat: 0, phone: '555-1001', address: '10 Market St', lat: 37.7749, lng: -122.4194 },
    { code: 'CUST002', name: 'XYZ Mart', route: 0, cat: 1, phone: '555-1002', address: '20 Commerce Ave', lat: 37.7849, lng: -122.4094 },
    { code: 'CUST003', name: 'Corner Shop', route: 0, cat: 0, phone: '555-1003', address: '30 Main Blvd', lat: 37.7649, lng: -122.4294 },
    { code: 'CUST004', name: 'Quick Stop', route: 1, cat: 0, phone: '555-1004', address: '40 North St', lat: 37.7949, lng: -122.4394 },
    { code: 'CUST005', name: 'Daily Needs', route: 1, cat: 2, phone: '555-1005', address: '50 Highland Ave', lat: 37.7549, lng: -122.4494 },
    { code: 'CUST006', name: 'Fresh Market', route: 1, cat: 1, phone: '555-1006', address: '60 Park Dr', lat: 37.7449, lng: -122.4594 },
    { code: 'CUST007', name: 'Food Plaza', route: 2, cat: 2, phone: '555-1007', address: '70 Industrial Rd', lat: 37.7349, lng: -122.4694 },
    { code: 'CUST008', name: 'Super Save', route: 2, cat: 3, phone: '555-1008', address: '80 Factory Ln', lat: 37.7249, lng: -122.4794 },
    { code: 'CUST009', name: 'Mini Mart', route: 2, cat: 0, phone: '555-1009', address: '90 South St', lat: 37.7149, lng: -122.4894 },
    { code: 'CUST010', name: 'Value Store', route: 3, cat: 1, phone: '555-1010', address: '100 East Ave', lat: 37.7049, lng: -122.4994 },
    { code: 'CUST011', name: 'Convenience Plus', route: 3, cat: 0, phone: '555-1011', address: '110 Retail Park', lat: 37.6949, lng: -122.5094 },
    { code: 'CUST012', name: 'Neighborhood Store', route: 3, cat: 2, phone: '555-1012', address: '120 Suburb Way', lat: 37.6849, lng: -122.5194 },
    { code: 'CUST013', name: 'Big Box', route: 4, cat: 3, phone: '555-1013', address: '130 West Coast Rd', lat: 37.6749, lng: -122.5294 },
    { code: 'CUST014', name: 'Local Shop', route: 4, cat: 0, phone: '555-1014', address: '140 Beach Blvd', lat: 37.6649, lng: -122.5394 },
    { code: 'CUST015', name: 'Express Mart', route: 4, cat: 1, phone: '555-1015', address: '150 Coastal Ave', lat: 37.6549, lng: -122.5494 },
  ];

  const customerIds: string[] = [];
  for (const c of customers) {
    const id = generateUUID();
    customerIds.push(id);
    await db.runAsync(
      `INSERT INTO customers (id, code, name, category_id, route_id, phone, email, address, latitude, longitude, credit_limit, outstanding_balance, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [id, c.code, c.name, customerCategoryIds[c.cat], routeIds[c.route], c.phone, c.address, c.lat, c.lng, 1000 + (c.cat * 500), now, now]
    );
  }

  const items = [
    { code: 'ITM001', name: 'Coca Cola 330ml', desc: 'Refreshing cola drink', cat: 0, unit: 0, price: 1.50 },
    { code: 'ITM002', name: 'Pepsi 330ml', desc: 'Classic cola beverage', cat: 0, unit: 0, price: 1.45 },
    { code: 'ITM003', name: 'Water 500ml', desc: 'Pure drinking water', cat: 0, unit: 1, price: 0.75 },
    { code: 'ITM004', name: 'Orange Juice 1L', desc: 'Fresh orange juice', cat: 0, unit: 1, price: 3.50 },
    { code: 'ITM005', name: 'Sprite 330ml', desc: 'Lemon-lime soda', cat: 0, unit: 0, price: 1.45 },
    { code: 'ITM006', name: 'Lays Chips', desc: 'Crispy potato chips', cat: 1, unit: 2, price: 2.25 },
    { code: 'ITM007', name: 'Doritos', desc: 'Nacho cheese tortilla chips', cat: 1, unit: 2, price: 2.50 },
    { code: 'ITM008', name: 'Pringles', desc: 'Stackable potato crisps', cat: 1, unit: 0, price: 3.25 },
    { code: 'ITM009', name: 'Crackers', desc: 'Savory biscuit crackers', cat: 1, unit: 3, price: 1.75 },
    { code: 'ITM010', name: 'Popcorn', desc: 'Butter flavored popcorn', cat: 1, unit: 2, price: 1.50 },
    { code: 'ITM011', name: 'Milk 1L', desc: 'Fresh whole milk', cat: 2, unit: 1, price: 2.50 },
    { code: 'ITM012', name: 'Cheese 200g', desc: 'Cheddar cheese block', cat: 2, unit: 3, price: 4.50 },
    { code: 'ITM013', name: 'Yogurt', desc: 'Greek style yogurt', cat: 2, unit: 4, price: 1.25 },
    { code: 'ITM014', name: 'Butter 250g', desc: 'Salted butter', cat: 2, unit: 3, price: 3.75 },
    { code: 'ITM015', name: 'White Bread', desc: 'Sliced white bread', cat: 3, unit: 5, price: 2.00 },
    { code: 'ITM016', name: 'Wheat Bread', desc: 'Whole wheat bread', cat: 3, unit: 5, price: 2.50 },
    { code: 'ITM017', name: 'Croissant', desc: 'Butter croissant', cat: 3, unit: 5, price: 1.50 },
    { code: 'ITM018', name: 'Muffin', desc: 'Blueberry muffin', cat: 3, unit: 5, price: 1.75 },
    { code: 'ITM019', name: 'Chocolate Bar', desc: 'Milk chocolate', cat: 4, unit: 5, price: 1.25 },
    { code: 'ITM020', name: 'Candy Pack', desc: 'Assorted candies', cat: 4, unit: 3, price: 2.00 },
  ];

  const itemIds: string[] = [];
  for (const item of items) {
    const id = generateUUID();
    itemIds.push(id);
    await db.runAsync(
      `INSERT INTO items (id, code, name, description, category_id, unit_id, barcode, price, tax_rate, taxcode, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, 'tx5', 1, ?, ?)`,
      [id, item.code, item.name, item.desc, itemCategoryIds[item.cat], unitIds[item.unit], item.price, now, now]
    );
  }

  for (const vanId of vanIds) {
    for (let i = 0; i < Math.min(15, itemIds.length); i++) {
      await db.runAsync(
        `INSERT INTO van_stocks (id, van_id, item_id, quantity, last_updated)
         VALUES (?, ?, ?, ?, ?)`,
        [generateUUID(), vanId, itemIds[i], 50 + Math.floor(Math.random() * 150), now]
      );
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const scheduleIds = [generateUUID(), generateUUID()];

  await db.runAsync(
    `INSERT INTO schedules (id, user_id, route_id, schedule_date, status, notes, created_at, updated_at) VALUES
      (?, ?, ?, ?, 'planned', 'Downtown route schedule', ?, ?),
      (?, ?, ?, ?, 'planned', 'North district schedule', ?, ?)`,
    [scheduleIds[0], userIds[1], routeIds[0], today, now, now, scheduleIds[1], userIds[2], routeIds[1], today, now, now]
  );

  for (let idx = 0; idx < 3; idx++) {
    await db.runAsync(
      `INSERT INTO schedule_customers (id, schedule_id, customer_id, visit_order, planned_time, visit_status, actual_visit_time, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)`,
      [generateUUID(), scheduleIds[0], customerIds[idx], idx + 1, `${9 + idx * 2}:00`, now, now]
    );
  }

  for (let idx = 0; idx < 3; idx++) {
    const custIdx = idx + 3;
    await db.runAsync(
      `INSERT INTO schedule_customers (id, schedule_id, customer_id, visit_order, planned_time, visit_status, actual_visit_time, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?)`,
      [generateUUID(), scheduleIds[1], customerIds[custIdx], idx + 1, `${9 + idx * 2}:00`, now, now]
    );
  }

  console.log('Database seeded successfully');
};

const seedInitialDataWeb = () => {
  const now = new Date().toISOString();

  const warehouseIds = [generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.warehouses = [
    { id: warehouseIds[0], code: 'WH001', name: 'Main Warehouse', location: '123 Main St, Downtown', is_active: true, created_at: now, updated_at: now },
    { id: warehouseIds[1], code: 'WH002', name: 'North Warehouse', location: '456 North Ave, Uptown', is_active: true, created_at: now, updated_at: now },
    { id: warehouseIds[2], code: 'WH003', name: 'South Distribution Center', location: '789 South Blvd, Southside', is_active: true, created_at: now, updated_at: now },
  ];

  const routeIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.routes = [
    { id: routeIds[0], code: 'RT001', name: 'Downtown Route', description: 'Downtown commercial area', is_active: true, created_at: now, updated_at: now },
    { id: routeIds[1], code: 'RT002', name: 'North District', description: 'Northern residential and commercial area', is_active: true, created_at: now, updated_at: now },
    { id: routeIds[2], code: 'RT003', name: 'South Industrial', description: 'Southern industrial zone', is_active: true, created_at: now, updated_at: now },
    { id: routeIds[3], code: 'RT004', name: 'East Side', description: 'Eastern suburbs and retail parks', is_active: true, created_at: now, updated_at: now },
    { id: routeIds[4], code: 'RT005', name: 'West Coast', description: 'Western coastal areas', is_active: true, created_at: now, updated_at: now },
  ];

  const userIds = [generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.users = [
    { id: userIds[0], user_id: 'manager', user_name: 'Sales Manager', password_hash: 'manager', role: 'SALES_MANAGER', default_van_id: null, is_active: true, created_at: now, updated_at: now },
    { id: userIds[1], user_id: 'sm1', user_name: 'Mike Johnson', password_hash: 'sm1', role: 'SALESMAN', default_van_id: null, is_active: true, created_at: now, updated_at: now },
    { id: userIds[2], user_id: 'sm2', user_name: 'Sarah Williams', password_hash: 'sm2', role: 'SALESMAN', default_van_id: null, is_active: true, created_at: now, updated_at: now },
  ];

  const vanIds = [generateUUID(), generateUUID()];
  inMemoryDB.vans = [
    { id: vanIds[0], code: 'VAN001', vehicle_number: 'ABC-1234', warehouse_id: warehouseIds[0], user_id: userIds[1], route_id: routeIds[0], is_active: true, created_at: now, updated_at: now },
    { id: vanIds[1], code: 'VAN002', vehicle_number: 'DEF-5678', warehouse_id: warehouseIds[0], user_id: userIds[2], route_id: routeIds[1], is_active: true, created_at: now, updated_at: now },
  ];

  inMemoryDB.users[1].default_van_id = vanIds[0];
  inMemoryDB.users[2].default_van_id = vanIds[1];

  const customerCategoryIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.customer_categories = [
    { id: customerCategoryIds[0], code: 'CAT001', name: 'Regular', description: 'Standard customers', discount_percentage: 0, is_active: true, created_at: now, updated_at: now },
    { id: customerCategoryIds[1], code: 'CAT002', name: 'Premium', description: 'Premium customers with benefits', discount_percentage: 5, is_active: true, created_at: now, updated_at: now },
    { id: customerCategoryIds[2], code: 'CAT003', name: 'Wholesale', description: 'Wholesale bulk buyers', discount_percentage: 10, is_active: true, created_at: now, updated_at: now },
    { id: customerCategoryIds[3], code: 'CAT004', name: 'VIP', description: 'VIP customers', discount_percentage: 15, is_active: true, created_at: now, updated_at: now },
  ];

  const itemCategoryIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.item_categories = [
    { id: itemCategoryIds[0], code: 'ICAT001', name: 'Beverages', description: 'Soft drinks and juices', is_active: true, created_at: now, updated_at: now },
    { id: itemCategoryIds[1], code: 'ICAT002', name: 'Snacks', description: 'Chips, crackers, and snacks', is_active: true, created_at: now, updated_at: now },
    { id: itemCategoryIds[2], code: 'ICAT003', name: 'Dairy', description: 'Milk, cheese, and dairy products', is_active: true, created_at: now, updated_at: now },
    { id: itemCategoryIds[3], code: 'ICAT004', name: 'Bakery', description: 'Bread, pastries, and baked goods', is_active: true, created_at: now, updated_at: now },
    { id: itemCategoryIds[4], code: 'ICAT005', name: 'Confectionery', description: 'Candies and chocolates', is_active: true, created_at: now, updated_at: now },
  ];

  const unitIds = [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()];
  inMemoryDB.units = [
    { id: unitIds[0], code: 'CAN', name: 'Can', abbreviation: 'can', is_active: true, created_at: now, updated_at: now },
    { id: unitIds[1], code: 'BTL', name: 'Bottle', abbreviation: 'btl', is_active: true, created_at: now, updated_at: now },
    { id: unitIds[2], code: 'BAG', name: 'Bag', abbreviation: 'bag', is_active: true, created_at: now, updated_at: now },
    { id: unitIds[3], code: 'PCK', name: 'Pack', abbreviation: 'pack', is_active: true, created_at: now, updated_at: now },
    { id: unitIds[4], code: 'CUP', name: 'Cup', abbreviation: 'cup', is_active: true, created_at: now, updated_at: now },
    { id: unitIds[5], code: 'PCS', name: 'Piece', abbreviation: 'pcs', is_active: true, created_at: now, updated_at: now },
  ];

  const customers = [
    { code: 'CUST001', name: 'ABC Store', route: 0, cat: 0, phone: '555-1001', address: '10 Market St', lat: 37.7749, lng: -122.4194 },
    { code: 'CUST002', name: 'XYZ Mart', route: 0, cat: 1, phone: '555-1002', address: '20 Commerce Ave', lat: 37.7849, lng: -122.4094 },
    { code: 'CUST003', name: 'Corner Shop', route: 0, cat: 0, phone: '555-1003', address: '30 Main Blvd', lat: 37.7649, lng: -122.4294 },
    { code: 'CUST004', name: 'Quick Stop', route: 1, cat: 0, phone: '555-1004', address: '40 North St', lat: 37.7949, lng: -122.4394 },
    { code: 'CUST005', name: 'Daily Needs', route: 1, cat: 2, phone: '555-1005', address: '50 Highland Ave', lat: 37.7549, lng: -122.4494 },
    { code: 'CUST006', name: 'Fresh Market', route: 1, cat: 1, phone: '555-1006', address: '60 Park Dr', lat: 37.7449, lng: -122.4594 },
    { code: 'CUST007', name: 'Food Plaza', route: 2, cat: 2, phone: '555-1007', address: '70 Industrial Rd', lat: 37.7349, lng: -122.4694 },
    { code: 'CUST008', name: 'Super Save', route: 2, cat: 3, phone: '555-1008', address: '80 Factory Ln', lat: 37.7249, lng: -122.4794 },
    { code: 'CUST009', name: 'Mini Mart', route: 2, cat: 0, phone: '555-1009', address: '90 South St', lat: 37.7149, lng: -122.4894 },
    { code: 'CUST010', name: 'Value Store', route: 3, cat: 1, phone: '555-1010', address: '100 East Ave', lat: 37.7049, lng: -122.4994 },
    { code: 'CUST011', name: 'Convenience Plus', route: 3, cat: 0, phone: '555-1011', address: '110 Retail Park', lat: 37.6949, lng: -122.5094 },
    { code: 'CUST012', name: 'Neighborhood Store', route: 3, cat: 2, phone: '555-1012', address: '120 Suburb Way', lat: 37.6849, lng: -122.5194 },
    { code: 'CUST013', name: 'Big Box', route: 4, cat: 3, phone: '555-1013', address: '130 West Coast Rd', lat: 37.6749, lng: -122.5294 },
    { code: 'CUST014', name: 'Local Shop', route: 4, cat: 0, phone: '555-1014', address: '140 Beach Blvd', lat: 37.6649, lng: -122.5394 },
    { code: 'CUST015', name: 'Express Mart', route: 4, cat: 1, phone: '555-1015', address: '150 Coastal Ave', lat: 37.6549, lng: -122.5494 },
  ];

  inMemoryDB.customers = customers.map(c => ({
    id: generateUUID(),
    code: c.code,
    name: c.name,
    category_id: customerCategoryIds[c.cat],
    route_id: routeIds[c.route],
    phone: c.phone,
    email: null,
    address: c.address,
    latitude: c.lat,
    longitude: c.lng,
    credit_limit: 1000 + (c.cat * 500),
    outstanding_balance: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));

  const items = [
    { code: 'ITM001', name: 'Coca Cola 330ml', desc: 'Refreshing cola drink', cat: 0, unit: 0, price: 1.50 },
    { code: 'ITM002', name: 'Pepsi 330ml', desc: 'Classic cola beverage', cat: 0, unit: 0, price: 1.45 },
    { code: 'ITM003', name: 'Water 500ml', desc: 'Pure drinking water', cat: 0, unit: 1, price: 0.75 },
    { code: 'ITM004', name: 'Orange Juice 1L', desc: 'Fresh orange juice', cat: 0, unit: 1, price: 3.50 },
    { code: 'ITM005', name: 'Sprite 330ml', desc: 'Lemon-lime soda', cat: 0, unit: 0, price: 1.45 },
    { code: 'ITM006', name: 'Lays Chips', desc: 'Crispy potato chips', cat: 1, unit: 2, price: 2.25 },
    { code: 'ITM007', name: 'Doritos', desc: 'Nacho cheese tortilla chips', cat: 1, unit: 2, price: 2.50 },
    { code: 'ITM008', name: 'Pringles', desc: 'Stackable potato crisps', cat: 1, unit: 0, price: 3.25 },
    { code: 'ITM009', name: 'Crackers', desc: 'Savory biscuit crackers', cat: 1, unit: 3, price: 1.75 },
    { code: 'ITM010', name: 'Popcorn', desc: 'Butter flavored popcorn', cat: 1, unit: 2, price: 1.50 },
    { code: 'ITM011', name: 'Milk 1L', desc: 'Fresh whole milk', cat: 2, unit: 1, price: 2.50 },
    { code: 'ITM012', name: 'Cheese 200g', desc: 'Cheddar cheese block', cat: 2, unit: 3, price: 4.50 },
    { code: 'ITM013', name: 'Yogurt', desc: 'Greek style yogurt', cat: 2, unit: 4, price: 1.25 },
    { code: 'ITM014', name: 'Butter 250g', desc: 'Salted butter', cat: 2, unit: 3, price: 3.75 },
    { code: 'ITM015', name: 'White Bread', desc: 'Sliced white bread', cat: 3, unit: 5, price: 2.00 },
    { code: 'ITM016', name: 'Wheat Bread', desc: 'Whole wheat bread', cat: 3, unit: 5, price: 2.50 },
    { code: 'ITM017', name: 'Croissant', desc: 'Butter croissant', cat: 3, unit: 5, price: 1.50 },
    { code: 'ITM018', name: 'Muffin', desc: 'Blueberry muffin', cat: 3, unit: 5, price: 1.75 },
    { code: 'ITM019', name: 'Chocolate Bar', desc: 'Milk chocolate', cat: 4, unit: 5, price: 1.25 },
    { code: 'ITM020', name: 'Candy Pack', desc: 'Assorted candies', cat: 4, unit: 3, price: 2.00 },
  ];

  inMemoryDB.items = items.map(item => ({
    id: generateUUID(),
    code: item.code,
    name: item.name,
    description: item.desc,
    category_id: itemCategoryIds[item.cat],
    unit_id: unitIds[item.unit],
    barcode: null,
    price: item.price,
    tax_rate: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));

  for (const vanId of vanIds) {
    for (let i = 0; i < Math.min(15, inMemoryDB.items.length); i++) {
      inMemoryDB.van_stocks.push({
        id: generateUUID(),
        van_id: vanId,
        item_id: inMemoryDB.items[i].id,
        quantity: 50 + Math.floor(Math.random() * 150),
        last_updated: now,
      });
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const schedule1Id = generateUUID();
  const schedule2Id = generateUUID();

  inMemoryDB.schedules = [
    { id: schedule1Id, user_id: userIds[1], route_id: routeIds[0], schedule_date: today, status: 'planned', notes: 'Downtown route schedule', created_at: now, updated_at: now },
    { id: schedule2Id, user_id: userIds[2], route_id: routeIds[1], schedule_date: today, status: 'planned', notes: 'North district schedule', created_at: now, updated_at: now },
  ];

  for (let idx = 0; idx < 3; idx++) {
    inMemoryDB.schedule_customers.push({
      id: generateUUID(),
      schedule_id: schedule1Id,
      customer_id: inMemoryDB.customers[idx].id,
      visit_order: idx + 1,
      planned_time: `${9 + idx * 2}:00`,
      visit_status: 'pending',
      actual_visit_time: null,
      notes: null,
      created_at: now,
      updated_at: now,
    });
  }

  for (let idx = 0; idx < 3; idx++) {
    inMemoryDB.schedule_customers.push({
      id: generateUUID(),
      schedule_id: schedule2Id,
      customer_id: inMemoryDB.customers[idx + 3].id,
      visit_order: idx + 1,
      planned_time: `${9 + idx * 2}:00`,
      visit_status: 'pending',
      actual_visit_time: null,
      notes: null,
      created_at: now,
      updated_at: now,
    });
  }
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
