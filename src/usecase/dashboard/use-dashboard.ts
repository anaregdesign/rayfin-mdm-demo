import { useEffect, useMemo, useState } from 'react';

import type { Customer } from '@/domain/models/customer';
import type { Product } from '@/domain/models/product';
import type { DuplicatePair } from '@/domain/models/duplicate';
import type { StewardWorkload } from '@/domain/models/steward-task';
import { UNASSIGNED_LABEL } from '@/domain/models/steward-task';
import { productCategoryLabel } from '@/domain/models/product';
import type {
  GroupBreakdown,
  QualityTrendPoint,
  TrendRecord,
  TrendWindowDays,
} from '@/domain/models/analytics';
import {
  duplicateIdSet,
  findCustomerDuplicates,
  findProductDuplicates,
} from '@/domain/policies/duplicate-policy';
import { evaluateCustomerQuality } from '@/domain/policies/customer-quality-policy';
import { evaluateProductQuality } from '@/domain/policies/product-quality-policy';
import { deriveRemediationTargets } from '@/domain/policies/cleansing-policy';
import {
  deriveStewardTasks,
  stewardWorkloads,
} from '@/domain/policies/steward-task-policy';
import {
  buildQualityTrend,
  groupBreakdown,
  type GroupItem,
  type ReportSection,
} from '@/domain/policies/analytics-policy';

import { useDependencies } from '@/di/dependencies';
import { useCustomers } from '@/usecase/customers/use-customers';
import { useProducts } from '@/usecase/products/use-products';

import {
  recentlyUpdated,
  summarizeCustomers,
  summarizeProducts,
  topDuplicates,
  type MasterSummary,
} from './selectors';

const UNASSIGNED_KEY = '__unassigned__';

export interface DashboardViewModel {
  loading: boolean;
  error: string | null;
  customerSummary: MasterSummary;
  productSummary: MasterSummary;
  recentCustomers: Customer[];
  recentProducts: Product[];
  customerDuplicates: DuplicatePair[];
  productDuplicates: DuplicatePair[];
  /** Per-steward open-task load across both masters (Issue #10). */
  stewardWorkloads: StewardWorkload[];
  /** Records needing standardization/cleansing or below quality bar (Issue #11). */
  remediationCount: number;
  /** Subset of `remediationCount` that has at least one cleansing suggestion. */
  cleansingSuggestionCount: number;
  /** Daily quality trend across both masters (Issue #13). */
  trend: QualityTrendPoint[];
  /** Selected trend window in days (`0` = 全期間). */
  trendWindow: TrendWindowDays;
  setTrendWindow: (days: TrendWindowDays) => void;
  /** Composition by master type (customer/product) (Issue #13). */
  entityBreakdown: GroupBreakdown[];
  /** Composition by steward across both masters (Issue #13). */
  stewardBreakdown: GroupBreakdown[];
  /** Composition by product category (Issue #13). */
  categoryBreakdown: GroupBreakdown[];
  /** Report sections for CSV/print export (Issue #13). */
  reportSections: ReportSection[];
}

function customerItem(c: Customer): GroupItem & TrendRecord {
  return {
    key: 'customer',
    label: '顧客',
    createdAt: c.createdAt,
    qualityScore: evaluateCustomerQuality(c).score,
    isActive: c.status === 'active',
    isDuplicate: false,
  };
}

function productItem(p: Product): GroupItem & TrendRecord {
  return {
    key: 'product',
    label: '製品',
    createdAt: p.createdAt,
    qualityScore: evaluateProductQuality(p).score,
    isActive: p.status === 'active',
    isDuplicate: false,
  };
}

function ratioPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** Aggregates both masters into the analytics view shown on the dashboard. */
export function useDashboard(): DashboardViewModel {
  const customers = useCustomers();
  const products = useProducts();
  const { changeLog } = useDependencies();

  const [changes, setChanges] = useState<{ occurredAt: Date }[]>([]);
  const [trendWindow, setTrendWindow] = useState<TrendWindowDays>(30);

  // Load whole-domain change history for the trend's per-day change count.
  // Non-fatal: on failure the trend still renders from the record cohort.
  useEffect(() => {
    let alive = true;
    Promise.all([
      changeLog.listByType('customer'),
      changeLog.listByType('product'),
    ])
      .then(([c, p]) => {
        if (alive) setChanges([...c, ...p]);
      })
      .catch(() => {
        if (alive) setChanges([]);
      });
    return () => {
      alive = false;
    };
  }, [changeLog]);

  const customerSummary = useMemo(
    () => summarizeCustomers(customers.customers),
    [customers.customers]
  );
  const productSummary = useMemo(
    () => summarizeProducts(products.products),
    [products.products]
  );

  const recentCustomers = useMemo(
    () => recentlyUpdated(customers.customers),
    [customers.customers]
  );
  const recentProducts = useMemo(
    () => recentlyUpdated(products.products),
    [products.products]
  );

  const customerDuplicates = useMemo(
    () => topDuplicates(findCustomerDuplicates(customers.customers)),
    [customers.customers]
  );
  const productDuplicates = useMemo(
    () => topDuplicates(findProductDuplicates(products.products)),
    [products.products]
  );

  const stewardLoads = useMemo(
    () =>
      stewardWorkloads(
        deriveStewardTasks(customers.customers, products.products)
      ),
    [customers.customers, products.products]
  );

  const remediationTargets = useMemo(
    () => deriveRemediationTargets(customers.customers, products.products),
    [customers.customers, products.products]
  );

  // Records projected for the trend, with per-master duplicate flags applied.
  const trendRecords = useMemo<TrendRecord[]>(() => {
    const custDup = duplicateIdSet(findCustomerDuplicates(customers.customers));
    const prodDup = duplicateIdSet(findProductDuplicates(products.products));
    return [
      ...customers.customers.map((c) => ({
        ...customerItem(c),
        isDuplicate: custDup.has(c.id),
      })),
      ...products.products.map((p) => ({
        ...productItem(p),
        isDuplicate: prodDup.has(p.id),
      })),
    ];
  }, [customers.customers, products.products]);

  const trend = useMemo(
    () =>
      buildQualityTrend(trendRecords, changes, {
        now: new Date(),
        days: trendWindow,
      }),
    [trendRecords, changes, trendWindow]
  );

  const entityBreakdown = useMemo(
    () =>
      groupBreakdown([
        ...customers.customers.map(customerItem),
        ...products.products.map(productItem),
      ]),
    [customers.customers, products.products]
  );

  const stewardBreakdown = useMemo(() => {
    const items: GroupItem[] = [
      ...customers.customers.map((c) => ({
        key: c.steward?.trim() || UNASSIGNED_KEY,
        label: c.steward?.trim() || UNASSIGNED_LABEL,
        qualityScore: evaluateCustomerQuality(c).score,
        isActive: c.status === 'active',
      })),
      ...products.products.map((p) => ({
        key: p.steward?.trim() || UNASSIGNED_KEY,
        label: p.steward?.trim() || UNASSIGNED_LABEL,
        qualityScore: evaluateProductQuality(p).score,
        isActive: p.status === 'active',
      })),
    ];
    return groupBreakdown(items);
  }, [customers.customers, products.products]);

  const categoryBreakdown = useMemo(
    () =>
      groupBreakdown(
        products.products.map((p) => ({
          key: p.category,
          label: productCategoryLabel(p.category),
          qualityScore: evaluateProductQuality(p).score,
          isActive: p.status === 'active',
        }))
      ),
    [products.products]
  );

  const reportSections = useMemo<ReportSection[]>(() => {
    const breakdownRows = (groups: GroupBreakdown[]) =>
      groups.map((g) => [
        g.label,
        String(g.total),
        String(g.activeCount),
        String(g.avgQuality),
        ratioPct(g.activeRatio),
      ]);
    return [
      {
        title: 'マスタ種別サマリ',
        headers: ['マスタ', '総数', '有効', '平均品質', '有効率'],
        rows: breakdownRows(entityBreakdown),
      },
      {
        title: 'スチュワード別',
        headers: ['担当', '総数', '有効', '平均品質', '有効率'],
        rows: breakdownRows(stewardBreakdown),
      },
      {
        title: '製品カテゴリ別',
        headers: ['カテゴリ', '総数', '有効', '平均品質', '有効率'],
        rows: breakdownRows(categoryBreakdown),
      },
      {
        title: `品質トレンド（${trend.length}日）`,
        headers: ['日付', '総数', '平均品質', '有効率', '重複', '変更'],
        rows: trend.map((p) => [
          p.date,
          String(p.total),
          String(p.avgQuality),
          ratioPct(p.activeRatio),
          String(p.duplicateCount),
          String(p.changeCount),
        ]),
      },
    ];
  }, [entityBreakdown, stewardBreakdown, categoryBreakdown, trend]);

  return {
    loading: customers.loading || products.loading,
    error: customers.error ?? products.error,
    customerSummary,
    productSummary,
    recentCustomers,
    recentProducts,
    customerDuplicates,
    productDuplicates,
    stewardWorkloads: stewardLoads,
    remediationCount: remediationTargets.length,
    cleansingSuggestionCount: remediationTargets.filter(
      (t) => t.suggestions.length > 0
    ).length,
    trend,
    trendWindow,
    setTrendWindow,
    entityBreakdown,
    stewardBreakdown,
    categoryBreakdown,
    reportSections,
  };
}
