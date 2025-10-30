import getColumnTypes from './columnTypes';
import config from '../../config/fixedColumnData.json';

export type FixedValue = number | string;

export type FixedColumnVariant = {
  columns?: Record<string, FixedValue>;
  switchRailReductionTypes?: Record<
    string,
    { columns: Record<string, FixedValue> }
  >;
};

export type FixedColumnDataSet = {
  id: string;
  name: string;
  isDefault: boolean;
  description?: string;
  columns?: Record<string, FixedValue>; // 全局默认值（可选）
  trackTypes?: {
    straight?: FixedColumnVariant;
    curved?: FixedColumnVariant;
  };
  switchRailReductionTypes?: Record<
    string,
    { columns: Record<string, FixedValue> }
  >;
};

export type FixedColumnDataConfig = {
  version: number;
  datasets: FixedColumnDataSet[];
};

const typedConfig: FixedColumnDataConfig = config as FixedColumnDataConfig;

/** 按轨型聚合列名（过滤空名） */
export function getColumnNamesByTrackType(
  trackType: 'straight' | 'curved',
): string[] {
  const ct = getColumnTypes();
  const groups = [
    trackType === 'straight'
      ? ct.getStraightGaugeColumnTypes()
      : ct.getCurvedGaugeColumnTypes(),
    trackType === 'straight'
      ? ct.getStraightHorizontalColumnTypes()
      : ct.getCurvedHorizontalColumnTypes(),
    ct.getOffsetColumnTypes(),
    trackType === 'straight'
      ? ct.getStraightReducedValueOfSwitchRailColumnTypes()
      : ct.getCurvedReducedValueOfSwitchRailColumnTypes(),
    trackType === 'straight'
      ? ct.getStraightGuardRailFlangeGrooveColumnTypes()
      : ct.getCurvedGuardRailFlangeGrooveColumnTypes(),
  ];
  const names = new Set<string>();
  groups.forEach((arr) => {
    arr.forEach((col) => {
      const n = (col as any)?.name;
      if (typeof n === 'string' && n.trim().length > 0) names.add(n);
    });
  });
  return Array.from(names);
}

/** 聚合所有有效的列名（直轨+曲轨），并去重 */
export function getAllColumnNames(): string[] {
  const names = new Set<string>(getColumnNamesByTrackType('straight'));
  getColumnNamesByTrackType('curved').forEach((n) => names.add(n));
  return Array.from(names);
}

export function listDataSets(): FixedColumnDataSet[] {
  return typedConfig.datasets || [];
}

export function getDataSet(id: string): FixedColumnDataSet | undefined {
  return (typedConfig.datasets || []).find((d) => d.id === id);
}

export function getFixedValue(
  id: string,
  columnName: string,
  opts?: { trackType?: 'straight' | 'curved'; mode?: string },
): FixedValue | undefined {
  const ds = getDataSet(id);
  if (!ds) return undefined;
  const tt = opts?.trackType;
  const mode = opts?.mode;

  // 优先：轨型 + 模式
  if (tt && mode) {
    const mv = ds.trackTypes?.[tt]?.switchRailReductionTypes?.[mode]?.columns;
    if (mv && columnName in mv) return mv[columnName];
  }
  // 其次：仅模式
  if (mode) {
    const mv = ds.switchRailReductionTypes?.[mode]?.columns;
    if (mv && columnName in mv) return mv[columnName];
  }
  // 再次：仅轨型
  if (tt) {
    const cv = ds.trackTypes?.[tt]?.columns;
    if (cv && columnName in cv) return cv[columnName];
  }
  // 回退：全局默认
  return ds.columns?.[columnName];
}

/**
 * 校验数据集：返回（全局）无效列与缺失列。
 * 对于包含 variants 的数据集，会将所有 variant 的列并入校验。
 */
export function validateDataSet(id: string): {
  invalidColumns: string[];
  missingColumns: string[];
} {
  const ds = getDataSet(id);
  const all = new Set(getAllColumnNames());
  if (!ds) return { invalidColumns: [], missingColumns: Array.from(all) };
  const union: Record<string, FixedValue> = { ...(ds.columns || {}) };
  // 合并全局 modes
  Object.values(ds.switchRailReductionTypes || {}).forEach((m) => {
    Object.assign(union, m.columns || {});
  });
  // 合并 variants 的 columns
  if (ds.trackTypes?.straight?.columns)
    Object.assign(union, ds.trackTypes.straight.columns);
  if (ds.trackTypes?.curved?.columns)
    Object.assign(union, ds.trackTypes.curved.columns);
  // 合并 variants 的 modes
  ['straight', 'curved'].forEach((tt) => {
    const v = ds.trackTypes?.[tt as 'straight' | 'curved'];
    Object.values(v?.switchRailReductionTypes || {}).forEach((m) => {
      Object.assign(union, m.columns || {});
    });
  });
  const invalidColumns: string[] = [];
  Object.keys(union).forEach((k) => {
    if (!all.has(k)) invalidColumns.push(k);
  });
  const missingColumns: string[] = Array.from(all).filter((k) => !(k in union));
  return { invalidColumns, missingColumns };
}

/** 按轨型校验，返回该轨型的无效列与缺失列 */
export function validateVariant(
  id: string,
  trackType: 'straight' | 'curved',
): { invalidColumns: string[]; missingColumns: string[] } {
  const ds = getDataSet(id);
  const names = new Set(getColumnNamesByTrackType(trackType));
  if (!ds) return { invalidColumns: [], missingColumns: Array.from(names) };
  const cols: Record<string, FixedValue> = {
    ...(ds.trackTypes?.[trackType]?.columns || {}),
  };
  // 合并该轨型下的 modes
  Object.values(
    ds.trackTypes?.[trackType]?.switchRailReductionTypes || {},
  ).forEach((m) => {
    Object.assign(cols, m.columns || {});
  });
  const invalidColumns: string[] = [];
  Object.keys(cols).forEach((k) => {
    if (!names.has(k)) invalidColumns.push(k);
  });
  const missingColumns: string[] = Array.from(names).filter(
    (k) => !(k in cols),
  );
  return { invalidColumns, missingColumns };
}

export default {
  getColumnNamesByTrackType,
  getAllColumnNames,
  listDataSets,
  getDataSet,
  getFixedValue,
  validateDataSet,
  validateVariant,
};
