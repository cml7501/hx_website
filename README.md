# 合肥恒星科技开发有限公司 · 官网

中英双语静态站点（Astro 构建），参照安图生物官网风格、主色医疗科技深蓝。内容与模板分离：所有文案存于 `src/data/*.json`，非技术同事通过本地内容管理页更新。

## 快速开始

环境要求：Node.js 18+（本机已装 v24）。

```bash
npm install            # 首次或依赖变更后（国内可加 --registry=https://registry.npmmirror.com）
npm run dev            # 开发预览  http://localhost:4321
npm run build          # 构建纯静态站点到 dist/
npm run preview        # 本地预览构建产物
npm run admin          # 内容管理服务  http://127.0.0.1:4173（仅本机可访问）
```

> 后台密码存于 `admin/config.json`（不入 git）。首次使用先执行 `npm run admin-passwd -- 你的密码` 生成配置。

## 内容更新流程（非技术人员）

1. 双击启动管理服务：`npm run admin`（或让 IT 配成一个桌面快捷方式）
2. 浏览器打开 http://127.0.0.1:4173
3. 「新闻管理」可新增/编辑/删除新闻（中文必填，英文可留空、留空时前台显示中文）；「产品管理」可修改型号、名称、特点、参数、适用领域
4. 修改完成后点底部「**保存并重新生成网站**」——数据保存、网站重建一次完成，IIS 无需重启，刷新前台即见新内容
5. 「询价记录」Tab 查看网站表单收到的询价（需先在 `src/components/Head.astro` 中把表单接口指向本服务，见下文）

招聘、荣誉、公司简介等低频内容直接编辑 `src/data/` 下对应 JSON 文件后重新构建（字段为 `{ "zh": ..., "en": ... }` 结构）。

## 目录结构

```
src/data/      全部内容数据（site 公司信息/products/news/honors/jobs/ui 界面文案与每页 TDK）
src/pages/     路由（中文根路径，英文 /en/ 前缀，页面组件在 src/components/pages/ 参数化复用）
src/styles/    global.css（设计令牌与全部样式）
public/        静态资源（logo、证书、SVG 占位图、web.config、robots.txt）
admin/         本地内容管理服务（零依赖 Node http）
deploy/        IIS 一键部署脚本
docs/          规格与待补充清单
```

## 上线前配置点（集中在这几处）

| 配置 | 位置 | 说明 |
|---|---|---|
| 主色 VI | `src/styles/global.css` 顶部 `:root` | 改 `--c-primary` 等变量即全站生效 |
| 百度统计 ID | `src/components/Head.astro` 的 `HX_BAIDU_TONGJI_ID` | 留空不加载 |
| 询价表单接口 | `src/components/Head.astro` 的 `HX_FORM_ENDPOINT` | 留空为演示模式；填接口地址则真实 POST |
| 生产域名 | `astro.config.mjs` 的 `site` | 影响 canonical 与 sitemap；同步更新 `public/robots.txt` |

## IIS 部署（本机）

以**管理员身份**运行 `deploy/iis-setup.ps1`（或执行 `deploy/elev-run.ps1` 触发 UAC）：自动创建应用池 `hx-website`（无托管代码）、站点 `hx-website`（端口 **8088**，80 已被占用）、授予静态目录只读权限并启动。访问 http://localhost:8088/

- 改端口：编辑脚本中的 `$port` 后重跑，或在 IIS 管理器中修改绑定
- `dist/web.config` 已配置默认文档（index.html）、404 错误页与静态缓存，由 `public/web.config` 构建时带入
- 内容更新后无需重启 IIS：管理服务重建的产物就在站点目录内

## 已知约定

- 双语字段英文缺失时自动回退中文
- 新闻正文空行分段；slug 仅小写字母/数字/连字符
- 旧站 `.asp` 地址的 301 跳转、HTTPS、真实表单通道等待生产环境确定后实施（见 docs/SPEC.md 的 Out of Scope 与工单 05）

## 待补充素材与内容

见 [docs/待补充清单.md](docs/待补充清单.md)。
