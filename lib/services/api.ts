// @ts-nocheck
import { supabase } from './supabase';
import {
  Van,
  VanWithDetails,
  Route,
  Warehouse,
  Item,
  ItemWithDetails,
  ItemCategory,
  Unit,
  Customer,
  CustomerWithDetails,
  CustomerCategory,
  VanLoad,
  VanLoadWithDetails,
  VanLoadItem,
  SalesInvoice,
  SalesInvoiceWithDetails,
  SalesInvoiceItem,
  SalesReturn,
  SalesReturnWithDetails,
  SalesReturnItem,
  DayClose,
  DayCloseWithDetails,
  DayCloseExpense,
  Settlement,
  SettlementWithDetails,
  VanStock,
  VanStockWithDetails,
  Receipt,
  ReceiptWithDetails,
  SalesSession,
  SalesSessionWithDetails,
  DashboardMetrics,
} from '../types/database';

export const vanApi = {
  async getAll(includeInactive = false): Promise<VanWithDetails[]> {
    let query = supabase
      .from('vans')
      .select(
        `
        *,
        user:users(*),
        route:routes(*),
        warehouse:warehouses(*)
      `
      )
      .order('code');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<VanWithDetails | null> {
    const { data, error } = await supabase
      .from('vans')
      .select(
        `
        *,
        user:users(*),
        route:routes(*),
        warehouse:warehouses(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(van: Omit<Van, 'id' | 'created_at' | 'updated_at'>): Promise<Van> {
    const { data, error } = await supabase
      .from('vans')
      .insert(van as any)
      .select()
      .single();

    if (error) throw error;
    return data as Van;
  },

  async update(id: string, van: Partial<Omit<Van, 'id' | 'created_at' | 'updated_at'>>): Promise<Van> {
    const { data, error } = await supabase
      .from('vans')
      .update(van as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Van;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('vans').delete().eq('id', id);
    if (error) throw error;
  },
};

export const routeApi = {
  async getAll(includeInactive = false): Promise<Route[]> {
    let query = supabase.from('routes').select('*').order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Route | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(route: Omit<Route, 'id' | 'created_at' | 'updated_at'>): Promise<Route> {
    const { data, error } = await supabase
      .from('routes')
      .insert(route as any)
      .select()
      .single();

    if (error) throw error;
    return data as Route;
  },

  async update(id: string, route: Partial<Omit<Route, 'id' | 'created_at' | 'updated_at'>>): Promise<Route> {
    const { data, error } = await supabase
      .from('routes')
      .update(route as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Route;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) throw error;
  },
};

export const warehouseApi = {
  async getAll(includeInactive = false): Promise<Warehouse[]> {
    let query = supabase.from('warehouses').select('*').order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Warehouse | null> {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> {
    const { data, error } = await supabase
      .from('warehouses')
      .insert(warehouse as any)
      .select()
      .single();

    if (error) throw error;
    return data as Warehouse;
  },

  async update(id: string, warehouse: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>): Promise<Warehouse> {
    const { data, error } = await supabase
      .from('warehouses')
      .update(warehouse as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Warehouse;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) throw error;
  },
};

export const itemCategoryApi = {
  async getAll(includeInactive = false) {
    let query = supabase.from('item_categories').select('*').order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(category: any) {
    const { data, error } = await supabase
      .from('item_categories')
      .insert(category)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, category: any) {
    const { data, error } = await supabase
      .from('item_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('item_categories').delete().eq('id', id);
    if (error) throw error;
  },
};

export const unitApi = {
  async getAll(includeInactive = false) {
    let query = supabase.from('units').select('*').order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(unit: any) {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, unit: any) {
    const { data, error } = await supabase
      .from('units')
      .update(unit)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) throw error;
  },
};

export const customerCategoryApi = {
  async getAll(includeInactive = false) {
    let query = supabase.from('customer_categories').select('*').order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customer_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(category: any) {
    const { data, error} = await supabase
      .from('customer_categories')
      .insert(category)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, category: any) {
    const { data, error } = await supabase
      .from('customer_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('customer_categories').delete().eq('id', id);
    if (error) throw error;
  },
};

export const itemApi = {
  async getAll(includeInactive = false): Promise<ItemWithDetails[]> {
    let query = supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        unit:units(*)
      `
      )
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ItemWithDetails | null> {
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        unit:units(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getByBarcode(barcode: string): Promise<ItemWithDetails | null> {
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        unit:units(*)
      `
      )
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async search(term: string): Promise<ItemWithDetails[]> {
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        unit:units(*)
      `
      )
      .eq('is_active', true)
      .or(`name.ilike.%${term}%,code.ilike.%${term}%,barcode.ilike.%${term}%`)
      .order('name')
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  async create(item: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .insert(item as any)
      .select()
      .single();

    if (error) throw error;
    return data as Item;
  },

  async update(id: string, item: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .update(item as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Item;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
  },
};

export const customerApi = {
  async getAll(includeInactive = false): Promise<CustomerWithDetails[]> {
    let query = supabase
      .from('customers')
      .select(
        `
        *,
        category:customer_categories(*),
        route:routes(*)
      `
      )
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<CustomerWithDetails | null> {
    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        *,
        category:customer_categories(*),
        route:routes(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async search(term: string): Promise<CustomerWithDetails[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(
        `
        *,
        category:customer_categories(*),
        route:routes(*)
      `
      )
      .eq('is_active', true)
      .or(`name.ilike.%${term}%,code.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('name')
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer as any)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, customer: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(customer as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },
};

export const vanLoadApi = {
  async getAll(vanId?: string, status?: string): Promise<VanLoadWithDetails[]> {
    let query = supabase
      .from('van_loads')
      .select(
        `
        *,
        van:vans(*),
        warehouse:warehouses(*),
        user:users(*),
        items:van_load_items(
          *,
          item:items(*)
        )
      `
      )
      .order('load_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<VanLoadWithDetails | null> {
    const { data, error } = await supabase
      .from('van_loads')
      .select(
        `
        *,
        van:vans(*),
        warehouse:warehouses(*),
        user:users(*),
        items:van_load_items(
          *,
          item:items(*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(
    vanLoad: Omit<VanLoad, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<VanLoadItem, 'id' | 'van_load_id' | 'created_at'>[]
  ): Promise<VanLoad> {
    const { data: loadData, error: loadError } = await supabase
      .from('van_loads')
      .insert(vanLoad as any)
      .select()
      .single();

    if (loadError) throw loadError;

    const itemsWithLoadId = items.map((item) => ({
      ...item,
      van_load_id: loadData!.id,
    }));

    const { error: itemsError } = await supabase
      .from('van_load_items')
      .insert(itemsWithLoadId as any);

    if (itemsError) throw itemsError;

    return loadData as VanLoad;
  },

  async update(id: string, vanLoad: Partial<Omit<VanLoad, 'id' | 'created_at' | 'updated_at'>>): Promise<VanLoad> {
    const { data, error } = await supabase
      .from('van_loads')
      .update(vanLoad as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as VanLoad;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('van_loads').delete().eq('id', id);
    if (error) throw error;
  },
};

export const salesInvoiceApi = {
  async getAll(vanId?: string, startDate?: string, endDate?: string): Promise<SalesInvoiceWithDetails[]> {
    let query = supabase
      .from('sales_invoices')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        items:sales_invoice_items(
          *,
          item:items(*)
        )
      `
      )
      .order('invoice_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (startDate) {
      query = query.gte('invoice_date', startDate);
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<SalesInvoiceWithDetails | null> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        items:sales_invoice_items(
          *,
          item:items(*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(
    invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<SalesInvoiceItem, 'id' | 'sales_invoice_id' | 'created_at'>[]
  ): Promise<SalesInvoice> {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('sales_invoices')
      .insert(invoice as any)
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    const itemsWithInvoiceId = items.map((item) => ({
      ...item,
      sales_invoice_id: invoiceData!.id,
    }));

    const { error: itemsError } = await supabase
      .from('sales_invoice_items')
      .insert(itemsWithInvoiceId as any);

    if (itemsError) throw itemsError;

    return invoiceData as SalesInvoice;
  },

  async update(id: string, invoice: Partial<Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at'>>): Promise<SalesInvoice> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .update(invoice as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesInvoice;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sales_invoices').delete().eq('id', id);
    if (error) throw error;
  },
};

export const salesReturnApi = {
  async getAll(vanId?: string, startDate?: string, endDate?: string): Promise<SalesReturnWithDetails[]> {
    let query = supabase
      .from('sales_returns')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        invoice:sales_invoices(*),
        items:sales_return_items(
          *,
          item:items(*)
        )
      `
      )
      .order('return_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (startDate) {
      query = query.gte('return_date', startDate);
    }

    if (endDate) {
      query = query.lte('return_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<SalesReturnWithDetails | null> {
    const { data, error } = await supabase
      .from('sales_returns')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        invoice:sales_invoices(*),
        items:sales_return_items(
          *,
          item:items(*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(
    salesReturn: Omit<SalesReturn, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<SalesReturnItem, 'id' | 'sales_return_id' | 'created_at'>[]
  ): Promise<SalesReturn> {
    const { data: returnData, error: returnError } = await supabase
      .from('sales_returns')
      .insert(salesReturn as any)
      .select()
      .single();

    if (returnError) throw returnError;

    const itemsWithReturnId = items.map((item) => ({
      ...item,
      sales_return_id: returnData!.id,
    }));

    const { error: itemsError } = await supabase
      .from('sales_return_items')
      .insert(itemsWithReturnId as any);

    if (itemsError) throw itemsError;

    return returnData as SalesReturn;
  },

  async update(id: string, salesReturn: Partial<Omit<SalesReturn, 'id' | 'created_at' | 'updated_at'>>): Promise<SalesReturn> {
    const { data, error } = await supabase
      .from('sales_returns')
      .update(salesReturn as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesReturn;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sales_returns').delete().eq('id', id);
    if (error) throw error;
  },
};

export const dayCloseApi = {
  async getAll(vanId?: string, status?: string): Promise<DayCloseWithDetails[]> {
    let query = supabase
      .from('day_closes')
      .select(
        `
        *,
        van:vans(*),
        expenses:day_close_expenses(*)
      `
      )
      .order('close_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<DayCloseWithDetails | null> {
    const { data, error } = await supabase
      .from('day_closes')
      .select(
        `
        *,
        van:vans(*),
        expenses:day_close_expenses(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(
    dayClose: Omit<DayClose, 'id' | 'created_at' | 'updated_at'>,
    expenses: Omit<DayCloseExpense, 'id' | 'day_close_id' | 'created_at'>[]
  ): Promise<DayClose> {
    const { data: closeData, error: closeError } = await supabase
      .from('day_closes')
      .insert(dayClose as any)
      .select()
      .single();

    if (closeError) throw closeError;

    if (expenses.length > 0) {
      const expensesWithCloseId = expenses.map((expense) => ({
        ...expense,
        day_close_id: closeData!.id,
      }));

      const { error: expensesError } = await supabase
        .from('day_close_expenses')
        .insert(expensesWithCloseId as any);

      if (expensesError) throw expensesError;
    }

    return closeData as DayClose;
  },

  async update(id: string, dayClose: Partial<Omit<DayClose, 'id' | 'created_at' | 'updated_at'>>): Promise<DayClose> {
    const { data, error } = await supabase
      .from('day_closes')
      .update(dayClose as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DayClose;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('day_closes').delete().eq('id', id);
    if (error) throw error;
  },
};

export const settlementApi = {
  async getAll(vanId?: string): Promise<SettlementWithDetails[]> {
    let query = supabase
      .from('settlements')
      .select(
        `
        *,
        van:vans(*),
        day_close:day_closes(*),
        warehouse:warehouses(*)
      `
      )
      .order('settlement_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<SettlementWithDetails | null> {
    const { data, error } = await supabase
      .from('settlements')
      .select(
        `
        *,
        van:vans(*),
        day_close:day_closes(*),
        warehouse:warehouses(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(settlement: Omit<Settlement, 'id' | 'created_at' | 'updated_at'>): Promise<Settlement> {
    const { data, error } = await supabase
      .from('settlements')
      .insert(settlement as any)
      .select()
      .single();

    if (error) throw error;
    return data as Settlement;
  },

  async update(id: string, settlement: Partial<Omit<Settlement, 'id' | 'created_at' | 'updated_at'>>): Promise<Settlement> {
    const { data, error } = await supabase
      .from('settlements')
      .update(settlement as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Settlement;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) throw error;
  },
};

export const vanStockApi = {
  async getAll(): Promise<VanStockWithDetails[]> {
    const { data, error } = await supabase
      .from('van_stocks')
      .select(
        `
        *,
        van:vans(*),
        item:items(
          *,
          category:item_categories(*),
          unit:units(*)
        )
      `
      )
      .order('van_id');

    if (error) throw error;
    return data || [];
  },

  async getByVan(vanId: string): Promise<VanStockWithDetails[]> {
    const { data, error } = await supabase
      .from('van_stocks')
      .select(
        `
        *,
        van:vans(*),
        item:items(*)
      `
      )
      .eq('van_id', vanId)
      .order('item_id');

    if (error) throw error;
    return data || [];
  },

  async getByVanAndItem(vanId: string, itemId: string): Promise<VanStock | null> {
    const { data, error } = await supabase
      .from('van_stocks')
      .select('*')
      .eq('van_id', vanId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const receiptApi = {
  async getAll(vanId?: string, customerId?: string, startDate?: string, endDate?: string): Promise<ReceiptWithDetails[]> {
    let query = supabase
      .from('receipts')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        invoice:sales_invoices(*)
      `
      )
      .order('receipt_date', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (startDate) {
      query = query.gte('receipt_date', startDate);
    }

    if (endDate) {
      query = query.lte('receipt_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<ReceiptWithDetails | null> {
    const { data, error } = await supabase
      .from('receipts')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(*),
        invoice:sales_invoices(*)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(receipt: Omit<Receipt, 'id' | 'created_at' | 'updated_at'>): Promise<Receipt> {
    const { data, error } = await supabase
      .from('receipts')
      .insert(receipt)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, receipt: Partial<Receipt>): Promise<Receipt> {
    const { data, error } = await supabase
      .from('receipts')
      .update({ ...receipt, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('receipts').delete().eq('id', id);
    if (error) throw error;
  },

  async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const prefix = `RCP${year}${month}`;

    const { data } = await supabase
      .from('receipts')
      .select('receipt_number')
      .like('receipt_number', `${prefix}%`)
      .order('receipt_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return `${prefix}0001`;
    }

    const lastNumber = parseInt(data.receipt_number.slice(-4));
    const nextNumber = String(lastNumber + 1).padStart(4, '0');
    return `${prefix}${nextNumber}`;
  },
};

export const salesSessionApi = {
  async getActiveSession(vanId: string): Promise<SalesSessionWithDetails | null> {
    const { data, error } = await supabase
      .from('sales_sessions')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(
          *,
          category:customer_categories(*),
          route:routes(*)
        )
      `
      )
      .eq('van_id', vanId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAll(vanId?: string, customerId?: string): Promise<SalesSessionWithDetails[]> {
    let query = supabase
      .from('sales_sessions')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(
          *,
          category:customer_categories(*),
          route:routes(*)
        )
      `
      )
      .order('start_time', { ascending: false });

    if (vanId) {
      query = query.eq('van_id', vanId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<SalesSessionWithDetails | null> {
    const { data, error } = await supabase
      .from('sales_sessions')
      .select(
        `
        *,
        van:vans(*),
        customer:customers(
          *,
          category:customer_categories(*),
          route:routes(*)
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async startSession(session: Omit<SalesSession, 'id' | 'created_at' | 'updated_at' | 'end_time' | 'end_latitude' | 'end_longitude' | 'status'>): Promise<SalesSession> {
    const { data, error } = await supabase
      .from('sales_sessions')
      .insert({
        ...session,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endSession(sessionId: string, endLatitude: number, endLongitude: number, notes?: string): Promise<SalesSession> {
    const { data, error } = await supabase
      .from('sales_sessions')
      .update({
        end_time: new Date().toISOString(),
        end_latitude: endLatitude,
        end_longitude: endLongitude,
        status: 'closed',
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('sales_sessions').delete().eq('id', id);
    if (error) throw error;
  },
};

export const dashboardApi = {
  async getMetrics(): Promise<DashboardMetrics> {
    const [
      vansResult,
      activeVansResult,
      todaySalesResult,
      pendingDayClosesResult,
      customersResult,
    ] = await Promise.all([
      supabase.from('vans').select('id', { count: 'exact', head: true }),
      supabase.from('vans').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('sales_invoices').select('total_amount, paid_amount, payment_mode').eq('invoice_date', new Date().toISOString().split('T')[0]),
      supabase.from('day_closes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const todaySales = (todaySalesResult.data as any)?.reduce((sum: number, invoice: any) => sum + invoice.total_amount, 0) || 0;
    const todayCollections = (todaySalesResult.data as any)?.filter((inv: any) => inv.payment_mode === 'cash').reduce((sum: number, invoice: any) => sum + invoice.paid_amount, 0) || 0;

    return {
      totalVans: vansResult.count || 0,
      activeVans: activeVansResult.count || 0,
      todaySales,
      todayCollections,
      pendingDayCloses: pendingDayClosesResult.count || 0,
      totalCustomers: customersResult.count || 0,
      lowStockItems: 0,
    };
  },
};

export const scheduleApi = {
  async getAll(userId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    let query = supabase
      .from('schedules')
      .select(
        `
        *,
        user:users(*),
        route:routes(*),
        customers:schedule_customers(
          *,
          customer:customers(
            *,
            category:customer_categories(*),
            route:routes(*)
          )
        )
      `
      )
      .order('schedule_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('schedule_date', startDate);
    }

    if (endDate) {
      query = query.lte('schedule_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('schedules')
      .select(
        `
        *,
        user:users(*),
        route:routes(*),
        customers:schedule_customers(
          *,
          customer:customers(
            *,
            category:customer_categories(*),
            route:routes(*)
          )
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getTodaySchedule(userId: string): Promise<any | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('schedules')
      .select(
        `
        *,
        user:users(*),
        route:routes(*),
        customers:schedule_customers(
          *,
          customer:customers(
            *,
            category:customer_categories(*),
            route:routes(*)
          )
        )
      `
      )
      .eq('user_id', userId)
      .eq('schedule_date', today)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(schedule: any, customers: any[]): Promise<any> {
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedules')
      .insert(schedule)
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    if (customers.length > 0) {
      const customersWithScheduleId = customers.map((customer) => ({
        ...customer,
        schedule_id: scheduleData.id,
      }));

      const { error: customersError } = await supabase
        .from('schedule_customers')
        .insert(customersWithScheduleId);

      if (customersError) throw customersError;
    }

    return scheduleData;
  },

  async update(id: string, schedule: any): Promise<any> {
    const { data, error } = await supabase
      .from('schedules')
      .update(schedule)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
  },

  async addCustomer(scheduleCustomer: any): Promise<any> {
    const { data, error } = await supabase
      .from('schedule_customers')
      .insert(scheduleCustomer)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCustomer(id: string, scheduleCustomer: any): Promise<any> {
    const { data, error } = await supabase
      .from('schedule_customers')
      .update(scheduleCustomer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeCustomer(id: string): Promise<void> {
    const { error } = await supabase.from('schedule_customers').delete().eq('id', id);
    if (error) throw error;
  },

  async updateCustomerVisitStatus(id: string, visitStatus: string, actualVisitTime?: string): Promise<any> {
    const { data, error } = await supabase
      .from('schedule_customers')
      .update({
        visit_status: visitStatus,
        actual_visit_time: actualVisitTime || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
