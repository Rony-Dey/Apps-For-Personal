import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { dbService } from '../services/db';
import { Customer, FollowUpTask, Product, Quotation, SalesOrder } from '../types';

export interface DashboardMetrics {
  // Primary KPI metrics requested
  totalActiveProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  outOfStockCount: number;
  outOfStockProducts: Product[];
  todayQuotationsCount: number;
  todayQuotations: Quotation[];
  // Additional essential business KPIs
  todaySalesAmount: number;
  monthSalesAmount: number;
  totalPaidAmount: number;
  totalOutstandingDue: number;
  pendingFollowupsCount: number;
  confirmedOrdersCount: number;
  conversionRate: number;
  // Lists
  recentQuotations: Quotation[];
  upcomingFollowups: FollowUpTask[];
  topProducts: Product[];
  // Connection and operational states
  isLoading: boolean;
  isRealtime: boolean;
  lastUpdated: string;
  refetch: () => Promise<void>;
}

export function useDashboardMetrics(): DashboardMetrics {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [followups, setFollowups] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // Manual fallback loader
  const loadFallbackData = async () => {
    try {
      const [pList, qList, oList, fList] = await Promise.all([
        dbService.getProducts(),
        dbService.getQuotations(),
        dbService.getOrders(),
        dbService.getFollowUps(),
      ]);
      setProducts(pList);
      setQuotations(qList);
      setOrders(oList);
      setFollowups(fList);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.warn('Fallback data loading:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let unsubProducts: (() => void) | null = null;
    let unsubQuotations: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;
    let unsubFollowups: (() => void) | null = null;

    let mounted = true;

    try {
      // 1. Real-time products listener
      unsubProducts = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          if (!mounted) return;
          if (!snapshot.empty) {
            const list: Product[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...(doc.data() as Product), id: doc.id });
            });
            setProducts(list);
            setIsRealtime(true);
            setLastUpdated(new Date().toISOString());
          } else {
            // Empty firestore collection: check cache/fallback
            dbService.getProducts().then((cached) => {
              if (mounted) setProducts(cached);
            });
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn('Firestore products listener error, falling back to local DB cache:', error);
          loadFallbackData();
          try {
            handleFirestoreError(error, OperationType.GET, 'products');
          } catch {
            // Ignored in hook so component doesn't crash
          }
        }
      );

      // 2. Real-time quotations listener
      unsubQuotations = onSnapshot(
        collection(db, 'quotations'),
        (snapshot) => {
          if (!mounted) return;
          if (!snapshot.empty) {
            const list: Quotation[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...(doc.data() as Quotation), id: doc.id });
            });
            setQuotations(list);
            setLastUpdated(new Date().toISOString());
          } else {
            dbService.getQuotations().then((cached) => {
              if (mounted) setQuotations(cached);
            });
          }
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.GET, 'quotations');
          } catch {
            // Ignored in hook
          }
        }
      );

      // 3. Real-time sales orders listener
      unsubOrders = onSnapshot(
        collection(db, 'salesOrders'),
        (snapshot) => {
          if (!mounted) return;
          if (!snapshot.empty) {
            const list: SalesOrder[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...(doc.data() as SalesOrder), id: doc.id });
            });
            setOrders(list);
            setLastUpdated(new Date().toISOString());
          } else {
            dbService.getOrders().then((cached) => {
              if (mounted) setOrders(cached);
            });
          }
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.GET, 'salesOrders');
          } catch {
            // Ignored in hook
          }
        }
      );

      // 4. Real-time follow-up tasks listener
      unsubFollowups = onSnapshot(
        collection(db, 'followUpTasks'),
        (snapshot) => {
          if (!mounted) return;
          if (!snapshot.empty) {
            const list: FollowUpTask[] = [];
            snapshot.forEach((doc) => {
              list.push({ ...(doc.data() as FollowUpTask), id: doc.id });
            });
            setFollowups(list);
            setLastUpdated(new Date().toISOString());
          } else {
            dbService.getFollowUps().then((cached) => {
              if (mounted) setFollowups(cached);
            });
          }
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.GET, 'followUpTasks');
          } catch {
            // Ignored in hook
          }
        }
      );
    } catch (err) {
      console.warn('Real-time listener setup caught error:', err);
      loadFallbackData();
    }

    return () => {
      mounted = false;
      if (unsubProducts) unsubProducts();
      if (unsubQuotations) unsubQuotations();
      if (unsubOrders) unsubOrders();
      if (unsubFollowups) unsubFollowups();
    };
  }, []);

  // Compute calculated metrics
  const totalActiveProducts = useMemo(() => {
    return products.filter((p) => p.status === 'active').length;
  }, [products]);

  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.totalStock || 0), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) => (p.totalStock || 0) <= (p.reorderLevel || 5) && (p.totalStock || 0) > 0
    );
  }, [products]);

  const lowStockCount = lowStockProducts.length;

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => (p.totalStock || 0) === 0);
  }, [products]);

  const outOfStockCount = outOfStockProducts.length;

  // Today's Date String in Asia/Dhaka or Local ISO
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const todayQuotations = useMemo(() => {
    return quotations.filter((q) => q.createdAt && q.createdAt.startsWith(todayStr));
  }, [quotations, todayStr]);

  const todayQuotationsCount = todayQuotations.length;

  const todaySalesAmount = useMemo(() => {
    return orders
      .filter((o) => o.createdAt && o.createdAt.startsWith(todayStr))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders, todayStr]);

  const monthSalesAmount = useMemo(() => {
    return orders
      .filter((o) => o.createdAt && o.createdAt.startsWith(currentMonthStr))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders, currentMonthStr]);

  const totalPaidAmount = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
  }, [orders]);

  const totalOutstandingDue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
  }, [orders]);

  const pendingFollowupsCount = useMemo(() => {
    return followups.filter((f) => f.status === 'due').length;
  }, [followups]);

  const confirmedOrdersCount = useMemo(() => {
    return orders.filter(
      (o) => o.orderStatus === 'confirmed' || o.orderStatus === 'processing' || o.orderStatus === 'delivered'
    ).length;
  }, [orders]);

  const conversionRate = useMemo(() => {
    const nonDraft = quotations.filter((q) => q.status !== 'draft');
    if (nonDraft.length === 0) return 0;
    const acceptedOrOrdered = nonDraft.filter((q) => q.status === 'accepted' || q.status === 'ordered');
    return Math.round((acceptedOrOrdered.length / nonDraft.length) * 100);
  }, [quotations]);

  const recentQuotations = useMemo(() => {
    return [...quotations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [quotations]);

  const upcomingFollowups = useMemo(() => {
    return [...followups]
      .filter((f) => f.status !== 'won' && f.status !== 'lost')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [followups]);

  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => b.sellingPrice - a.sellingPrice)
      .slice(0, 5);
  }, [products]);

  return {
    totalActiveProducts,
    totalStockUnits,
    lowStockCount,
    lowStockProducts,
    outOfStockCount,
    outOfStockProducts,
    todayQuotationsCount,
    todayQuotations,
    todaySalesAmount,
    monthSalesAmount,
    totalPaidAmount,
    totalOutstandingDue,
    pendingFollowupsCount,
    confirmedOrdersCount,
    conversionRate,
    recentQuotations,
    upcomingFollowups,
    topProducts,
    isLoading,
    isRealtime,
    lastUpdated,
    refetch: loadFallbackData,
  };
}
