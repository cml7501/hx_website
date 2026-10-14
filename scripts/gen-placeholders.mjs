// 生成全站占位 SVG（深蓝渐变 + 线性图标 + 型号标注），真实素材到位后直接替换同名文件
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/assets/ph';
mkdirSync(OUT, { recursive: true });

const C = { deep: '#2F6FC4', dark: '#3B7BD4', mid: '#6FA6E8', light: '#A9CCF3', ink: '#0B2B52' };

const icons = {
  device: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.03}" opacity=".9">
    <rect x="${x}" y="${y}" width="${s}" height="${s * 0.72}" rx="${s * 0.06}"/>
    <rect x="${x + s * 0.12}" y="${y + s * 0.12}" width="${s * 0.76}" height="${s * 0.2}" rx="${s * 0.03}" fill="#CFE3FA" stroke="none" opacity=".35"/>
    <circle cx="${x + s * 0.25}" cy="${y + s * 0.52}" r="${s * 0.07}"/><circle cx="${x + s * 0.5}" cy="${y + s * 0.52}" r="${s * 0.07}"/><circle cx="${x + s * 0.75}" cy="${y + s * 0.52}" r="${s * 0.07}"/>
  </g>`,
  petri: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.03}" opacity=".9">
    <circle cx="${x + s / 2}" cy="${y + s * 0.42}" r="${s * 0.34}"/><circle cx="${x + s / 2}" cy="${y + s * 0.42}" r="${s * 0.2}"/>
    <circle cx="${x + s * 0.42}" cy="${y + s * 0.36}" r="${s * 0.03}" fill="#CFE3FA"/><circle cx="${x + s * 0.58}" cy="${y + s * 0.48}" r="${s * 0.035}" fill="#CFE3FA"/>
  </g>`,
  bottle: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.03}" opacity=".9">
    <rect x="${x + s * 0.4}" y="${y}" width="${s * 0.2}" height="${s * 0.12}" rx="2"/>
    <path d="M${x + s * 0.33} ${y + s * 0.12} h${s * 0.34} a${s * 0.1} ${s * 0.1} 0 0 1 ${s * 0.1} ${s * 0.1} v${s * 0.5} a${s * 0.1} ${s * 0.1} 0 0 1 -${s * 0.1} ${s * 0.1} h-${s * 0.34} a${s * 0.1} ${s * 0.1} 0 0 1 -${s * 0.1} -${s * 0.1} v-${s * 0.5} a${s * 0.1} ${s * 0.1} 0 0 1 ${s * 0.1} -${s * 0.1} z"/>
    <line x1="${x + s * 0.3}" y1="${y + s * 0.42}" x2="${x + s * 0.7}" y2="${y + s * 0.42}"/>
  </g>`,
  plate: (x, y, s) => { let dots = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) dots += `<circle cx="${x + s * (0.2 + c * 0.12)}" cy="${y + s * (0.2 + r * 0.16)}" r="${s * 0.035}" fill="#CFE3FA" opacity=".8"/>`; return `<rect x="${x + s * 0.08}" y="${y + s * 0.08}" width="${s * 0.84}" height="${s * 0.62}" rx="${s * 0.04}" fill="none" stroke="#CFE3FA" stroke-width="${s * 0.03}" opacity=".9"/>${dots}`; },
  building: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.028}" opacity=".9">
    <rect x="${x + s * 0.2}" y="${y + s * 0.1}" width="${s * 0.6}" height="${s * 0.68}"/>
    <path d="M${x + s * 0.1} ${y + s * 0.78} h${s * 0.8}"/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${x + s * (0.27 + c * 0.12)}" y="${y + s * (0.2 + r * 0.15)}" width="${s * 0.06}" height="${s * 0.07}" fill="#CFE3FA" stroke="none" opacity=".45"/>`).join('')).join('')}
  </g>`,
  video: (x, y, s) => `<g opacity=".95"><circle cx="${x + s / 2}" cy="${y + s * 0.4}" r="${s * 0.3}" fill="none" stroke="#CFE3FA" stroke-width="${s * 0.035}"/><path d="M${x + s * 0.44} ${y + s * 0.28} l${s * 0.26} ${s * 0.12} l-${s * 0.26} ${s * 0.12} z" fill="#CFE3FA"/></g>`,
  hero: (x, y, s) => { let dots = ''; const cols = 9, rows = 5; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const d = ((r * 13 + c * 7) % 9) / 9; if (d > .45) dots += `<circle cx="${x + s * (0.06 + c * 0.11)}" cy="${y + s * (0.1 + r * 0.2)}" r="${s * (0.008 + d * 0.02)}" fill="#CFE3FA" opacity="${0.25 + d * 0.5}"/>`; } return `${dots}<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.006}" opacity=".65"><circle cx="${x + s * 0.78}" cy="${y + s * 0.42}" r="${s * 0.3}"/><circle cx="${x + s * 0.78}" cy="${y + s * 0.42}" r="${s * 0.2}"/><circle cx="${x + s * 0.78}" cy="${y + s * 0.42}" r="${s * 0.09}" opacity=".9"/></g>`; },
  wave: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.008}" opacity=".7"><path d="M${x} ${y + s * 0.6} q${s * 0.12} -${s * 0.28} ${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0"/><path d="M${x} ${y + s * 0.72} q${s * 0.12} -${s * 0.34} ${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0" opacity=".6"/><path d="M${x} ${y + s * 0.84} q${s * 0.12} -${s * 0.4} ${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0 t${s * 0.25} 0" opacity=".35"/></g><g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.012}" opacity=".85"><rect x="${x + s * 0.08}" y="${y + s * 0.18}" width="${s * 0.3}" height="${s * 0.22}" rx="${s * 0.02}"/><line x1="${x + s * 0.13}" y1="${y + s * 0.24}" x2="${x + s * 0.33}" y2="${y + s * 0.24}"/><line x1="${x + s * 0.13}" y1="${y + s * 0.3}" x2="${x + s * 0.28}" y2="${y + s * 0.3}"/></g>`,
  qr: (x, y, s) => { let cells = ''; const seed = (i) => ((i * 137 + 31) % 7) > 3; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) { if (seed(r * 7 + c)) cells += `<rect x="${x + s * (0.12 + c * 0.11)}" y="${y + s * (0.12 + r * 0.11)}" width="${s * 0.09}" height="${s * 0.09}" fill="#CFE3FA" opacity=".85"/>`; } return `${cells}<rect x="${x + s * 0.12}" y="${y + s * 0.12}" width="${s * 0.31}" height="${s * 0.31}" fill="none" stroke="#CFE3FA" stroke-width="${s * 0.02}"/><rect x="${x + s * 0.57}" y="${y + s * 0.57}" width="${s * 0.31}" height="${s * 0.31}" fill="none" stroke="#CFE3FA" stroke-width="${s * 0.02}"/>`; },
  map: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.025}" opacity=".8"><path d="M${x + s * 0.1} ${y + s * 0.2} q${s * 0.3} -${s * 0.1} ${s * 0.4} ${s * 0.05} t${s * 0.4} ${s * 0.1}"/><path d="M${x + s * 0.15} ${y + s * 0.5} q${s * 0.35} -${s * 0.05} ${s * 0.7} ${s * 0.12}"/><path d="M${x + s * 0.2} ${y + s * 0.75} h${s * 0.5}"/></g><g><circle cx="${x + s * 0.5}" cy="${y + s * 0.35}" r="${s * 0.06}" fill="#CFE3FA"/><path d="M${x + s * 0.5} ${y + s * 0.2} a${s * 0.12} ${s * 0.12} 0 0 1 ${s * 0.12} ${s * 0.15} a${s * 0.12} ${s * 0.12} 0 0 1 -${s * 0.24} 0 a${s * 0.12} ${s * 0.12} 0 0 1 ${s * 0.12} -${s * 0.15} z" fill="none" stroke="#CFE3FA" stroke-width="${s * 0.02}"/></g>`,
  news: (x, y, s) => `<g fill="none" stroke="#CFE3FA" stroke-width="${s * 0.028}" opacity=".9"><rect x="${x + s * 0.22}" y="${y + s * 0.12}" width="${s * 0.56}" height="${s * 0.64}" rx="${s * 0.03}"/><line x1="${x + s * 0.32}" y1="${y + s * 0.28}" x2="${x + s * 0.68}" y2="${y + s * 0.28}"/><line x1="${x + s * 0.32}" y1="${y + s * 0.42}" x2="${x + s * 0.68}" y2="${y + s * 0.42}"/><line x1="${x + s * 0.32}" y1="${y + s * 0.56}" x2="${x + s * 0.56}" y2="${y + s * 0.56}"/></g>`,
};

function svg({ w, h, icon, label, sub, hue = 0 }) {
  const s = Math.min(w, h) * 0.62;
  const ix = (w - s) / 2, iy = h * 0.08;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label} 占位图">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${C.dark}"/><stop offset=".55" stop-color="${C.deep}"/><stop offset="1" stop-color="${C.mid}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<g stroke="#FFFFFF" opacity=".05" stroke-width="1">${Array.from({ length: Math.ceil(h / 48) }, (_, i) => `<line x1="0" y1="${i * 48}" x2="${w}" y2="${i * 48}"/>`).join('')}</g>
${icons[icon](ix, iy, s)}
<text x="${w / 2}" y="${h * 0.78}" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${Math.min(w, h) * 0.085}" font-weight="700" fill="#FFFFFF">${label}</text>
${sub ? `<text x="${w / 2}" y="${h * 0.88}" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${Math.min(w, h) * 0.042}" fill="#CFE3FA" opacity=".85">${sub}</text>` : ''}
<text x="${w - 10}" y="${h - 10}" text-anchor="end" font-family="Arial, sans-serif" font-size="${Math.min(w, h) * 0.034}" fill="#CFE3FA" opacity=".55">占位图 · 待替换素材</text>
</svg>`;
}

const manifest = [
  // 产品占位（型号入图）
  { f: 'p-hx-smart66.svg', w: 800, h: 600, icon: 'device', label: 'HX-SMART66', sub: '全自动微生物鉴定药敏分析仪' },
  { f: 'p-hx-21.svg', w: 800, h: 600, icon: 'device', label: 'HX-21', sub: '细菌鉴定药敏分析仪' },
  { f: 'p-hx-21a.svg', w: 800, h: 600, icon: 'device', label: 'HX-21A', sub: '细菌鉴定药敏分析仪' },
  { f: 'p-hx-21b.svg', w: 800, h: 600, icon: 'device', label: 'HX-21B', sub: '细菌鉴定药敏分析仪' },
  { f: 'p-hx-21-agri.svg', w: 800, h: 600, icon: 'device', label: 'HX-21', sub: '农·畜·牧·水产·学校应用型' },
  { f: 'p-hx-21-cdc.svg', w: 800, h: 600, icon: 'device', label: 'HX-21', sub: '疾控·质检·食药·学校应用型' },
  { f: 'p-hx-21-env.svg', w: 800, h: 600, icon: 'device', label: 'HX-21', sub: '环境检测·水源·学校应用型' },
  { f: 'p-bc-analyzer.svg', w: 800, h: 600, icon: 'device', label: 'BC-60 / BC-120', sub: '全自动血培养仪' },
  { f: 'p-reagent-panel.svg', w: 800, h: 600, icon: 'plate', label: 'HX-21 试剂板', sub: '96 孔微生物鉴定药敏试剂板' },
  { f: 'p-bc-bottle.svg', w: 800, h: 600, icon: 'bottle', label: 'BC 血培养瓶', sub: '需氧 / 厌氧 / 儿童系列' },
  // 分类封面
  { f: 'cat-smart66.svg', w: 800, h: 600, icon: 'device', label: '全自动鉴定药敏', sub: 'AUTO ID & AST SYSTEM' },
  { f: 'cat-hx21.svg', w: 800, h: 600, icon: 'petri', label: '细菌鉴定药敏', sub: 'ID & AST ANALYZER' },
  { f: 'cat-bc.svg', w: 800, h: 600, icon: 'bottle', label: '血培养仪', sub: 'BLOOD CULTURE SYSTEM' },
  { f: 'cat-reagent.svg', w: 800, h: 600, icon: 'plate', label: '微生物试剂', sub: 'REAGENT PANELS' },
  { f: 'cat-bottle.svg', w: 800, h: 600, icon: 'bottle', label: '血培养瓶', sub: 'CULTURE BOTTLES' },
  // 通用
  { f: 'hero-1.svg', w: 1600, h: 700, icon: 'hero', label: '', sub: '' },
  { f: 'hero-2.svg', w: 1600, h: 700, icon: 'wave', label: '', sub: '' },
  { f: 'about.svg', w: 800, h: 600, icon: 'building', label: '恒星科技', sub: '华亿科学园 F 幢' },
  { f: 'video.svg', w: 1200, h: 675, icon: 'video', label: '企业视频', sub: '视频占位 · 待提供素材' },
  { f: 'qr.svg', w: 300, h: 300, icon: 'qr', label: '', sub: '' },
  { f: 'map.svg', w: 1000, h: 500, icon: 'map', label: '合肥市高新区天达路11号', sub: 'MAP PLACEHOLDER' },
  { f: 'news-a.svg', w: 640, h: 400, icon: 'petri', label: '微生物检验', sub: '' },
  { f: 'news-b.svg', w: 640, h: 400, icon: 'device', label: '产品动态', sub: '' },
  { f: 'news-c.svg', w: 640, h: 400, icon: 'building', label: '公司动态', sub: '' },
];

for (const m of manifest) writeFileSync(join(OUT, m.f), svg(m), 'utf8');
console.log(`generated ${manifest.length} placeholder SVGs -> ${OUT}/`);

// ---------- 首屏轮播场景图（浅蓝医疗风：微生物检测 / 药敏分析 / 血培养） ----------
const HERO_W = 1600, HERO_H = 700;

function heroSvg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HERO_W}" height="${HERO_H}" viewBox="0 0 ${HERO_W} ${HERO_H}" role="img" aria-label="hero banner">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0.4">
    <stop offset="0" stop-color="#3B7BD4"/><stop offset=".48" stop-color="#6FA6E8"/><stop offset="1" stop-color="#D9E9FB"/>
  </linearGradient>
  <radialGradient id="dish" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity=".30"/><stop offset=".8" stop-color="#FFFFFF" stop-opacity=".12"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".42"/>
  </radialGradient>
</defs>
<rect width="${HERO_W}" height="${HERO_H}" fill="url(#bg)"/>
<g stroke="#FFFFFF" opacity=".06">${Array.from({ length: 15 }, (_, i) => `<line x1="0" y1="${i * 48}" x2="${HERO_W}" y2="${i * 48}"/>`).join('')}</g>
${[[1180, 80], [620, 120], [980, 620], [220, 560], [1500, 300]].map(([x, y]) => `<g opacity=".15" stroke="#FFFFFF" stroke-width="3"><line x1="${x - 16}" y1="${y}" x2="${x + 16}" y2="${y}"/><line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y + 16}"/></g>`).join('')}
${inner}
<text x="${HERO_W - 12}" y="${HERO_H - 12}" text-anchor="end" font-family="Arial, sans-serif" font-size="20" fill="#FFFFFF" opacity=".5">占位图 · 待替换素材</text>
</svg>`;
}

const dish = (cx, cy, r) => `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dish)" stroke="#FFFFFF" stroke-width="3" opacity=".95"/><circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="#FFFFFF" opacity=".08"/></g>`;
const rod = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-23" y="-8" width="46" height="16" rx="8" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity=".85"/></g>`;
const cocco = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity=".8"/>`;

const heroInner = {
  // 场景一：微生物检测（培养皿菌落 + 菌体形态）
  micro: `
  ${dish(1190, 340, 130)}
  <g opacity=".9">
    <circle cx="1110" cy="308" r="11" fill="#F4C542" opacity=".8"/><circle cx="1155" cy="390" r="8" fill="#FFFFFF" opacity=".55"/><circle cx="1215" cy="335" r="13" fill="#FFFFFF" opacity=".4"/><circle cx="1192" cy="292" r="5" fill="#D9534F" opacity=".6"/><circle cx="1122" cy="420" r="6" fill="#FFFFFF" opacity=".5"/><circle cx="1248" cy="405" r="9" fill="#F4C542" opacity=".55"/><circle cx="1080" cy="362" r="4" fill="#FFFFFF" opacity=".45"/>
    <path d="M1090 330 q30 -22 62 -6 t66 -10" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".5"/>
    <path d="M1105 405 q40 18 84 -2" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".4"/>
  </g>
  ${dish(1385, 130, 52)}
  <circle cx="1385" cy="130" r="7" fill="#F4C542" opacity=".65"/><circle cx="1368" cy="142" r="4" fill="#FFFFFF" opacity=".55"/>
  <g opacity=".85">${rod(930, 560)}${rod(1010, 600)}${rod(1090, 565)}${cocco(1160, 585, 11)}${cocco(1205, 600, 8)}${cocco(1250, 578, 13)}</g>
  <path d="M1330 585 q20 -18 40 0 t40 0 t40 0" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity=".6"/>
  <g fill="#FFFFFF" opacity=".5"><circle cx="960" cy="180" r="4"/><circle cx="1030" cy="140" r="3"/><circle cx="890" cy="230" r="2.5"/></g>`,
  // 场景二：药敏分析（96 孔试剂板 + 抑菌圈 + MIC 梯度条）
  ast: `
  <g transform="translate(1010 120)" opacity=".95">
    ${Array.from({ length: 48 }, (_, i) => {
      const c = i % 8, r = (i / 8) | 0, f = (i * 31) % 11;
      const well = `<rect x="${c * 58}" y="${r * 58}" width="50" height="50" rx="9" fill="#FFFFFF" opacity=".16"/>`;
      const fill = f === 2 ? '<circle cx="' + (c * 58 + 25) + '" cy="' + (r * 58 + 25) + '" r="15" fill="#F4C542" opacity=".8"/>' : f === 5 ? '<circle cx="' + (c * 58 + 25) + '" cy="' + (r * 58 + 25) + '" r="15" fill="#D9534F" opacity=".75"/>' : f === 7 ? '<circle cx="' + (c * 58 + 25) + '" cy="' + (r * 58 + 25) + '" r="15" fill="#45BFA0" opacity=".8"/>' : '';
      return well + fill;
    }).join('')}
  </g>
  ${dish(1330, 530, 150)}
  <g opacity=".92">
    <circle cx="1275" cy="490" r="42" fill="#FFFFFF" opacity=".2"/><circle cx="1275" cy="490" r="14" fill="#FFFFFF" opacity=".9"/>
    <circle cx="1385" cy="560" r="52" fill="#FFFFFF" opacity=".2"/><circle cx="1385" cy="560" r="14" fill="#FFFFFF" opacity=".9"/>
    <circle cx="1345" cy="455" r="30" fill="#FFFFFF" opacity=".18"/><circle cx="1345" cy="455" r="12" fill="#F4C542" opacity=".9"/>
  </g>
  <g transform="translate(880 500)" opacity=".9">
    <rect width="360" height="44" rx="22" fill="#FFFFFF" opacity=".14" stroke="#FFFFFF" stroke-width="1.5"/>
    ${Array.from({ length: 10 }, (_, i) => `<circle cx="${30 + i * 33}" cy="22" r="11" fill="#7FB2EE" opacity="${(1 - i * 0.09).toFixed(2)}"/>`).join('')}
  </g>
  <g fill="#FFFFFF" opacity=".5"><circle cx="950" cy="200" r="5"/><circle cx="1520" cy="120" r="4"/></g>`,
  // 场景三：血培养（三瓶血培养瓶 + 气泡 + 24h 时钟）
  blood: `
  <g opacity=".95">
    ${[[1120, 300, 86, '#45BFA0'], [1240, 250, 100, '#F4C542'], [1360, 330, 76, '#D9534F']].map(([x, y, h2, cap]) => `
      <g transform="translate(${x} ${y})">
        <rect x="${-h2 * 0.16 - 8}" y="-34" width="${h2 * 0.32 + 16}" height="26" rx="8" fill="${cap}" opacity=".92"/>
        <rect x="${-h2 * 0.28}" y="-12" width="${h2 * 0.56}" height="${h2}" rx="${h2 * 0.16}" fill="#FFFFFF" opacity=".16" stroke="#FFFFFF" stroke-width="2.5"/>
        <rect x="${-h2 * 0.24}" y="${h2 - 52}" width="${h2 * 0.48}" height="44" rx="10" fill="#C0392B" opacity=".55"/>
      </g>`).join('')}
    <rect x="1040" y="600" width="420" height="14" rx="7" fill="#FFFFFF" opacity=".2"/>
  </g>
  <g fill="#FFFFFF" opacity=".45"><circle cx="1140" cy="250" r="6"/><circle cx="1245" cy="205" r="8"/><circle cx="1350" cy="280" r="5"/><circle cx="1195" cy="165" r="4"/><circle cx="1300" cy="150" r="5"/></g>
  <g transform="translate(1470 150)" opacity=".9">
    <circle r="62" fill="#FFFFFF" fill-opacity=".14" stroke="#FFFFFF" stroke-width="3"/>
    <line x1="0" y1="0" x2="0" y2="-38" stroke="#FFFFFF" stroke-width="3.5"/><line x1="0" y1="0" x2="26" y2="14" stroke="#FFFFFF" stroke-width="3.5"/>
    <circle r="5" fill="#FFFFFF"/>
  </g>
  <g transform="translate(950 170)" opacity=".18" stroke="#FFFFFF" stroke-width="10"><line x1="-42" y1="0" x2="42" y2="0"/><line x1="0" y1="-42" x2="0" y2="42"/></g>`,
};

writeFileSync(join(OUT, 'hero-1.svg'), heroSvg(heroInner.micro), 'utf8');
writeFileSync(join(OUT, 'hero-2.svg'), heroSvg(heroInner.ast), 'utf8');
writeFileSync(join(OUT, 'hero-3.svg'), heroSvg(heroInner.blood), 'utf8');
console.log('hero-1/2/3.svg 浅蓝医疗场景图已生成');
