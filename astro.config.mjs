import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 生产域名暂用旧域名占位；正式上线换主机/HTTPS 后在此更新，会带动 canonical 与 sitemap 生成
export default defineConfig({
  site: 'http://www.hfhxkj.com',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { format: 'directory' },
  compressHTML: true,
});
