import type { BuiltInWeChatThemeDef } from '../themeRegistryTypes'

const theme = {
  id: 'guofeng',
  label: '中国风·皇家春节',
  vars: {
    // 核心色：朱砂红 (用于强调、链接、重点)
    '--wechat-accent': '#c02c38',
    // 辅助色：流光金 (用于边框、背景底色)
    '--wechat-gold': '#d4af37',
    // 浅色背景：淡淡的红金渐变感
    '--wechat-accent-soft': 'rgba(192, 44, 56, 0.06)',
    '--wechat-accent-softer': 'rgba(212, 175, 55, 0.1)',
    // 标题颜色：深褐 (比纯黑更柔和，配合金色)
    '--wechat-heading': '#3e2e2e',
    // 引用边框：金色
    '--wechat-quote-border': '#d4af37',
    // 引用背景：极淡的米黄金色
    '--wechat-quote-bg': '#fffbf0',
    '--wechat-pre-bg': '#fcf6f6',
  },
  extraCss: `
/* 配色策略：红妆金饰 
  Red for attention, Gold for decoration.
*/

.wechat-article {
  font-family: "Optima-Regular", "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.75;
  color: #333;
}

/* H1 主标题：红底金字，如宫廷牌匾 */
.wechat-article h1 {
  text-align: center;
  background-color: var(--wechat-accent);
  color: #fff !important; /* 强制白字或金字 */
  padding: 15px 10px;
  border-radius: 8px;
  border: 2px solid var(--wechat-gold);
  margin-bottom: 30px;
  font-weight: bold;
  box-shadow: 0 4px 0 rgba(192, 44, 56, 0.3); /* 增加立体感 */
}

/* H2 二级标题：底部祥云纹理感 (双线+背景) */
.wechat-article h2 {
  text-align: center;
  color: var(--wechat-accent);
  background: linear-gradient(to right, transparent, var(--wechat-accent-softer), transparent);
  border-top: 2px solid var(--wechat-gold);
  border-bottom: 2px solid var(--wechat-gold);
  padding: 10px 0;
  margin-top: 40px;
  margin-bottom: 20px;
  font-size: 18px;
  letter-spacing: 2px;
}

/* H3 三级标题：左侧红竖线 + 金色背景块 */
.wechat-article h3 {
  border-left: 4px solid var(--wechat-accent);
  background-color: var(--wechat-quote-bg);
  padding: 6px 12px;
  color: #5d4037;
  margin-top: 24px;
  margin-bottom: 12px;
  font-size: 16px;
  border-radius: 0 4px 4px 0;
}

/* 重点文字：红字加金底 */
.wechat-article strong {
  color: var(--wechat-accent);
  background: linear-gradient(to bottom, transparent 60%, rgba(212, 175, 55, 0.3) 60%);
  padding: 0 2px;
}

/* 引用块：金框米底，如圣旨/帖子 */
.wechat-article blockquote {
  border-left: none; /* 去掉默认左边框 */
  border: 1px solid var(--wechat-gold); /* 改为四周细金框 */
  border-left: 6px solid var(--wechat-accent); /* 左侧加粗红线 */
  background-color: var(--wechat-quote-bg);
  color: #555;
  border-radius: 6px;
  padding: 16px;
  margin: 20px 0;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.05);
}

/* 列表圆点：金色方块 */
.wechat-article ul li::marker {
  color: var(--wechat-gold);
  font-size: 1.2em;
}

/* 分割线：红金相间 */
.wechat-article hr {
  border: 0;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    var(--wechat-accent),
    var(--wechat-accent) 10px,
    var(--wechat-gold) 10px,
    var(--wechat-gold) 20px
  );
  margin: 40px 0;
  opacity: 0.8;
}

/* 链接：红色加金色下划线 */
.wechat-article a {
  color: var(--wechat-accent);
  text-decoration: none;
  border-bottom: 1px dotted var(--wechat-gold);
}
`.trim(),
} satisfies BuiltInWeChatThemeDef

export default theme
