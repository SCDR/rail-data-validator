import type { DataCollectPayload, DataCollectRecordMeta } from './dbHandler';
import {
  setupDataCollectDB,
  createDataCollectRecord,
  listDataCollectRecords,
  getDataCollectRecordById,
  deleteDataCollectRecord,
  saveAllDataCollect,
  getStraightGaugeFromDb,
  getStraightHorizontalFromDb,
  getCurvedGaugeFromDb,
  getCurvedHorizontalFromDb,
  getOffsetDataFromDb,
  getStraightReducedValueFromDb,
  getCurvedReducedValueFromDb,
  getStraightGuardRailFlangeGrooveFromDb,
  getCurvedGuardRailFlangeGrooveFromDb,
  getOtherDataFromDb,
  getStepStatusFromDb,
} from './dbHandler';

// Mock DbUtils to avoid real Tauri plugin dependency and provide in-memory storage
jest.mock('../../utils/DbUtils', () => {
  type RecordRow = {
    id: number;
    created_at: number;
    payload: string;
    metadata: string | null;
  };
  const state = {
    records: [] as RecordRow[],
    kv: new Map<string, { value: string; updated_at: number }>(),
    lastInsertId: 0,
    ensureTableCalls: [] as string[],
  };

  const fakeDb = {
    ensureTable: async (sql: string) => {
      state.ensureTableCalls.push(sql);
      return { rowsAffected: 0 };
    },
    execute: async (sql: string, params: any[]) => {
      if (sql.startsWith('INSERT INTO data_collect_records')) {
        state.lastInsertId += 1;
        const [created_at, payload, metadata] = params as [
          number,
          string,
          string | null,
        ];
        state.records.push({
          id: state.lastInsertId,
          created_at,
          payload,
          metadata,
        });
        return { rowsAffected: 1 };
      }
      if (sql.startsWith('DELETE FROM data_collect_records')) {
        const [id] = params as [number];
        const before = state.records.length;
        state.records = state.records.filter((r) => r.id !== id);
        return { rowsAffected: before - state.records.length };
      }
      if (sql.startsWith('INSERT OR REPLACE INTO kv_store')) {
        const [key, value, updated_at] = params as [string, string, number];
        state.kv.set(key, { value, updated_at });
        return { rowsAffected: 1 };
      }
      return { rowsAffected: 0 };
    },
    select: async (sql: string, params: any[]) => {
      if (
        sql.startsWith(
          'SELECT id, created_at, metadata FROM data_collect_records',
        )
      ) {
        const [limit, offset] = params as [number, number];
        const sorted = [...state.records].sort((a, b) => b.id - a.id);
        const slice = sorted.slice(offset || 0, (offset || 0) + (limit || 50));
        return slice.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          metadata: r.metadata,
        }));
      }
      return [];
    },
    selectOne: async (sql: string, params: any[]) => {
      if (sql.startsWith('SELECT last_insert_rowid()')) {
        return { id: state.lastInsertId };
      }
      if (
        sql.startsWith(
          'SELECT id, created_at, payload, metadata FROM data_collect_records WHERE id = $1',
        )
      ) {
        const [id] = params as [number];
        const r = state.records.find((rr) => rr.id === id);
        return r
          ? {
              id: r.id,
              created_at: r.created_at,
              payload: r.payload,
              metadata: r.metadata,
            }
          : null;
      }
      if (sql.startsWith('SELECT value FROM kv_store WHERE key = $1')) {
        const [key] = params as [string];
        const v = state.kv.get(key);
        return v ? { value: v.value } : null;
      }
      return null;
    },
    transaction: async (fn: (t?: any) => Promise<void>) => {
      await fn();
      return { rowsAffected: 0 };
    },
    close: async () => {},
  };

  return {
    DbUtils: {
      getInstance: jest.fn(async () => fakeDb),
    },
    __mockDbState: state,
  };
});

// Build sample payload and metadata
const samplePayload: DataCollectPayload = {
  straightGauge: { a: 1 },
  straightHorizontal: { b: 2 },
  curvedGauge: { c: 3 },
  curvedHorizontal: { d: 4 },
  offset: { e: 5 },
  straightReduced: { f: 6 },
  curvedReduced: { g: 7 },
  straightGuard: { h: 8 },
  curvedGuard: { i: 9 },
  other: { memo: 'hello' },
  stepStatus: ['process', 'finish'],
};

const sampleMeta: DataCollectRecordMeta = {
  operator: '张三',
  project: '线路A',
  deviceId: 'DEV-001',
  note: '单元测试',
};

describe('dataCollect record persistence', () => {
  beforeEach(async () => {
    // Ensure tables exist; clear records by deleting any existing
    await setupDataCollectDB();
    const list = await listDataCollectRecords(1000, 0);
    for (const r of list) {
      await deleteDataCollectRecord(r.id);
    }
  });

  test('createDataCollectRecord and getDataCollectRecordById', async () => {
    const id = await createDataCollectRecord(samplePayload, sampleMeta);
    expect(id).toBeGreaterThan(0);
    const detail = await getDataCollectRecordById(id);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(id);
    expect(detail?.payload).toEqual(samplePayload);
    expect(detail?.metadata).toEqual(sampleMeta);
    expect(detail?.created_at).toBeGreaterThan(0);
  });

  test('listDataCollectRecords returns summary with parsed metadata', async () => {
    const id1 = await createDataCollectRecord(samplePayload, sampleMeta);
    const id2 = await createDataCollectRecord(samplePayload, {
      operator: '李四',
    });
    const list = await listDataCollectRecords(10, 0);
    expect(list.length).toBeGreaterThanOrEqual(2);
    // Desc order by id, so the first should be id2
    expect(list[0].id).toBe(id2);
    expect(list[0].metadata?.operator).toBe('李四');
    expect(list[1].id).toBe(id1);
    expect(list[1].metadata?.operator).toBe('张三');
  });

  test('deleteDataCollectRecord removes record', async () => {
    const id = await createDataCollectRecord(samplePayload, sampleMeta);
    let detail = await getDataCollectRecordById(id);
    expect(detail).not.toBeNull();
    await deleteDataCollectRecord(id);
    detail = await getDataCollectRecordById(id);
    expect(detail).toBeNull();
  });

  test('saveAllDataCollect writes snapshot record and updates kv store', async () => {
    const before = await listDataCollectRecords(10, 0);
    await saveAllDataCollect(samplePayload, sampleMeta);
    const after = await listDataCollectRecords(10, 0);
    expect(after.length).toBe(before.length + 1);

    // Verify KV entries updated and parsable
    const sg = await getStraightGaugeFromDb();
    const sh = await getStraightHorizontalFromDb();
    const cg = await getCurvedGaugeFromDb();
    const ch = await getCurvedHorizontalFromDb();
    const off = await getOffsetDataFromDb();
    const sr = await getStraightReducedValueFromDb();
    const cr = await getCurvedReducedValueFromDb();
    const sgr = await getStraightGuardRailFlangeGrooveFromDb();
    const cgr = await getCurvedGuardRailFlangeGrooveFromDb();
    const other = await getOtherDataFromDb();
    const status = await getStepStatusFromDb();

    expect(JSON.parse(sg!)).toEqual(samplePayload.straightGauge);
    expect(JSON.parse(sh!)).toEqual(samplePayload.straightHorizontal);
    expect(JSON.parse(cg!)).toEqual(samplePayload.curvedGauge);
    expect(JSON.parse(ch!)).toEqual(samplePayload.curvedHorizontal);
    expect(JSON.parse(off!)).toEqual(samplePayload.offset);
    expect(JSON.parse(sr!)).toEqual(samplePayload.straightReduced);
    expect(JSON.parse(cr!)).toEqual(samplePayload.curvedReduced);
    expect(JSON.parse(sgr!)).toEqual(samplePayload.straightGuard);
    expect(JSON.parse(cgr!)).toEqual(samplePayload.curvedGuard);
    expect(JSON.parse(other!)).toEqual(samplePayload.other);
    expect(JSON.parse(status!)).toEqual(samplePayload.stepStatus);
  });
});
