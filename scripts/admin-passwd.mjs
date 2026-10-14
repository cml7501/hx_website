// 设置/修改后台管理密码：npm run admin-passwd -- 你的密码
// 密码以 scrypt 加盐散列存入 admin/config.json，明文不落盘
import { scryptSync, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = path.join(ROOT, 'admin', 'config.json');

const pwd = process.argv[2] || '';
if (pwd.length < 8) {
  console.log('用法：npm run admin-passwd -- 你的密码（至少 8 位，建议含字母、数字和符号）');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(pwd, salt, 64).toString('hex');

let cfg = {};
try { cfg = JSON.parse(await readFile(CONFIG_FILE, 'utf8')); } catch { /* 首次创建 */ }
cfg.passwordHash = `${salt}:${hash}`;
if (!cfg.host) cfg.host = '127.0.0.1';
if (!cfg.port) cfg.port = 4173;
if (!cfg.sessionHours) cfg.sessionHours = 12;

await writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
console.log('✔ 管理密码已更新（admin/config.json，仅存散列）。');
console.log('  本机生效：重启后台服务 npm run admin');
console.log('  远程访问：把 config.json 的 "host" 改为 "0.0.0.0" 后重启。');
