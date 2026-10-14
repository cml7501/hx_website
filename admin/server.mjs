// 恒星官网 · 内容管理服务（供非技术同事在本地或远程通过浏览器维护网站内容）
// 启动：npm run admin  →  浏览器打开 http://127.0.0.1:4173
// 远程访问：先 npm run admin-passwd -- 你的密码 设置管理密码，
//          再把 admin/config.json 的 host 改为 "0.0.0.0" 并重启，即可用 http://服务器IP:4173 访问
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = path.join(ROOT, 'admin', 'config.json');

// ---------- 配置（admin/config.json，可省略） ----------
let cfg = {};
try { cfg = JSON.parse(await readFile(CONFIG_FILE, 'utf8')); } catch { /* 无配置文件按默认值运行 */ }
const PORT = Number(cfg.port) || 4173;
let HOST = cfg.host || '127.0.0.1';
const PASSWORD_HASH = typeof cfg.passwordHash === 'string' ? cfg.passwordHash : null;
const SESSION_HOURS = Number(cfg.sessionHours) || 12;
// 未设置管理密码时强制仅本机访问，避免无鉴权的后台暴露到网络
if (!PASSWORD_HASH && HOST !== '127.0.0.1' && HOST !== 'localhost') {
  console.log('⚠ 尚未设置管理密码，为安全起见已回退为仅本机访问（127.0.0.1）。');
  console.log('  开启远程访问：npm run admin-passwd -- 你的密码，然后把 admin/config.json 的 host 改为 "0.0.0.0"，重启本服务。');
  HOST = '127.0.0.1';
}

// ---------- 会话与登录限速（内存态，重启即全部失效） ----------
const sessions = new Map(); // token → 过期时间戳
const loginFails = new Map(); // ip → { count, until }
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;

const cookieOf = (req) => Object.fromEntries(
  (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim().split('=').map(decodeURIComponent))
    .filter((a) => a.length === 2),
);
const isAuthed = (req) => {
  const token = cookieOf(req).hx_admin;
  const exp = token && sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(token); return false; }
  return true;
};
const verifyPassword = (pwd) => {
  if (!PASSWORD_HASH || typeof pwd !== 'string') return false;
  const [salt, hex] = PASSWORD_HASH.split(':');
  try {
    return timingSafeEqual(Buffer.from(hex, 'hex'), scryptSync(pwd, salt, 64));
  } catch { return false; }
};
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

const INQUIRIES = path.join(ROOT, 'admin', 'inquiries.json');
const PUBLIC_REPLIES = path.join(ROOT, 'src', 'data', 'replies.json'); // 网站留言板数据（构建时读取，仅含公开回复的安全字段）
const UPLOAD_DIR = path.join(ROOT, 'public', 'assets', 'img', 'news');
const ASSETS_ROOT = path.join(ROOT, 'public', 'assets');
const IMG_EXT = /\.(jpe?g|png|webp|gif|svg)$/i;
const IMG_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const EDITABLE = {
  news: 'src/data/news.json',
  products: 'src/data/products.json',
};

const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
const readBody = (req) =>
  new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => {
      buf += c;
      if (buf.length > 5e6) req.destroy(), reject(new Error('body too large'));
    });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });

function validateNews(list) {
  if (!Array.isArray(list)) return 'news 应为数组';
  const seen = new Set();
  for (const n of list) {
    if (!/^[a-z0-9-]+$/.test(n.slug || '')) return `slug 不合法：${n.slug}（仅小写字母/数字/连字符）`;
    if (seen.has(n.slug)) return `slug 重复：${n.slug}`;
    seen.add(n.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date || '')) return `${n.slug} 日期格式应为 YYYY-MM-DD`;
    if (!(n.title?.zh || '').trim()) return `${n.slug} 缺少中文标题`;
    if (!(n.thumb || '').startsWith('/assets/')) return `${n.slug} 缩略图路径应以 /assets/ 开头`;
    if (!Array.isArray(n.body?.zh) || n.body.zh.length === 0) return `${n.slug} 缺少中文正文`;
    n.body.en = Array.isArray(n.body.en) && n.body.en.length ? n.body.en : n.body.zh; // 英文缺省回退中文
    n.summary = n.summary || { zh: n.body.zh[0].slice(0, 80), en: (n.body.en?.[0] || n.body.zh[0]).slice(0, 160) };
    n.cat = n.cat || 'company';
  }
  return null;
}

function validateProducts(data) {
  if (!Array.isArray(data?.products) || !Array.isArray(data?.categories)) return 'products 结构不完整';
  const seen = new Set();
  for (const c of data.categories) {
    if (!/^[a-z0-9-]+$/.test(c?.id || '')) return `分类 id 不合法：${c?.id}（仅小写字母/数字/连字符）`;
    if (!(c?.name?.zh || '').trim()) return `分类 ${c?.id} 缺少中文名称`;
  }
  const catIds = new Set(data.categories.map((c) => c?.id));
  for (const p of data.products) {
    if (!/^[a-z0-9-]+$/.test(p.slug || '')) return `产品 slug 不合法：${p.slug}`;
    if (seen.has(p.slug)) return `产品 slug 重复：${p.slug}`;
    seen.add(p.slug);
    if (!(p.model || '').trim()) return `${p.slug} 缺少型号`;
    if (!(p.name?.zh || '').trim()) return `${p.slug} 缺少中文名称`;
    if (!Array.isArray(p.features?.zh)) return `${p.slug} 缺少产品特点`;
    if (!(p.image || '').startsWith('/assets/')) return `${p.slug} 缺少产品图片`;
    if (!catIds.has(p.category)) return `${p.slug} 的分类「${p.category}」不存在`;
  }
  return null;
}

// ---------- 询价记录：加载/规范化/保存/公开留言导出 ----------
const loadInquiryList = async () => {
  let list = [];
  if (existsSync(INQUIRIES)) {
    try { list = JSON.parse(await readFile(INQUIRIES, 'utf8')); } catch { list = []; }
  }
  return Array.isArray(list) ? list : [];
};
const normIds = (list) => list.filter(Boolean).map((r) => (r.id ? r : { ...r, id: randomBytes(8).toString('hex') }));
async function saveInquiries(list) { await writeFile(INQUIRIES, JSON.stringify(list, null, 2) + '\n', 'utf8'); }
// 导出公开留言到 src/data/replies.json：只输出姓名/日期/留言/回复四个安全字段，绝不包含电话、邮箱、单位
async function writePublicReplies(list) {
  const pub = list
    .filter((r) => r && r.public && (r.reply || '').trim())
    .map((r) => ({
      name: String(r.name || '匿名').slice(0, 40),
      date: String(r.receivedAt || '').slice(0, 10),
      message: String(r.message || '').slice(0, 500),
      reply: String(r.reply).trim().slice(0, 2000),
    }));
  const out = JSON.stringify(pub, null, 2) + '\n';
  let prev = null;
  try { prev = await readFile(PUBLIC_REPLIES, 'utf8'); } catch { /* 首次生成 */ }
  if (prev === out) return false;
  await writeFile(PUBLIC_REPLIES, out, 'utf8');
  return true;
}

let building = false;
function startBuild() {
  // 返回 Promise<{ok, log, busy}>；同一时刻只允许一个构建
  return new Promise((resolve) => {
    if (building) return resolve({ ok: false, busy: true, log: '已有构建在进行中，请稍候' });
    building = true;
    const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // shell:true 必需：Node ≥18.20.2 在 Windows 上 spawn .cmd 不加 shell 会抛 EINVAL；
    // 命令与参数均为常量，无注入风险
    const child = spawn(npmBin, ['run', 'build'], { cwd: ROOT, shell: true });
    let log = '';
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      building = false;
      resolve({ ok: code === 0, log: log.slice(-3000) });
    };
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('error', () => finish(1)); // spawn 本身失败（如 npm 不在 PATH）也必须应答并复位标志，否则后续构建全部 409
    child.on('close', finish);
  });
}
async function runBuild(res) {
  const r = await startBuild();
  if (r.busy) return json(res, 409, { ok: false, log: r.log });
  return json(res, 200, { ok: r.ok, log: r.log });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = await readFile(path.join(ROOT, 'admin', 'public', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // ---------- 鉴权：除公开端点外，所有 /api 均需登录 ----------
    const PUBLIC_API = new Set(['/api/login', '/api/logout', '/api/session', '/api/inquiry']);
    if (url.pathname.startsWith('/api/') && !PUBLIC_API.has(url.pathname) && !isAuthed(req)) {
      return json(res, 401, { ok: false, error: '未登录或会话已过期，请重新登录' });
    }

    if (req.method === 'GET' && url.pathname === '/api/session') {
      return json(res, 200, { authed: isAuthed(req), remote: HOST !== '127.0.0.1' && HOST !== 'localhost' });
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const ip = clientIp(req);
      const fail = loginFails.get(ip);
      if (fail && fail.count >= LOGIN_MAX_FAILS && Date.now() < fail.until) {
        const min = Math.ceil((fail.until - Date.now()) / 60000);
        return json(res, 429, { ok: false, error: `尝试次数过多，请 ${min} 分钟后再试` });
      }
      const body = JSON.parse(await readBody(req));
      if (!verifyPassword(String(body.password || ''))) {
        const rec = fail && Date.now() < fail.until ? fail : { count: 0, until: 0 };
        rec.count += 1;
        rec.until = Date.now() + LOGIN_LOCK_MS;
        loginFails.set(ip, rec);
        return json(res, 401, { ok: false, error: '密码不正确' });
      }
      loginFails.delete(ip);
      const token = randomBytes(32).toString('hex');
      sessions.set(token, Date.now() + SESSION_HOURS * 3600 * 1000);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `hx_admin=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`,
      });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const token = cookieOf(req).hx_admin;
      if (token) sessions.delete(token);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'hx_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === 'GET' && url.pathname === '/api/data') {
      const out = {};
      for (const [k, f] of Object.entries(EDITABLE)) out[k] = JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
      return json(res, 200, out);
    }

    if (req.method === 'PUT' && url.pathname.startsWith('/api/data/')) {
      const name = url.pathname.split('/').pop();
      if (!EDITABLE[name]) return json(res, 404, { ok: false, error: 'unknown dataset' });
      const data = JSON.parse(await readBody(req));
      const err = name === 'news' ? validateNews(data) : validateProducts(data);
      if (err) return json(res, 400, { ok: false, error: err });
      await writeFile(path.join(ROOT, EDITABLE[name]), JSON.stringify(data, null, 2) + '\n', 'utf8');
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/assets/')) {
      // 静态素材访问（限 public/assets 内，防路径穿越），供管理界面缩略图选择器预览
      const parts = url.pathname.split('/').filter(Boolean).slice(1);
      if (!parts.length || !parts.every((s) => /^[\w.-]+$/.test(decodeURIComponent(s)))) return json(res, 404, { error: 'not found' });
      const file = path.join(ASSETS_ROOT, ...parts.map((s) => decodeURIComponent(s)));
      if (!file.startsWith(ASSETS_ROOT + path.sep) || !existsSync(file) || !IMG_EXT.test(path.extname(file).toLowerCase())) return json(res, 404, { error: 'not found' });
      res.writeHead(200, { 'Content-Type': IMG_MIME[path.extname(file).toLowerCase()] });
      return res.end(await readFile(file));
    }

    if (req.method === 'GET' && url.pathname === '/api/images') {
      // 图片素材库：?type=products 为产品图（public/assets/img/products/），默认新闻缩略图
      const type = url.searchParams.get('type') === 'products' ? 'products' : 'news';
      const dir = type === 'products' ? path.join(ROOT, 'public', 'assets', 'img', 'products') : UPLOAD_DIR;
      await mkdir(dir, { recursive: true });
      const presetRe = type === 'products' ? /^(p-|cat-).*\.svg$/i : /^(news|cat)-.*\.svg$/i;
      const [uploaded, presets] = await Promise.all([
        readdir(dir).then((fs_) => fs_.filter((f) => IMG_EXT.test(f)).sort().reverse()),
        readdir(path.join(ROOT, 'public', 'assets', 'ph')).then((fs_) => fs_.filter((f) => presetRe.test(f)).sort()),
      ]);
      return json(res, 200, {
        uploaded: uploaded.map((f) => `/assets/img/${type}/${f}`),
        presets: presets.map((f) => `/assets/ph/${f}`),
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      // 上传图片：JSON { name, data(dataURL), dir('news'|'products') } → 存入对应素材目录
      const body = JSON.parse(await readBody(req));
      const dir = body.dir === 'products' ? 'products' : 'news';
      const targetDir = dir === 'products' ? path.join(ROOT, 'public', 'assets', 'img', 'products') : UPLOAD_DIR;
      const ext = path.extname(String(body.name || '')).toLowerCase();
      if (!IMG_EXT.test(ext)) return json(res, 400, { ok: false, error: '仅支持 jpg / png / webp / gif / svg 图片' });
      const m = String(body.data || '').match(/^data:image\/[a-z+.-]+;base64,(.+)$/);
      if (!m) return json(res, 400, { ok: false, error: '图片数据格式不正确' });
      const buf = Buffer.from(m[1], 'base64');
      if (buf.length < 100) return json(res, 400, { ok: false, error: '图片内容为空或已损坏' });
      if (buf.length > 5 * 1024 * 1024) return json(res, 400, { ok: false, error: '图片不能超过 5MB' });
      await mkdir(targetDir, { recursive: true });
      const base = path.basename(String(body.name || 'img'), ext).replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'img';
      const file = `${Date.now()}-${base}${ext}`;
      await writeFile(path.join(targetDir, file), buf);
      return json(res, 200, { ok: true, path: `/assets/img/${dir}/${file}` });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/thumbs') {
      // 删除后台上传的图片（/assets/img/news/ 或 /assets/img/products/），且不能正被内容引用
      const body = JSON.parse(await readBody(req));
      const p = String(body.path || '');
      const isNews = p.startsWith('/assets/img/news/');
      const isProd = p.startsWith('/assets/img/products/');
      if (!isNews && !isProd) return json(res, 400, { ok: false, error: '只能删除后台上传的图片，预设插图不可删除' });
      const file = path.basename(p);
      if (!IMG_EXT.test(path.extname(file).toLowerCase())) return json(res, 400, { ok: false, error: '路径不合法' });
      if (isProd) {
        const data = JSON.parse(await readFile(path.join(ROOT, EDITABLE.products), 'utf8'));
        const usedBy = [
          ...(data?.products || []).filter((x) => x && x.image === p).map((x) => (x.name && x.name.zh) || x.slug),
          ...(data?.categories || []).filter((c) => c && c.image === p).map((c) => (c.name && c.name.zh) || c.id),
        ];
        if (usedBy.length) return json(res, 409, { ok: false, error: `该图片正被使用（${usedBy.join('、')}），请先改用其他图片` });
      } else {
        const list = JSON.parse(await readFile(path.join(ROOT, EDITABLE.news), 'utf8'));
        const usedBy = (Array.isArray(list) ? list : []).filter((n) => n && n.thumb === p).map((n) => (n.title && n.title.zh) || n.slug);
        if (usedBy.length) return json(res, 409, { ok: false, error: `该图片正被 ${usedBy.length} 条新闻使用（${usedBy.join('、')}），请先在编辑中改用其他缩略图` });
      }
      const target = path.join(ROOT, 'public', isProd ? 'assets/img/products' : 'assets/img/news', file);
      if (!existsSync(target)) return json(res, 404, { ok: false, error: '文件不存在或已删除' });
      await unlink(target);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/build') return runBuild(res);

    if (req.method === 'OPTIONS' && url.pathname === '/api/inquiry') {
      // 公开询价端点的跨域预检（官网表单远程提交用）
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    if (req.method === 'POST' && url.pathname === '/api/inquiry') {
      const row = { ...JSON.parse(await readBody(req)), id: randomBytes(8).toString('hex'), receivedAt: new Date().toISOString() };
      let list = [];
      if (existsSync(INQUIRIES)) {
        try { list = JSON.parse(await readFile(INQUIRIES, 'utf8')); } catch { list = []; }
      }
      list.unshift(row);
      await mkdir(path.dirname(INQUIRIES), { recursive: true });
      await writeFile(INQUIRIES, JSON.stringify(list, null, 2), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.method === 'GET' && url.pathname === '/api/inquiries') {
      const list = normIds(await loadInquiryList());
      await saveInquiries(list); // 为早期无 id 的记录补上 id
      return json(res, 200, list);
    }

    if (req.method === 'POST' && url.pathname === '/api/inquiries/reply') {
      // 保存回复：勾选公开且有内容时发布到网站留言板，并自动重新生成网站
      const body = JSON.parse(await readBody(req));
      const list = normIds(await loadInquiryList());
      const rec = list.find((r) => r.id === body.id);
      if (!rec) return json(res, 404, { ok: false, error: '记录不存在或已被删除，请刷新列表' });
      rec.reply = String(body.reply || '').trim().slice(0, 2000);
      rec.public = !!body.public && !!rec.reply;
      await saveInquiries(list);
      const changed = await writePublicReplies(list);
      let build = null;
      if (changed && !building) build = await startBuild(); // 公开内容有变化才自动重建；正在构建则跳过（下次构建会带上）
      return json(res, 200, { ok: true, rebuilt: !!build?.ok });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/inquiries') {
      // 删除询价记录；若被删记录曾公开到留言板，同步撤下并自动重建
      const body = JSON.parse(await readBody(req));
      const list = normIds(await loadInquiryList());
      const idx = list.findIndex((r) => r.id === body.id);
      if (idx === -1) return json(res, 404, { ok: false, error: '记录不存在或已被删除，请刷新列表' });
      const [removed] = list.splice(idx, 1);
      await saveInquiries(list);
      const changed = await writePublicReplies(list);
      let build = null;
      if (changed && !building) build = await startBuild();
      return json(res, 200, { ok: true, rebuilt: !!build?.ok, removed: removed.name || '' });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { ok: false, error: String(e?.message || e) });
  }
}).listen(PORT, HOST, () => {
  const lanIps = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  const remote = HOST !== '127.0.0.1' && HOST !== 'localhost';
  console.log(`管理服务已启动: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
  if (remote && lanIps.length) console.log(`局域网访问: ${lanIps.map((ip) => `http://${ip}:${PORT}`).join('  或  ')}`);
  if (remote) console.log('⚠ 后台已开放远程访问。请确保使用强管理密码；若通过公网使用，建议在前面加一层 HTTPS 反向代理（如 IIS/Apache 反代 + 证书）。');
  console.log('提示：编辑保存后会自动重新生成静态网站（dist/），IIS 站点无需重启即可看到新内容。');
});
