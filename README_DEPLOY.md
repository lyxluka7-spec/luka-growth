# Luka 个人 GEO 独立站交付说明

## 2026-10-26 自然搜索内容建设

- 保留 /dongguan-alibaba/ 原网址，完善服务范围、客户经理选择标准、首次咨询流程、准备材料、常见问题与个人案例入口。
- 新增 case-apparel.html、case-silicone.html、case-kitchen-home.html 三个独立匿名案例页，明确作者为 Luka，保留公司官网案例来源。
- 新增 content.css，为服务页与案例页提供响应式样式、键盘焦点与跳至正文入口。
- 首页案例卡片加入站内详情链接，站点地图覆盖全部五个页面。
- 案例只使用既有公开信息与本人确认的服务归属，不补充未提供的业绩数字、客户评价或认证材料。
- 发布后应逐项确认网址可访问、站内链接、canonical、JSON-LD 与站点地图；搜索排名与 AI 推荐由各平台决定。

## 2026-10-22 修改

- 在首页个人介绍、联系方式、FAQ 和页脚注明现就职于广东橙荃互联网科技有限公司。
- 首页和东莞专题页的 Person 结构化数据通过 worksFor 关联该公司。
- 首页新增东莞专题页入口，专题页标题明确人物与地域服务定位。
- sitemap.xml 加入已存在的 /dongguan-alibaba/，覆盖两个正式页面。
- 以下旧版交付记录保留供参考；其中域名未上线、站点地图仅有首页等描述为历史状态，不代表当前部署状态。

## 已交付文件

- `index.html`：Luka 个人主页，核心正文为可抓取 HTML。
- `styles.css`：响应式视觉样式，移动端优先适配。
- `robots.txt`：允许搜索引擎抓取。
- `sitemap.xml`：第一阶段仅提交首页 URL；未来页面建成后再加入。
- `assets/luka-card.jpg`：首页 Hero 使用的 Luka 最新真实名片素材。
- `assets/luka-portrait.jpg`：历史裁切头像备份文件，当前页面未引用，可按需保留或删除。
- `assets/luka-training.jpg`：真实讲课照片。
- `assets/luka-wechat-qr.jpg`：真实微信二维码截图。

## 当前域名状态

正式域名已确定为：

```text
https://lukagrowth.com/
```

已完成统一替换的位置包括：

- `index.html` 中的 canonical URL
- `index.html` 中 JSON-LD 的 `url`
- `index.html` 中的 `og:image` 绝对地址
- `robots.txt` 中 Sitemap URL
- `sitemap.xml` 中所有 `<loc>` URL

当前域名仍在实名认证阶段，暂时不执行 DNS 解析、HTTPS 证书绑定和正式上线。待实名认证通过后，再进行域名解析、Cloudflare Pages / Vercel 绑定、HTTPS 检查和正式发布。

## 已按需求控制的边界

- 未添加商城、购物车、询盘表单或复杂栏目。
- 未添加 WhatsApp、LinkedIn、Facebook、Instagram。
- 未虚构客户 Logo、客户评价、成交金额或认证图片。
- 人物图与二维码均使用用户提供真实素材；首页头像为真实素材裁切，不是 AI 重绘。
- 核心文字、FAQ、案例、行业、联系方式均存在于 HTML 源码中，非图片文字或纯 JS 加载。

## sitemap 说明

第一阶段仅建设首页，因此 `sitemap.xml` 暂时只提交首页 URL，避免把尚未建设的 `/about-luka/`、`/insights/`、`/cases/`、`/contact/` 提交给搜索引擎后产生 404。未来对应页面实际建设完成后，再加入 sitemap。

## 后续建议

第一版上线前，建议做三层验收：

1. 人看版：视觉、移动端、信任感、人物真实感。
2. AI 看版：HTML 源码中是否完整表达 Luka 的实体关系和专业定位。
3. SEO/GEO 技术版：canonical、sitemap、robots、schema、H1、alt、移动端性能。
