import { DbUtils, type ExecResult } from '@/utils/DbUtils';
import bcrypt from 'bcryptjs';

// 本地认证与权限数据处理
// - SQLite 持久化（@tauri-apps/plugin-sql）
// - bcryptjs 加密
// - 基础防暴力破解：失败次数与锁定时间

export type Role = 'admin' | 'user';

export type LocalUser = {
  id: number;
  username: string;
  role: Role;
  created_at: number; // epoch ms
  failed_count: number;
  last_failed_at: number | null;
  lock_until: number | null;
  totp_secret: string | null;
  agreement_accepted_at?: number | null;
  privacy_accepted_at?: number | null;
};

const SALT_ROUNDS = 10;
const MAX_FAILED = 5;
const LOCK_MINUTES = 1;

const STORAGE_KEY = 'auth.currentUser';

// -----------------------------
// Base32 (RFC4648) 编码/解码工具
// -----------------------------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function sanitizeBase32(input: string): string {
  return input.toUpperCase().replace(/[^A-Z2-7]/g, '');
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output; // 不使用 '=' 填充
}

function base32Decode(str: string): Uint8Array {
  const s = sanitizeBase32(str);
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(s[i]);
    if (idx === -1) throw new Error('Invalid Base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export const ADMIN_PLAIN_SECRET = 'xeGfig-tynpem-2nywho';
export const ADMIN_BASE32_SECRET = base32Encode(
  new TextEncoder().encode(ADMIN_PLAIN_SECRET),
);

export async function initAuthSchema(): Promise<void> {
  const db = await DbUtils.getInstance();
  await db.runMigrations([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','user')),
      failed_count INTEGER NOT NULL DEFAULT 0,
      last_failed_at INTEGER,
      lock_until INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS consent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('agreement','privacy','both')),
      accepted_at INTEGER NOT NULL,
      device_info TEXT
    )`,
  ]);

  // 尝试为已有表增加 TOTP 密钥列（若已存在则忽略错误）
  try {
    await db.execute('ALTER TABLE users ADD COLUMN totp_secret TEXT');
  } catch (_e) {
    // duplicate column name 等错误可忽略
  }

  // 为用户协议与隐私政策同意时间增加列（若已存在则忽略错误）
  try {
    await db.execute(
      'ALTER TABLE users ADD COLUMN agreement_accepted_at INTEGER',
    );
  } catch (_e) {}
  try {
    await db.execute(
      'ALTER TABLE users ADD COLUMN privacy_accepted_at INTEGER',
    );
  } catch (_e) {}

  // 确保内置管理员存在（使用 TOTP 登录，不参与注册流程）
  const adminExists = await db.selectOne<{ id: number }>(
    'SELECT id FROM users WHERE username = "admin"',
  );
  if (!adminExists) {
    const now = Date.now();
    const secretB32 = ADMIN_BASE32_SECRET;
    await db.execute(
      'INSERT INTO users (username, password_hash, role, failed_count, last_failed_at, lock_until, created_at, totp_secret) VALUES ("admin", ?, "admin", 0, NULL, NULL, ?, ?)',
      ['!', now, secretB32],
    );
  } else {
    // 迁移：若管理员密钥不是 Base32 格式，则统一更新为 Base32
    const adminRow = await db.selectOne<{
      id: number;
      totp_secret: string | null;
    }>('SELECT id, totp_secret FROM users WHERE username = "admin"');
    if (adminRow) {
      const s = adminRow.totp_secret ?? '';
      // 判断：若为旧的明文密钥，或不符合 Base32 字符集（A-Z2-7），则更新为 Base32
      const isOldPlain = s === ADMIN_PLAIN_SECRET;
      const isValidBase32 = /^[A-Z2-7]+$/.test(s);
      const needsUpdate =
        isOldPlain || !isValidBase32 || s !== ADMIN_BASE32_SECRET;
      if (needsUpdate) {
        await db.execute('UPDATE users SET totp_secret = ? WHERE id = ?', [
          ADMIN_BASE32_SECRET,
          adminRow.id,
        ]);
      }
    }
  }
}

export async function getUserByUsername(
  username: string,
): Promise<LocalUser | null> {
  const db = await DbUtils.getInstance();
  const row = await db.selectOne<LocalUser & { password_hash?: string }>(
    'SELECT id, username, role, created_at, failed_count, last_failed_at, lock_until, totp_secret FROM users WHERE username = ?',
    [username],
  );
  return row ?? null;
}

export async function getAdminCount(): Promise<number> {
  const db = await DbUtils.getInstance();
  const val = await db.selectValue<number>(
    'SELECT COUNT(1) as cnt FROM users WHERE role = "admin"',
  );
  return Number(val ?? 0);
}

export async function registerUser(
  username: string,
  password: string,
  role: Role = 'user',
  accepted?: { agreement: boolean; privacy: boolean; acceptedAt?: number },
): Promise<LocalUser> {
  await initAuthSchema();
  const existing = await getUserByUsername(username);
  if (existing) {
    throw new Error('用户名已存在');
  }

  // 管理员不通过注册流程创建，强制用户注册为普通用户
  role = 'user';

  // 使用同步哈希，避免浏览器环境下 Promise/回调差异导致的类型与运行时问题
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const now = Date.now();
  const consentAt = accepted?.acceptedAt ?? now;
  const agreeAt = accepted?.agreement ? consentAt : null;
  const privacyAt = accepted?.privacy ? consentAt : null;
  const db = await DbUtils.getInstance();
  const res: ExecResult = await db.execute(
    'INSERT INTO users (username, password_hash, role, failed_count, last_failed_at, lock_until, created_at, totp_secret, agreement_accepted_at, privacy_accepted_at) VALUES (?, ?, ?, 0, NULL, NULL, ?, NULL, ?, ?)',
    [username, hash, role, now, agreeAt, privacyAt],
  );

  const id = Number(res.lastInsertId);
  return {
    id,
    username,
    role,
    created_at: now,
    failed_count: 0,
    last_failed_at: null,
    lock_until: null,
    totp_secret: null,
    agreement_accepted_at: agreeAt,
    privacy_accepted_at: privacyAt,
  };
}

export type LoginResult =
  | { ok: true; user: LocalUser }
  | { ok: false; message: string; lockedUntil?: number };

export async function validateLogin(
  username: string,
  password: string,
  accepted?: { agreement: boolean; privacy: boolean; acceptedAt?: number },
): Promise<LoginResult> {
  await initAuthSchema();
  const db = await DbUtils.getInstance();
  const row = await db.selectOne<LocalUser & { password_hash: string }>(
    'SELECT id, username, role, created_at, failed_count, last_failed_at, lock_until, password_hash, totp_secret FROM users WHERE username = ?',
    [username],
  );

  if (!row) {
    return { ok: false, message: '用户不存在' };
  }

  const now = Date.now();
  const consentAt = accepted?.acceptedAt ?? now;

  // 用户在登录前必须同意用户协议与隐私政策
  if (!accepted?.agreement || !accepted?.privacy) {
    return { ok: false, message: '请阅读并同意用户协议和隐私政策' };
  }

  // 管理员使用 TOTP 一次性验证码登录（允许在锁定期间验证成功后解锁）
  if (row.username === 'admin') {
    const secretB32 = row.totp_secret || ADMIN_BASE32_SECRET;
    const ok = await verifyTOTP(secretB32, String(password));
    if (ok) {
      await db.execute(
        'UPDATE users SET failed_count = 0, last_failed_at = NULL, lock_until = NULL, agreement_accepted_at = ?, privacy_accepted_at = ? WHERE id = ?',
        [consentAt, consentAt, row.id],
      );
      const user: LocalUser = {
        id: row.id,
        username: row.username,
        role: row.role as Role,
        created_at: row.created_at,
        failed_count: 0,
        last_failed_at: null,
        lock_until: null,
        totp_secret: secretB32,
        agreement_accepted_at: consentAt,
        privacy_accepted_at: consentAt,
      };
      return { ok: true, user };
    }

    // 失败：计数 +1，达到上限则锁定
    const failed = (Number(row.failed_count) || 0) + 1;
    let lockUntil: number | null = null;
    if (failed >= MAX_FAILED) {
      lockUntil = now + LOCK_MINUTES * 60 * 1000;
    }
    await db.execute(
      'UPDATE users SET failed_count = ?, last_failed_at = ?, lock_until = ? WHERE id = ?',
      [failed, now, lockUntil, row.id],
    );
    return {
      ok: false,
      message: '一次性验证码错误',
      lockedUntil: lockUntil ?? undefined,
    };
  }

  // 非管理员：若锁定未过期则直接拒绝
  if (row.lock_until && now < row.lock_until) {
    return {
      ok: false,
      message: '账户已锁定，请稍后再试',
      lockedUntil: row.lock_until,
    };
  }

  // 普通用户：密码哈希比对
  const match = bcrypt.compareSync(password, row.password_hash);
  if (match) {
    // 成功：重置失败计数与锁定，并记录最新同意时间
    await db.execute(
      'UPDATE users SET failed_count = 0, last_failed_at = NULL, lock_until = NULL, agreement_accepted_at = ?, privacy_accepted_at = ? WHERE id = ?',
      [consentAt, consentAt, row.id],
    );
    const user: LocalUser = {
      id: row.id,
      username: row.username,
      role: row.role as Role,
      created_at: row.created_at,
      failed_count: 0,
      last_failed_at: null,
      lock_until: null,
      totp_secret: row.totp_secret ?? null,
      agreement_accepted_at: consentAt,
      privacy_accepted_at: consentAt,
    };
    return { ok: true, user };
  }

  // 失败：计数 +1，达到上限则锁定
  const failed = (Number(row.failed_count) || 0) + 1;
  let lockUntil: number | null = null;
  if (failed >= MAX_FAILED) {
    lockUntil = now + LOCK_MINUTES * 60 * 1000;
  }
  await db.execute(
    'UPDATE users SET failed_count = ?, last_failed_at = ?, lock_until = ? WHERE id = ?',
    [failed, now, lockUntil, row.id],
  );

  return {
    ok: false,
    message:
      failed >= MAX_FAILED
        ? `失败次数过多，账户已锁定 ${LOCK_MINUTES} 分钟`
        : '密码错误',
    lockedUntil: lockUntil ?? undefined,
  };
}

/**
 * 记录用户同意事件（包含设备信息）。
 * - 若用户已存在，则写入 user_id；否则仅记录用户名。
 */
export async function createConsentEvent(args: {
  username: string;
  type: 'agreement' | 'privacy' | 'both';
  acceptedAt: number;
  deviceInfo?: Record<string, unknown>;
}): Promise<void> {
  await initAuthSchema();
  const db = await DbUtils.getInstance();
  let userId: number | null = null;
  try {
    const existing = await getUserByUsername(args.username);
    userId = existing?.id ?? null;
  } catch {}
  const payload = args.deviceInfo ? JSON.stringify(args.deviceInfo) : null;
  await db.execute(
    'INSERT INTO consent_events (user_id, username, type, accepted_at, device_info) VALUES (?, ?, ?, ?, ?)',
    [userId, args.username, args.type, args.acceptedAt, payload],
  );
}

// -----------------------------
// TOTP 验证（HMAC-SHA1，默认 30s 周期，6 位）
// -----------------------------
function toBigEndian8(step: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  // 仅使用低 8 字节计数
  const high = Math.floor(step / 0x100000000);
  const low = step >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buffer);
}

async function hmacSha1(
  keyBytes: Uint8Array,
  msgBytes: Uint8Array,
): Promise<Uint8Array> {
  // 将 Uint8Array 严格转换为 ArrayBuffer，避免 BufferSource 类型不兼容报错
  const toArrayBuffer = (u8: Uint8Array): ArrayBuffer => {
    const ab = new ArrayBuffer(u8.byteLength);
    new Uint8Array(ab).set(u8);
    return ab;
  };

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    toArrayBuffer(msgBytes),
  );
  return new Uint8Array(sig);
}

export async function generateTOTP(
  secretBase32: string,
  period = 30,
  digits = 6,
): Promise<string> {
  const step = Math.floor(Date.now() / 1000 / period);
  const msg = toBigEndian8(step);
  const keyBytes = base32Decode(secretBase32);
  const hmac = await hmacSha1(keyBytes, msg);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  const code = (bin % mod).toString().padStart(digits, '0');
  return code;
}

export async function verifyTOTP(
  secretBase32: string,
  code: string,
  period = 30,
  digits = 6,
  window = 1,
): Promise<boolean> {
  // 支持时间窗口容忍（默认 ±1 个周期）
  const nowStep = Math.floor(Date.now() / 1000 / period);
  let keyBytes: Uint8Array;
  try {
    keyBytes = base32Decode(secretBase32);
  } catch {
    return false;
  }
  for (let w = -window; w <= window; w++) {
    const step = nowStep + w;
    const msg = toBigEndian8(step);
    const hmac = await hmacSha1(keyBytes, msg);
    const offset = hmac[hmac.length - 1] & 0x0f;
    const bin =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const mod = 10 ** digits;
    const expect = (bin % mod).toString().padStart(digits, '0');
    if (expect === String(code)) return true;
  }
  return false;
}

export function mapRoleToPermissions(role: Role): string[] {
  if (role === 'admin') {
    return [
      'admin',
      'data:collect',
      'data:validate',
      'data:history',
      'data:output',
    ];
  }
  return ['data:collect', 'data:validate', 'data:history', 'data:output'];
}

export type CurrentUser = {
  name: string;
  access: Role; // 兼容 Ant Design Pro access 字段
  userid: string;
  permissions: string[];
};

export function setCurrentUser(user: LocalUser): void {
  const cu: CurrentUser = {
    name: user.username,
    access: user.role,
    userid: `user-${user.id}`,
    permissions: mapRoleToPermissions(user.role),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cu));
  } catch {}
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
