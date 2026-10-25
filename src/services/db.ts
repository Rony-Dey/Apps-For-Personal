import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AuditLog,
  CompanySettings,
  Customer,
  FollowUpTask,
  PaymentRecord,
  Product,
  Quotation,
  SalesOrder,
  SavedPCBuild,
  StockLocation,
  StockMovement,
  Supplier,
  UserRole,
} from '../types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_FOLLOWUPS,
  INITIAL_LOCATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_QUOTATIONS,
  INITIAL_SUPPLIERS,
} from './seedData';

// Local storage keys for instant fallback & demo persistence
const STORAGE_PREFIX = 'smartit_pro_';

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

// Memory / Cache state
let cachedProducts: Product[] = getLocal('products', INITIAL_PRODUCTS);
let cachedCustomers: Customer[] = getLocal('customers', INITIAL_CUSTOMERS);
let cachedQuotations: Quotation[] = getLocal('quotations', INITIAL_QUOTATIONS);
let cachedOrders: SalesOrder[] = getLocal('orders', INITIAL_ORDERS);
let cachedFollowups: FollowUpTask[] = getLocal('followups', INITIAL_FOLLOWUPS);
let cachedLocations: StockLocation[] = getLocal('locations', INITIAL_LOCATIONS);
let cachedSuppliers: Supplier[] = getLocal('suppliers', INITIAL_SUPPLIERS);
let cachedMovements: StockMovement[] = getLocal('movements', []);
let cachedSettings: CompanySettings = getLocal('settings', INITIAL_COMPANY_SETTINGS);
let cachedPCBuilds: SavedPCBuild[] = getLocal('pc_builds', []);
let cachedAuditLogs: AuditLog[] = getLocal('audit_logs', []);

// Database Service API
export const dbService = {
  // --- Audit Logs ---
  async logAction(action: string, entity: string, entityId: string, details: string, user: { uid: string; name: string }) {
    const logItem: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      action,
      entity,
      entityId,
      details,
      performedBy: user.uid,
      performedByName: user.name,
      createdAt: new Date().toISOString(),
    };
    cachedAuditLogs = [logItem, ...cachedAuditLogs].slice(0, 100);
    setLocal('audit_logs', cachedAuditLogs);

    try {
      await setDoc(doc(db, 'auditLogs', logItem.id), logItem);
    } catch {
      // Fire-and-forget for local
    }
  },

  getAuditLogs(): AuditLog[] {
    return cachedAuditLogs;
  },

  // --- Company Settings ---
  async getSettings(): Promise<CompanySettings> {
    try {
      const snap = await getDoc(doc(db, 'companySettings', 'default'));
      if (snap.exists()) {
        const data = snap.data() as CompanySettings;
        cachedSettings = { ...cachedSettings, ...data };
        setLocal('settings', cachedSettings);
        return cachedSettings;
      }
    } catch {
      // Use cached
    }
    return cachedSettings;
  },

  async updateSettings(settings: Partial<CompanySettings>, user: { uid: string; name: string }): Promise<CompanySettings> {
    const updated: CompanySettings = {
      ...cachedSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    cachedSettings = updated;
    setLocal('settings', updated);

    try {
      await setDoc(doc(db, 'companySettings', 'default'), updated);
    } catch (e) {
      console.warn('Firestore set settings failed, kept in local state:', e);
    }

    await this.logAction('UPDATE_SETTINGS', 'companySettings', 'default', 'Updated company profile and settings', user);
    return updated;
  },

  // --- Products ---
  async getProducts(): Promise<Product[]> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const list: Product[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Product), id: d.id }));
        cachedProducts = list;
        setLocal('products', list);
        return list;
      }
    } catch {
      // Return cached
    }
    return cachedProducts;
  },

  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, user: { uid: string; name: string }): Promise<Product> {
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newProduct: Product = {
      ...product,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedProducts = [newProduct, ...cachedProducts];
    setLocal('products', cachedProducts);

    try {
      await setDoc(doc(db, 'products', id), newProduct);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `products/${id}`);
    }

    await this.logAction('CREATE_PRODUCT', 'products', id, `Added product: ${newProduct.name} (${newProduct.sku})`, user);
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>, user: { uid: string; name: string }): Promise<Product> {
    const existing = cachedProducts.find((p) => p.id === id);
    if (!existing) throw new Error('Product not found: ' + id);

    const updated: Product = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    cachedProducts = cachedProducts.map((p) => (p.id === id ? updated : p));
    setLocal('products', cachedProducts);

    try {
      await setDoc(doc(db, 'products', id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `products/${id}`);
    }

    await this.logAction('UPDATE_PRODUCT', 'products', id, `Updated product: ${updated.name}`, user);
    return updated;
  },

  async deleteProduct(id: string, user: { uid: string; name: string }): Promise<void> {
    const existing = cachedProducts.find((p) => p.id === id);
    cachedProducts = cachedProducts.filter((p) => p.id !== id);
    setLocal('products', cachedProducts);

    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }

    if (existing) {
      await this.logAction('DELETE_PRODUCT', 'products', id, `Deleted product: ${existing.name}`, user);
    }
  },

  async batchAddProducts(newProducts: Product[], user: { uid: string; name: string }): Promise<number> {
    let count = 0;
    const addedList: Product[] = [];

    for (const p of newProducts) {
      const id = p.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const full: Product = {
        ...p,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addedList.push(full);
      count++;

      try {
        await setDoc(doc(db, 'products', id), full);
      } catch {
        // Fallback
      }
    }

    cachedProducts = [...addedList, ...cachedProducts];
    setLocal('products', cachedProducts);
    await this.logAction('BATCH_IMPORT_PRODUCTS', 'products', 'batch', `Imported ${count} products`, user);
    return count;
  },

  // --- Customers ---
  async getCustomers(): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      if (!snap.empty) {
        const list: Customer[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Customer), id: d.id }));
        cachedCustomers = list;
        setLocal('customers', list);
        return list;
      }
    } catch {
      // Local fallback
    }
    return cachedCustomers;
  },

  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, user: { uid: string; name: string }): Promise<Customer> {
    const id = 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newCust: Customer = {
      ...customer,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedCustomers = [newCust, ...cachedCustomers];
    setLocal('customers', cachedCustomers);

    try {
      await setDoc(doc(db, 'customers', id), newCust);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `customers/${id}`);
    }

    await this.logAction('CREATE_CUSTOMER', 'customers', id, `Added customer: ${newCust.name} (${newCust.phone})`, user);
    return newCust;
  },

  async updateCustomer(id: string, updates: Partial<Customer>, user: { uid: string; name: string }): Promise<Customer> {
    const existing = cachedCustomers.find((c) => c.id === id);
    if (!existing) throw new Error('Customer not found');

    const updated: Customer = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    cachedCustomers = cachedCustomers.map((c) => (c.id === id ? updated : c));
    setLocal('customers', cachedCustomers);

    try {
      await setDoc(doc(db, 'customers', id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `customers/${id}`);
    }

    await this.logAction('UPDATE_CUSTOMER', 'customers', id, `Updated customer: ${updated.name}`, user);
    return updated;
  },

  // --- Quotations ---
  async getQuotations(): Promise<Quotation[]> {
    try {
      const snap = await getDocs(collection(db, 'quotations'));
      if (!snap.empty) {
        const list: Quotation[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Quotation), id: d.id }));
        cachedQuotations = list;
        setLocal('quotations', list);
        return list;
      }
    } catch {
      // Local fallback
    }
    return cachedQuotations;
  },

  async addQuotation(quote: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>, user: { uid: string; name: string }): Promise<Quotation> {
    const id = 'quote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newQuote: Quotation = {
      ...quote,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedQuotations = [newQuote, ...cachedQuotations];
    setLocal('quotations', cachedQuotations);

    try {
      await setDoc(doc(db, 'quotations', id), newQuote);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `quotations/${id}`);
    }

    await this.logAction('CREATE_QUOTATION', 'quotations', id, `Created quotation ${newQuote.quoteNumber} for ${newQuote.customerName} total ৳${newQuote.grandTotal}`, user);
    return newQuote;
  },

  async updateQuotation(id: string, updates: Partial<Quotation>, user: { uid: string; name: string }): Promise<Quotation> {
    const existing = cachedQuotations.find((q) => q.id === id);
    if (!existing) throw new Error('Quotation not found');

    const updated: Quotation = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    cachedQuotations = cachedQuotations.map((q) => (q.id === id ? updated : q));
    setLocal('quotations', cachedQuotations);

    try {
      await setDoc(doc(db, 'quotations', id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `quotations/${id}`);
    }

    await this.logAction('UPDATE_QUOTATION', 'quotations', id, `Updated quote ${updated.quoteNumber} status: ${updated.status}`, user);
    return updated;
  },

  // --- Sales Orders & Payments ---
  async getOrders(): Promise<SalesOrder[]> {
    try {
      const snap = await getDocs(collection(db, 'salesOrders'));
      if (!snap.empty) {
        const list: SalesOrder[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as SalesOrder), id: d.id }));
        cachedOrders = list;
        setLocal('orders', list);
        return list;
      }
    } catch {
      // fallback
    }
    return cachedOrders;
  },

  async convertQuoteToOrder(quote: Quotation, user: { uid: string; name: string }): Promise<SalesOrder> {
    // Generate order number
    const count = cachedOrders.length + 1;
    const orderNumber = `SIT-ORD-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
    const orderId = 'ord_' + Date.now();

    const order: SalesOrder = {
      id: orderId,
      orderNumber,
      quotationId: quote.id,
      quotationNumber: quote.quoteNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      deliveryAddress: quote.customerAddress || 'Direct Pickup',
      salespersonId: user.uid,
      salespersonName: user.name,
      items: quote.items,
      subtotal: quote.subtotal,
      overallDiscount: quote.overallDiscount,
      deliveryCharge: quote.deliveryCharge,
      vatAmount: quote.vatAmount,
      totalAmount: quote.grandTotal,
      paidAmount: 0,
      balanceDue: quote.grandTotal,
      orderStatus: 'confirmed',
      paymentStatus: 'unpaid',
      deliveryMethod: 'shop_pickup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedOrders = [order, ...cachedOrders];
    setLocal('orders', cachedOrders);

    // Update quotation status to 'ordered'
    await this.updateQuotation(quote.id, { status: 'ordered', convertedToOrderId: orderId }, user);

    // Record stock reservations for items
    for (const item of quote.items) {
      if (item.productId) {
        const prod = cachedProducts.find((p) => p.id === item.productId);
        if (prod) {
          const newReserved = (prod.reservedStock || 0) + item.quantity;
          await this.updateProduct(prod.id, { reservedStock: newReserved }, user);
          await this.recordStockMovement({
            productId: prod.id,
            productName: prod.name,
            type: 'reserved',
            quantity: item.quantity,
            reason: `Reserved for Order #${orderNumber}`,
            referenceNumber: orderNumber,
            recordedBy: user.uid,
            recordedByName: user.name,
          });
        }
      }
    }

    try {
      await setDoc(doc(db, 'salesOrders', orderId), order);
    } catch {
      // fallback
    }

    await this.logAction('CREATE_ORDER', 'salesOrders', orderId, `Converted quote ${quote.quoteNumber} to order ${orderNumber}`, user);
    return order;
  },

  async recordOrderPayment(
    orderId: string,
    amount: number,
    paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'card',
    transactionRef: string,
    notes: string,
    user: { uid: string; name: string }
  ): Promise<SalesOrder> {
    const order = cachedOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const newPaid = order.paidAmount + amount;
    const newDue = Math.max(0, order.totalAmount - newPaid);
    const paymentStatus = newDue === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    const updated: SalesOrder = {
      ...order,
      paidAmount: newPaid,
      balanceDue: newDue,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    };

    cachedOrders = cachedOrders.map((o) => (o.id === orderId ? updated : o));
    setLocal('orders', cachedOrders);

    // Also update customer balance
    const cust = cachedCustomers.find((c) => c.id === order.customerId);
    if (cust) {
      const currentDue = cust.dueBalance || 0;
      const updatedCustDue = Math.max(0, currentDue - amount);
      await this.updateCustomer(cust.id, { dueBalance: updatedCustDue }, user);
    }

    try {
      await setDoc(doc(db, 'salesOrders', orderId), updated);
    } catch {
      // fallback
    }

    await this.logAction('RECORD_PAYMENT', 'salesOrders', orderId, `Received payment ৳${amount} via ${paymentMethod} for Order ${order.orderNumber}. Ref: ${transactionRef}`, user);
    return updated;
  },

  async updateOrderStatus(orderId: string, status: SalesOrder['orderStatus'], user: { uid: string; name: string }): Promise<SalesOrder> {
    const order = cachedOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const updated: SalesOrder = {
      ...order,
      orderStatus: status,
      updatedAt: new Date().toISOString(),
    };

    // If delivered, release reserved and subtract from onHand
    if (status === 'delivered' && order.orderStatus !== 'delivered') {
      for (const item of order.items) {
        if (item.productId) {
          const prod = cachedProducts.find((p) => p.id === item.productId);
          if (prod) {
            const locKey = Object.keys(prod.stockByLocation)[0] || 'loc_sylhet';
            const currentLocStock = prod.stockByLocation[locKey] || 0;
            const updatedLocStock = Math.max(0, currentLocStock - item.quantity);
            const updatedStockByLoc = { ...prod.stockByLocation, [locKey]: updatedLocStock };
            const newTotal = Math.max(0, prod.totalStock - item.quantity);
            const newReserved = Math.max(0, (prod.reservedStock || 0) - item.quantity);

            await this.updateProduct(prod.id, {
              stockByLocation: updatedStockByLoc,
              totalStock: newTotal,
              reservedStock: newReserved,
            }, user);

            await this.recordStockMovement({
              productId: prod.id,
              productName: prod.name,
              type: 'sale',
              quantity: item.quantity,
              fromLocation: locKey,
              reason: `Delivered Order #${order.orderNumber}`,
              referenceNumber: order.orderNumber,
              recordedBy: user.uid,
              recordedByName: user.name,
            });
          }
        }
      }
    }

    cachedOrders = cachedOrders.map((o) => (o.id === orderId ? updated : o));
    setLocal('orders', cachedOrders);

    try {
      await setDoc(doc(db, 'salesOrders', orderId), updated);
    } catch {
      // fallback
    }

    await this.logAction('UPDATE_ORDER_STATUS', 'salesOrders', orderId, `Changed order ${order.orderNumber} status to ${status}`, user);
    return updated;
  },

  // --- Inventory & Stock Movements ---
  async getLocations(): Promise<StockLocation[]> {
    return cachedLocations;
  },

  async getStockMovements(): Promise<StockMovement[]> {
    return cachedMovements;
  },

  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement> {
    const item: StockMovement = {
      ...movement,
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    };
    cachedMovements = [item, ...cachedMovements];
    setLocal('movements', cachedMovements);

    try {
      await setDoc(doc(db, 'stockMovements', item.id), item);
    } catch {
      // fallback
    }
    return item;
  },

  async transferStock(
    productId: string,
    fromLocId: string,
    toLocId: string,
    quantity: number,
    reason: string,
    user: { uid: string; name: string }
  ): Promise<Product> {
    const prod = cachedProducts.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found');

    const sourceQty = prod.stockByLocation[fromLocId] || 0;
    if (sourceQty < quantity) {
      throw new Error(`Insufficient stock in source location. Available: ${sourceQty}`);
    }

    const destQty = prod.stockByLocation[toLocId] || 0;
    const newStockMap = {
      ...prod.stockByLocation,
      [fromLocId]: sourceQty - quantity,
      [toLocId]: destQty + quantity,
    };

    const updated = await this.updateProduct(productId, { stockByLocation: newStockMap }, user);

    const fromLocName = cachedLocations.find((l) => l.id === fromLocId)?.name || fromLocId;
    const toLocName = cachedLocations.find((l) => l.id === toLocId)?.name || toLocId;

    await this.recordStockMovement({
      productId,
      productName: prod.name,
      type: 'transfer',
      fromLocation: fromLocName,
      toLocation: toLocName,
      quantity,
      reason,
      recordedBy: user.uid,
      recordedByName: user.name,
    });

    return updated;
  },

  async adjustStock(
    productId: string,
    locationId: string,
    newQuantity: number,
    reason: string,
    user: { uid: string; name: string }
  ): Promise<Product> {
    const prod = cachedProducts.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found');

    const oldLocQty = prod.stockByLocation[locationId] || 0;
    const diff = newQuantity - oldLocQty;

    const newStockMap = {
      ...prod.stockByLocation,
      [locationId]: Math.max(0, newQuantity),
    };
    const newTotal = Object.values(newStockMap).reduce((a, b) => a + b, 0);

    const updated = await this.updateProduct(productId, {
      stockByLocation: newStockMap,
      totalStock: newTotal,
      lastStockVerification: new Date().toISOString(),
    }, user);

    await this.recordStockMovement({
      productId,
      productName: prod.name,
      type: diff >= 0 ? 'received' : 'adjustment',
      quantity: Math.abs(diff),
      toLocation: locationId,
      reason: `Manual Stock Adjustment (${diff >= 0 ? '+' : ''}${diff}): ${reason}`,
      recordedBy: user.uid,
      recordedByName: user.name,
    });

    return updated;
  },

  // --- Suppliers ---
  async getSuppliers(): Promise<Supplier[]> {
    return cachedSuppliers;
  },

  async addSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>, user: { uid: string; name: string }): Promise<Supplier> {
    const id = 'sup_' + Date.now();
    const item: Supplier = {
      ...supplier,
      id,
      createdAt: new Date().toISOString(),
    };
    cachedSuppliers = [item, ...cachedSuppliers];
    setLocal('suppliers', cachedSuppliers);

    try {
      await setDoc(doc(db, 'suppliers', id), item);
    } catch {
      // fallback
    }

    await this.logAction('ADD_SUPPLIER', 'suppliers', id, `Added supplier: ${item.name}`, user);
    return item;
  },

  // --- Follow-ups CRM Tasks ---
  async getFollowUps(): Promise<FollowUpTask[]> {
    try {
      const snap = await getDocs(collection(db, 'followUpTasks'));
      if (!snap.empty) {
        const list: FollowUpTask[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as FollowUpTask), id: d.id }));
        cachedFollowups = list;
        setLocal('followups', list);
        return list;
      }
    } catch {
      // fallback
    }
    return cachedFollowups;
  },

  async addFollowUp(task: Omit<FollowUpTask, 'id' | 'createdAt' | 'updatedAt'>, user: { uid: string; name: string }): Promise<FollowUpTask> {
    const id = 'tsk_' + Date.now();
    const newTask: FollowUpTask = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cachedFollowups = [newTask, ...cachedFollowups];
    setLocal('followups', cachedFollowups);

    try {
      await setDoc(doc(db, 'followUpTasks', id), newTask);
    } catch {
      // fallback
    }

    await this.logAction('CREATE_TASK', 'followUpTasks', id, `Scheduled follow-up: ${newTask.title}`, user);
    return newTask;
  },

  async updateFollowUp(id: string, updates: Partial<FollowUpTask>, user: { uid: string; name: string }): Promise<FollowUpTask> {
    const existing = cachedFollowups.find((t) => t.id === id);
    if (!existing) throw new Error('Task not found');

    const updated: FollowUpTask = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    cachedFollowups = cachedFollowups.map((t) => (t.id === id ? updated : t));
    setLocal('followups', cachedFollowups);

    try {
      await setDoc(doc(db, 'followUpTasks', id), updated);
    } catch {
      // fallback
    }

    await this.logAction('UPDATE_TASK', 'followUpTasks', id, `Updated follow-up: ${updated.title} -> ${updated.status}`, user);
    return updated;
  },

  // --- PC Builds ---
  async getPCBuilds(): Promise<SavedPCBuild[]> {
    try {
      const snap = await getDocs(collection(db, 'pcBuilds'));
      if (!snap.empty) {
        const list: SavedPCBuild[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as SavedPCBuild), id: d.id }));
        cachedPCBuilds = list;
        setLocal('pc_builds', list);
        return list;
      }
    } catch {
      // fallback to cached
    }
    return cachedPCBuilds;
  },

  async savePCBuild(build: Omit<SavedPCBuild, 'id' | 'createdAt' | 'updatedAt'>, user: { uid: string; name: string }): Promise<SavedPCBuild> {
    const id = 'build_' + Date.now();
    const saved: SavedPCBuild = {
      ...build,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cachedPCBuilds = [saved, ...cachedPCBuilds];
    setLocal('pc_builds', cachedPCBuilds);

    try {
      await setDoc(doc(db, 'pcBuilds', id), saved);
    } catch {
      // fallback
    }

    await this.logAction('SAVE_PC_BUILD', 'pcBuilds', id, `Saved PC build configuration: ${saved.name}`, user);
    return saved;
  },

  async deletePCBuild(id: string, user: { uid: string; name: string }): Promise<void> {
    const build = cachedPCBuilds.find((b) => b.id === id);
    cachedPCBuilds = cachedPCBuilds.filter((b) => b.id !== id);
    setLocal('pc_builds', cachedPCBuilds);

    try {
      await deleteDoc(doc(db, 'pcBuilds', id));
    } catch {
      // fallback
    }

    await this.logAction('DELETE_PC_BUILD', 'pcBuilds', id, `Deleted PC build configuration: ${build?.name || id}`, user);
  },

  // --- Reset & Wipe Demo Data Tools ---
  async clearAllDemoData(user: { uid: string; name: string }): Promise<void> {
    cachedProducts = cachedProducts.filter((p) => !p.isDemo);
    cachedCustomers = cachedCustomers.filter((c) => !c.isDemo);
    cachedQuotations = cachedQuotations.filter((q) => !q.isDemo);
    cachedOrders = cachedOrders.filter((o) => !o.isDemo);
    cachedFollowups = cachedFollowups.filter((f) => !f.isDemo);
    cachedSuppliers = cachedSuppliers.filter((s) => !s.isDemo);

    setLocal('products', cachedProducts);
    setLocal('customers', cachedCustomers);
    setLocal('quotations', cachedQuotations);
    setLocal('orders', cachedOrders);
    setLocal('followups', cachedFollowups);
    setLocal('suppliers', cachedSuppliers);

    await this.logAction('CLEAR_DEMO_DATA', 'system', 'all', 'Cleared all demo sample records', user);
  },

  async resetToDemoData(user: { uid: string; name: string }): Promise<void> {
    cachedProducts = INITIAL_PRODUCTS;
    cachedCustomers = INITIAL_CUSTOMERS;
    cachedQuotations = INITIAL_QUOTATIONS;
    cachedOrders = INITIAL_ORDERS;
    cachedFollowups = INITIAL_FOLLOWUPS;
    cachedSuppliers = INITIAL_SUPPLIERS;
    cachedLocations = INITIAL_LOCATIONS;
    cachedSettings = INITIAL_COMPANY_SETTINGS;

    setLocal('products', cachedProducts);
    setLocal('customers', cachedCustomers);
    setLocal('quotations', cachedQuotations);
    setLocal('orders', cachedOrders);
    setLocal('followups', cachedFollowups);
    setLocal('suppliers', cachedSuppliers);
    setLocal('locations', cachedLocations);
    setLocal('settings', cachedSettings);

    await this.logAction('RESET_DEMO_DATA', 'system', 'all', 'Restored default demo hardware dataset', user);
  },
};
