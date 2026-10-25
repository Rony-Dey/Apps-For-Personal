export type UserRole = 'admin' | 'manager' | 'salesperson' | 'inventory' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  photoURL?: string;
  createdAt?: string;
}

export type HardwareCategory = 
  | 'Processor'
  | 'Motherboard'
  | 'RAM'
  | 'Graphics Card'
  | 'Storage'
  | 'Power Supply'
  | 'Casing'
  | 'CPU Cooler'
  | 'Monitor'
  | 'Laptop'
  | 'Keyboard'
  | 'Mouse'
  | 'Networking'
  | 'UPS'
  | 'Accessories';

export interface HardwareSpecs {
  socket?: string; // e.g. LGA1700, AM5, AM4, LGA1200
  chipset?: string; // e.g. B760, B650, Z790, A620
  supportedGenerations?: string[]; // e.g. ["Intel 12th", "Intel 13th", "Intel 14th"]
  ramType?: 'DDR4' | 'DDR5' | 'DDR3';
  ramSlots?: number;
  maxRamSpeedMHz?: number;
  formFactor?: 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX';
  storageInterface?: 'M.2 NVMe PCIe 4.0' | 'M.2 NVMe PCIe 3.0' | 'SATA 3' | 'PCIe 5.0';
  gpuWattage?: number;
  gpuLengthMm?: number;
  psuWattage?: number;
  psuEfficiency?: string; // 80+ Bronze, Gold, etc.
  coolerSocketSupport?: string[];
  coolerTdpRating?: number;
  caseMaxGpuLengthMm?: number;
  caseSupportedMotherboards?: ('ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX')[];
  warrantyMonths?: number;
  [key: string]: any;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  model: string;
  category: HardwareCategory | string;
  subcategory?: string;
  barcode?: string;
  imageUrl?: string;
  partNumber?: string;
  description?: string;
  specs: HardwareSpecs;
  supplierId?: string;
  supplierName?: string;
  supplierUrl?: string;
  sourceName?: string;
  purchaseCost: number; // Sensitive, visible to admin/manager
  sellingPrice: number;
  minPrice?: number;
  stockByLocation: { [locationId: string]: number };
  totalStock: number;
  reservedStock?: number;
  reorderLevel: number;
  warranty: string; // e.g. "3 Years Replacement Warranty"
  status: 'active' | 'archived' | 'out_of_stock';
  lastPriceUpdate?: string;
  lastStockVerification?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockLocation {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  address: string;
  phone?: string;
  isDefault?: boolean;
}

export type StockMovementType = 
  | 'received' 
  | 'sale' 
  | 'transfer' 
  | 'return' 
  | 'adjustment' 
  | 'damaged' 
  | 'reserved' 
  | 'released';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  reason: string;
  referenceNumber?: string; // Order or Quote #
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  brandsSupplied?: string[];
  paymentTerms?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address: string;
  district: string;
  customerType: 'retail' | 'corporate' | 'reseller';
  preferredChannel: 'phone' | 'whatsapp' | 'email' | 'in_person';
  assignedSalesperson?: string;
  leadSource?: string;
  notes?: string;
  totalOrdersCount?: number;
  totalSpent?: number;
  dueBalance?: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyCondition = 'official' | 'replacement' | 'service' | 'none' | 'unspecified';

export interface QuotationItem {
  productId?: string;
  sku: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  warranty: string;
  warrantyDuration?: string;
  warrantyCondition?: WarrantyCondition;
  quantity: number;
  unitPrice: number;
  purchaseCost?: number; // Snapshot of internal cost
  lineDiscount: number;
  total: number;
}

export type QuotationStatus = 
  | 'draft' 
  | 'sent' 
  | 'negotiation' 
  | 'accepted' 
  | 'rejected' 
  | 'expired' 
  | 'ordered';

export interface Quotation {
  id: string;
  quoteNumber: string; // e.g. "SIT-Q-2026-001"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCompany?: string;
  customerAddress?: string;
  salespersonId: string;
  salespersonName: string;
  items: QuotationItem[];
  subtotal: number;
  overallDiscount: number;
  deliveryCharge: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
  terms: string;
  warrantyNotes: string;
  internalNotes?: string;
  customerNotes?: string;
  status: QuotationStatus;
  revision: number;
  validUntil: string;
  convertedToOrderId?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SalesOrderStatus = 'confirmed' | 'processing' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface SalesOrder {
  id: string;
  orderNumber: string; // e.g. "SIT-ORD-2026-001"
  quotationId?: string;
  quotationNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: QuotationItem[];
  subtotal: number;
  overallDiscount: number;
  deliveryCharge: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  orderStatus: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  deliveryAddress: string;
  salespersonId: string;
  salespersonName: string;
  deliveryMethod?: 'shop_pickup' | 'courier_redx' | 'courier_steadfast' | 'courier_sundarban' | 'home_delivery';
  courierTracking?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'card';
  transactionRef?: string;
  notes?: string;
  receivedBy: string;
  receivedByName: string;
  createdAt: string;
}

export type FollowUpStatus = 
  | 'new' 
  | 'requirement' 
  | 'draft' 
  | 'sent' 
  | 'due' 
  | 'negotiation' 
  | 'won' 
  | 'lost';

export interface FollowUpTask {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  quotationId?: string;
  quoteNumber?: string;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: FollowUpStatus;
  lostReason?: string;
  notes: string;
  nextAction?: string;
  communicationLog?: {
    date: string;
    type: 'call' | 'whatsapp' | 'email' | 'meeting';
    summary: string;
    loggedBy: string;
  }[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BuildPurpose = 
  | 'office' 
  | 'education' 
  | 'programming' 
  | 'gaming' 
  | 'graphics' 
  | 'editing' 
  | 'workstation' 
  | 'custom';

export type CompatibilityStatus = 
  | 'compatible' 
  | 'incompatible' 
  | 'needs_verification' 
  | 'insufficient_data';

export interface PCBuildComponentSelection {
  cpu?: Product;
  motherboard?: Product;
  ram?: Product;
  ramQuantity?: number;
  storage?: Product;
  gpu?: Product;
  psu?: Product;
  case?: Product;
  cooler?: Product;
  monitor?: Product;
  keyboard?: Product;
  mouse?: Product;
  ups?: Product;
  additionalAccessories?: Product[];
}

export interface CompatibilityCheckResult {
  status: CompatibilityStatus;
  warnings: string[];
  errors: string[];
  notes: string[];
  estimatedWattage: number;
  recommendedPsuWattage: number;
  overridden?: boolean;
  overrideReason?: string;
}

export interface SavedPCBuild {
  id: string;
  name: string;
  customerName?: string;
  customerPhone?: string;
  budget?: number;
  purpose: BuildPurpose;
  targetLocationId: string;
  components: PCBuildComponentSelection;
  totalPrice: number;
  totalEstimatedCost?: number;
  compatibilityResult: CompatibilityCheckResult;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  companyNameBn: string;
  tagline: string;
  taglineBn: string;
  address: string;
  addressBn: string;
  phone: string;
  altPhone?: string;
  email: string;
  website?: string;
  binOrVatNumber?: string;
  tradeLicenseNo?: string;
  logoUrl?: string;
  defaultLocationId: string;
  defaultQuoteValidityDays: number;
  defaultQuotePrefix: string;
  defaultOrderPrefix: string;
  defaultWarrantyText: string;
  defaultWarrantyTerms?: string;
  defaultQuotationTerms: string;
  defaultVatPercent: number;
  currencySymbol: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  performedBy: string;
  performedByName: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DiscoveredProductPreview {
  sourceUrl: string;
  sourceWebsite: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  imageUrl?: string;
  inStock: boolean;
  stockText: string;
  specs: HardwareSpecs;
  verificationStatus: 'verified_source' | 'imported_unverified' | 'price_unavailable' | 'stock_unknown';
  duplicateCandidate?: Product;
}
