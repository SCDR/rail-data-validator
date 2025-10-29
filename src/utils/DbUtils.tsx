import Database from '@tauri-apps/plugin-sql';

/**
 * SQLite 工具类，基于 @tauri-apps/plugin-sql
 * 默认连接字符串：`sqlite:data-validation.db`（相对 Tauri BaseDirectory.App）
 * 提供：连接、查询、执行、事务、关闭等基础方法
 */

export type SqlParam = string | number | boolean | null | bigint;
export type SqlParams = readonly SqlParam[];

export type ExecResult = {
  rowsAffected: number;
  lastInsertId?: number;
};

const DEFAULT_CONN_STR = 'sqlite:data-validation.db';

export class DbUtils {
  private static instance: DbUtils | null = null;
  private db: any | null = null; // Database instance
  private connectPromise: Promise<any> | null = null;
  private readonly connStr: string;

  private constructor(connStr: string) {
    this.connStr = connStr.startsWith('sqlite:')
      ? connStr
      : `sqlite:${connStr}`;
  }

  /**
   * 获取（或创建）单例并建立连接
   */
  static async getInstance(
    connStr: string = DEFAULT_CONN_STR,
  ): Promise<DbUtils> {
    if (!DbUtils.instance) {
      DbUtils.instance = new DbUtils(connStr);
    }
    await DbUtils.instance.ensureConnected();
    return DbUtils.instance;
  }

  /**
   * 返回一个未连接的实例（需要手动调用 ensureConnected）
   */
  static getLazy(connStr: string = DEFAULT_CONN_STR): DbUtils {
    if (!DbUtils.instance) {
      DbUtils.instance = new DbUtils(connStr);
    }
    return DbUtils.instance;
  }

  /**
   * 建立数据库连接（幂等）
   */
  private async ensureConnected(): Promise<void> {
    if (this.db) return;
    if (!this.connectPromise) {
      // 使用 load 立即建立连接；也会应用已注册的迁移
      this.connectPromise = Database.load(this.connStr);
    }
    this.db = await this.connectPromise;
  }

  /**
   * 执行 SELECT 查询并返回对象数组
   */
  async select<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): Promise<T[]> {
    await this.ensureConnected();
    try {
      const rows = (await this.db.select(sql, params ?? [])) as T[];
      return rows ?? [];
    } catch (e) {
      throw new Error(this.formatError('select', sql, params, e));
    }
  }

  /**
   * 执行单行查询，若无结果返回 null
   */
  async selectOne<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): Promise<T | null> {
    const rows = await this.select<T>(sql, params);
    return rows.length ? rows[0] : null;
  }

  /**
   * 执行查询并返回第一行第一列的值（常用于 COUNT、SUM 等）
   */
  async selectValue<T = unknown>(
    sql: string,
    params?: SqlParams,
  ): Promise<T | null> {
    const row = await this.selectOne<Record<string, T>>(sql, params);
    if (!row) return null;
    const firstKey = Object.keys(row)[0];
    return firstKey ? (row[firstKey] as T) : null;
  }

  /**
   * 执行 INSERT/UPDATE/DELETE/DDL（CREATE TABLE 等），返回受影响行数与 lastInsertId
   */
  async execute(sql: string, params?: SqlParams): Promise<ExecResult> {
    await this.ensureConnected();
    try {
      const res = await this.db.execute(sql, params ?? []);
      // 兼容返回结构
      return {
        rowsAffected: Number(res?.rowsAffected ?? 0),
        lastInsertId:
          typeof res?.lastInsertId === 'bigint'
            ? Number(res.lastInsertId)
            : res?.lastInsertId,
      };
    } catch (e) {
      throw new Error(this.formatError('execute', sql, params, e));
    }
  }

  /**
   * 事务封装：自动 BEGIN/COMMIT/ROLLBACK
   * 注意：请在回调中仅使用当前实例的 execute/select 方法
   */
  async transaction<T>(fn: (db: DbUtils) => Promise<T>): Promise<T> {
    await this.ensureConnected();
    await this.execute('BEGIN TRANSACTION');
    try {
      const result = await fn(this);
      await this.execute('COMMIT');
      return result;
    } catch (err) {
      await this.execute('ROLLBACK');
      throw err;
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<boolean> {
    if (!this.db) return true;
    try {
      const ok = await this.db.close();
      this.db = null;
      this.connectPromise = null;
      return !!ok;
    } catch (e) {
      // 关闭失败一般不阻塞主流程
      console.warn('[DbUtils] close error:', e);
      return false;
    }
  }

  /**
   * 运行简单的“迁移”（前端侧执行 CREATE TABLE IF NOT EXISTS 等）
   * 若需要更完整的迁移，请在 Rust 侧通过 Builder.add_migrations 配置
   */
  async runMigrations(sqlList: string[]): Promise<void> {
    for (const sql of sqlList) {
      await this.execute(sql);
    }
  }

  /**
   * 创建表（IF NOT EXISTS）
   */
  async ensureTable(tableSql: string): Promise<void> {
    await this.execute(tableSql);
  }

  async truncateDatabase(): Promise<void> {
    await this.ensureConnected();
    console.info('[DbUtils] truncateDatabase: start');
    try {
      // Disable FK to avoid constraint errors while clearing
      await this.execute('PRAGMA foreign_keys = OFF');

      // Collect all non-system tables
      const tables = await this.select<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      );

      // Clear tables and reset autoincrement sequence inside a transaction
      await this.transaction(async (db) => {
        for (const t of tables) {
          await db.execute(`DELETE FROM "${t.name}"`);
        }
        // Reset autoincrement counters
        await db.execute('DELETE FROM sqlite_sequence');
      });

      // Re-enable FK
      await this.execute('PRAGMA foreign_keys = ON');

      // Vacuum outside of transaction (SQLite requirement)
      try {
        await this.execute('VACUUM');
      } catch (vacErr) {
        console.warn('[DbUtils] VACUUM failed (non-critical):', vacErr);
      }

      console.info(
        '[DbUtils] truncateDatabase: success, cleared tables:',
        tables.map((t) => t.name),
      );
    } catch (e) {
      console.error('[DbUtils] truncateDatabase: failed:', e);
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  private formatError(
    kind: 'select' | 'execute',
    sql: string,
    params: SqlParams | undefined,
    e: unknown,
  ): string {
    const msg = e instanceof Error ? e.message : String(e);
    return `[DbUtils:${kind}] SQL failed: ${msg}\nSQL: ${sql}\nParams: ${JSON.stringify(params ?? [])}`;
  }
}

/**
 * 默认导出一个懒加载单例，按需可覆盖连接字符串：
 * const db = await DbUtils.getInstance('sqlite:custom.db')
 */
export const dbUtils = DbUtils.getLazy(DEFAULT_CONN_STR);
