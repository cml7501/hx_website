import site from '../data/site.json';
import ui from '../data/ui.json';
import products from '../data/products.json';
import news from '../data/news.json';
import honors from '../data/honors.json';
import jobs from '../data/jobs.json';

/** 双语字段取值：优先当前语言，缺失回退中文 */
export const t = (field, lang) => (field && (field[lang] ?? field.zh)) ?? '';

/** 语言路径前缀：中文 ""，英文 "/en" */
export const pref = (lang) => (lang === 'en' ? '/en' : '');

/** 界面文案 */
export const lbl = (key, lang) => t(ui.labels[key], lang);

/** 新闻按日期倒序 */
export const sortedNews = [...news].sort((a, b) => (a.date < b.date ? 1 : -1));

/** 产品查找辅助 */
export const productsByCategory = (catId) => products.products.filter((p) => p.category === catId);

export { site, ui, products, news, honors, jobs };
