import { DbUtils } from '../../utils/DbUtils';

// 与页面/模型保持一致的类型
export type NumericData = Record<string, string | number | undefined>;
export type StringData = Record<string, string>;
export type StepStatus = Array<'process' | 'wait' | 'finish' | 'error'>;

// 新增：一次性保存全量数据的结构类型（便于记录表保存）
export type DataCollectPayload = {
  straightGauge: NumericData;
  straightHorizontal: NumericData;
  curvedGauge: NumericData;
  curvedHorizontal: NumericData;
  offset: NumericData;
  straightReduced: NumericData;
  curvedReduced: NumericData;
  straightGuard: NumericData;
  curvedGuard: NumericData;
  other: StringData;
  stepStatus: StepStatus;
};

// 新增：记录的额外元信息（可扩展，页面可按需传入）
export type DataCollectRecordMeta = {
  operator?: string; // 操作员
  project?: string; // 项目/线路
  switchId?: string; // 道岔编号
  note?: string; // 备注
  [key: string]: unknown;
};

// 统一的存储键（与数据采集页和验证页注释中的命名对齐）
export const STORAGE_KEYS = {
  straightGauge: 'dataCollect_straight_gauge',
  straightHorizontal: 'dataCollect_straight_horizontal',
  curvedGauge: 'dataCollect_curved_gauge',
  curvedHorizontal: 'dataCollect_curved_horizontal',
  offset: 'dataCollect_offset',
  straightReduced: 'dataCollect_straight_reduced',
  curvedReduced: 'dataCollect_curved_reduced',
  straightGuard: 'dataCollect_straight_guard',
  curvedGuard: 'dataCollect_curved_guard',
  other: 'dataCollect_other',
  stepStatus: 'dataCollect_step_status',
} as const;

// kv 存储表结构：key 唯一，value 保存 JSON 字符串
const KV_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`;

// 新增：数据录入记录表（按批次快照保存），payload/metadata 以 JSON 保存
const RECORDS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS data_collect_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT,
  created_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  metadata TEXT
)`;

// 初始化数据库与表（幂等）
export async function setupDataCollectDB() {
  const db = await DbUtils.getInstance();
  await db.ensureTable(KV_TABLE_SQL);
  await db.ensureTable(RECORDS_TABLE_SQL);
  // Migrate: add uid column if not exists
  try {
    await db.execute(
      'ALTER TABLE data_collect_records ADD COLUMN uid TEXT',
      [],
    );
  } catch (_e) {
    // Ignore if column already exists
    console.info('[dbHandler] uid column migration skipped or already exists');
  }
  // Index for faster UID queries and to enforce uniqueness
  await db.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_data_collect_records_uid ON data_collect_records(uid)',
    [],
  );
}

// 通用保存（JSON 序列化）
export async function saveByKey(key: string, data: unknown) {
  const db = await DbUtils.getInstance();
  const now = Date.now();
  const json = JSON.stringify(data ?? {});
  await db.execute(
    'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3)',
    [key, json, now],
  );
}

// 通用读取（返回 JSON 字符串，便于与现有使用对齐）
export async function loadByKey(key: string): Promise<string | null> {
  const db = await DbUtils.getInstance();
  const row = await db.selectOne<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = $1 LIMIT 1',
    [key],
  );
  return row?.value ?? null;
}

// 分类保存封装
export async function saveStraightGauge(data: NumericData) {
  return saveByKey(STORAGE_KEYS.straightGauge, data);
}
export async function saveStraightHorizontal(data: NumericData) {
  return saveByKey(STORAGE_KEYS.straightHorizontal, data);
}
export async function saveCurvedGauge(data: NumericData) {
  return saveByKey(STORAGE_KEYS.curvedGauge, data);
}
export async function saveCurvedHorizontal(data: NumericData) {
  return saveByKey(STORAGE_KEYS.curvedHorizontal, data);
}
export async function saveOffsetData(data: NumericData) {
  return saveByKey(STORAGE_KEYS.offset, data);
}
export async function saveStraightReducedValue(data: NumericData) {
  return saveByKey(STORAGE_KEYS.straightReduced, data);
}
export async function saveCurvedReducedValue(data: NumericData) {
  return saveByKey(STORAGE_KEYS.curvedReduced, data);
}
export async function saveStraightGuardRailFlangeGroove(data: NumericData) {
  return saveByKey(STORAGE_KEYS.straightGuard, data);
}
export async function saveCurvedGuardRailFlangeGroove(data: NumericData) {
  return saveByKey(STORAGE_KEYS.curvedGuard, data);
}
export async function saveOtherData(data: StringData) {
  return saveByKey(STORAGE_KEYS.other, data);
}
export async function saveStepStatus(data: StepStatus) {
  return saveByKey(STORAGE_KEYS.stepStatus, data);
}

// 分类读取封装（返回 JSON 字符串）
export async function getStraightGaugeFromDb() {
  return loadByKey(STORAGE_KEYS.straightGauge);
}
export async function getStraightHorizontalFromDb() {
  return loadByKey(STORAGE_KEYS.straightHorizontal);
}
export async function getCurvedGaugeFromDb() {
  return loadByKey(STORAGE_KEYS.curvedGauge);
}
export async function getCurvedHorizontalFromDb() {
  return loadByKey(STORAGE_KEYS.curvedHorizontal);
}
export async function getOffsetDataFromDb() {
  return loadByKey(STORAGE_KEYS.offset);
}
export async function getStraightReducedValueFromDb() {
  return loadByKey(STORAGE_KEYS.straightReduced);
}
export async function getCurvedReducedValueFromDb() {
  return loadByKey(STORAGE_KEYS.curvedReduced);
}
export async function getStraightGuardRailFlangeGrooveFromDb() {
  return loadByKey(STORAGE_KEYS.straightGuard);
}
export async function getCurvedGuardRailFlangeGrooveFromDb() {
  return loadByKey(STORAGE_KEYS.curvedGuard);
}
export async function getOtherDataFromDb() {
  return loadByKey(STORAGE_KEYS.other);
}
export async function getStepStatusFromDb() {
  return loadByKey(STORAGE_KEYS.stepStatus);
}

// 新增：创建一条数据采集记录（快照），返回新记录 id
export async function createDataCollectRecord(
  payload: DataCollectPayload,
  metadata?: DataCollectRecordMeta,
): Promise<number> {
  const db = await DbUtils.getInstance();
  const now = Date.now();
  const payloadJson = JSON.stringify(payload ?? {});
  const metaJson = JSON.stringify(metadata ?? {});
  await db.execute(
    'INSERT INTO data_collect_records (created_at, payload, metadata) VALUES ($1, $2, $3)',
    [now, payloadJson, metaJson],
  );
  const row = await db.selectOne<{ id: number }>(
    'SELECT last_insert_rowid() AS id',
    [],
  );
  return row?.id ?? 0;
}

// 新增：记录列表（用于记录页），只返回概要信息
export async function listDataCollectRecords(
  limit = 50,
  offset = 0,
): Promise<
  Array<{
    id: number;
    uid?: string;
    created_at: number;
    metadata?: DataCollectRecordMeta;
  }>
> {
  const db = await DbUtils.getInstance();
  const rows = (await db.select(
    'SELECT id, uid, created_at, metadata FROM data_collect_records ORDER BY id DESC LIMIT $1 OFFSET $2',
    [limit, offset],
  )) as Array<{
    id: number;
    uid: string | null;
    created_at: number;
    metadata: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    uid: r.uid || undefined,
    created_at: r.created_at,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
  }));
}

// 新增：按 id 获取记录详情（包含 payload）
export async function getDataCollectRecordById(id: number): Promise<{
  id: number;
  uid?: string;
  created_at: number;
  payload: DataCollectPayload;
  metadata?: DataCollectRecordMeta;
} | null> {
  const db = await DbUtils.getInstance();
  const row = (await db.selectOne(
    'SELECT id, uid, created_at, payload, metadata FROM data_collect_records WHERE id = $1 LIMIT 1',
    [id],
  )) as {
    id: number;
    uid: string | null;
    created_at: number;
    payload: string;
    metadata: string | null;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid || undefined,
    created_at: row.created_at,
    payload: JSON.parse(row.payload) as DataCollectPayload,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

// 新增：删除记录
export async function deleteDataCollectRecord(id: number): Promise<void> {
  const db = await DbUtils.getInstance();
  await db.execute('DELETE FROM data_collect_records WHERE id = $1', [id]);
}

// 一次性保存全部数据（推荐在“下一步/保存”时调用）
export async function saveAllDataCollect(
  payload: DataCollectPayload,
  metadata?: DataCollectRecordMeta,
  uid?: string,
) {
  const db = await DbUtils.getInstance();
  await db.transaction(async () => {
    const now = Date.now();

    // 1) 写入记录快照（支持可选的 UID 去重/更新）
    const payloadJson = JSON.stringify(payload ?? {});
    const metaJson = JSON.stringify(metadata ?? {});

    if (uid && /^[A-Za-z0-9_-]{8,64}$/.test(uid)) {
      const existing = await db.selectOne<{ id: number }>(
        'SELECT id FROM data_collect_records WHERE uid = $1 LIMIT 1',
        [uid],
      );
      if (existing?.id) {
        await db.execute(
          'UPDATE data_collect_records SET payload = $2, metadata = $3, created_at = $4 WHERE uid = $1',
          [uid, payloadJson, metaJson, now],
        );
      } else {
        await db.execute(
          'INSERT INTO data_collect_records (uid, created_at, payload, metadata) VALUES ($1, $2, $3, $4)',
          [uid, now, payloadJson, metaJson],
        );
      }
    } else {
      await db.execute(
        'INSERT INTO data_collect_records (created_at, payload, metadata) VALUES ($1, $2, $3)',
        [now, payloadJson, metaJson],
      );
    }

    // 2) 同步更新 kv（保持与现有页面使用兼容）
    const entries: Array<[string, string, number]> = [
      [
        STORAGE_KEYS.straightGauge,
        JSON.stringify(payload.straightGauge ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.straightHorizontal,
        JSON.stringify(payload.straightHorizontal ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.curvedGauge,
        JSON.stringify(payload.curvedGauge ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.curvedHorizontal,
        JSON.stringify(payload.curvedHorizontal ?? {}),
        now,
      ],
      [STORAGE_KEYS.offset, JSON.stringify(payload.offset ?? {}), now],
      [
        STORAGE_KEYS.straightReduced,
        JSON.stringify(payload.straightReduced ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.curvedReduced,
        JSON.stringify(payload.curvedReduced ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.straightGuard,
        JSON.stringify(payload.straightGuard ?? {}),
        now,
      ],
      [
        STORAGE_KEYS.curvedGuard,
        JSON.stringify(payload.curvedGuard ?? {}),
        now,
      ],
      [STORAGE_KEYS.other, JSON.stringify(payload.other ?? {}), now],
      [STORAGE_KEYS.stepStatus, JSON.stringify(payload.stepStatus ?? []), now],
    ];

    for (const [key, value, ts] of entries) {
      await db.execute(
        'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3)',
        [key, value, ts],
      );
    }
  });
}

export function validateUid(uid: string): { valid: boolean; message?: string } {
  const trimmed = (uid || '').trim();
  if (!trimmed) return { valid: false, message: 'uid不能为空' };
  if (trimmed.length < 8 || trimmed.length > 64)
    return { valid: false, message: 'uid长度需在8-64之间' };
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed))
    return { valid: false, message: 'uid只能包含字母、数字、下划线或中划线' };
  return { valid: true };
}

export async function getDataCollectRecordByUid(uid: string): Promise<{
  id: number;
  uid?: string;
  created_at: number;
  payload: DataCollectPayload;
  metadata?: DataCollectRecordMeta;
} | null> {
  const db = await DbUtils.getInstance();
  const row = (await db.selectOne(
    'SELECT id, uid, created_at, payload, metadata FROM data_collect_records WHERE uid = $1 LIMIT 1',
    [uid],
  )) as {
    id: number;
    uid: string | null;
    created_at: number;
    payload: string;
    metadata: string | null;
  } | null;
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid || undefined,
    created_at: row.created_at,
    payload: JSON.parse(row.payload) as DataCollectPayload,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

export async function insertOrUpdateByUid(
  uid: string,
  payload: DataCollectPayload,
  metadata?: DataCollectRecordMeta,
): Promise<{
  success: boolean;
  affectedRows: number;
  action: 'insert' | 'update';
  id?: number;
  error?: string;
}> {
  const check = validateUid(uid);
  if (!check.valid)
    return {
      success: false,
      affectedRows: 0,
      action: 'insert',
      error: check.message,
    };
  const db = await DbUtils.getInstance();
  const now = Date.now();
  const payloadJson = JSON.stringify(payload ?? {});
  const metaJson = JSON.stringify(metadata ?? {});
  const existing = await db.selectOne<{ id: number }>(
    'SELECT id FROM data_collect_records WHERE uid = $1 LIMIT 1',
    [uid],
  );
  if (existing?.id) {
    const res = await db.execute(
      'UPDATE data_collect_records SET payload = $2, metadata = $3, created_at = $4 WHERE uid = $1',
      [uid, payloadJson, metaJson, now],
    );
    return {
      success: true,
      affectedRows: res.rowsAffected ?? 0,
      action: 'update',
      id: existing.id,
    };
  } else {
    await db.execute(
      'INSERT INTO data_collect_records (uid, created_at, payload, metadata) VALUES ($1, $2, $3, $4)',
      [uid, now, payloadJson, metaJson],
    );
    const row = await db.selectOne<{ id: number }>(
      'SELECT last_insert_rowid() AS id',
      [],
    );
    return { success: true, affectedRows: 1, action: 'insert', id: row?.id };
  }
}

export async function truncateDataCollectDatabase(): Promise<void> {
  const db = await DbUtils.getInstance();
  await db.truncateDatabase();
}

export async function countDataCollectRecords(): Promise<number> {
  const db = await DbUtils.getInstance();
  const row = await db.selectOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM data_collect_records',
    [],
  );
  return Number(row?.count ?? 0);
}
