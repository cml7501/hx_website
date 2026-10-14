// 从旧站抓取的 GB2312→UTF-8 文章 HTML 中提取标题、日期与正文段落
// 输入: tmp/news/<id>.html  输出: tmp/news-extracted.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'tmp/news';
const out = [];

for (const f of readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const id = f.replace('.html', '');
  const html = readFileSync(join(dir, f), 'utf8');
  const title = (html.match(/<title>([^<_]+)/) || [])[1]?.trim();
  const date = (html.match(/发布时间：([\d-]+)/) || [])[1];
  const contentTd = (html.match(/<td[^>]*class="content"[^>]*>([\s\S]*?)<\/td>/) || [])[1] || '';
  // 块级元素切分成段，再去标签、压缩空白
  const paragraphs = contentTd
    .split(/<\/(?:div|p|br)>/i)
    .map((p) => p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  out.push({ id, title, date, paragraphs });
}

out.sort((a, b) => (a.date < b.date ? 1 : -1));
writeFileSync('tmp/news-extracted.json', JSON.stringify(out, null, 2), 'utf8');
console.log(`extracted ${out.length} articles -> tmp/news-extracted.json`);
