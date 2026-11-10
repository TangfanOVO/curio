# 枫枝螃蟹

聊天页顶栏下面挂一只像素小螃蟹：吊在一根从右边伸进来的枫枝梢上（枫枝），或者抓着一根绳子荡（秋千）。点它、拽它、长按它，顶上就长出一排菜单，满屏落小东西，还能把这页聊天的字切着玩。

螃蟹的身子是 [clawd-tank](https://github.com/marciogranzotto/clawd-tank) 的 Clawd（MIT），挂着的姿势、表情和六张会动的图是在这个身子上另画的，见 [CREDITS.md](CREDITS.md)。想要更多姿势，去 clawd-tank 的仓库里看。

纯原生 JS ＋ CSS，没有依赖。

## 长什么样

| 块 | 怎么玩 |
|---|---|
| 枫枝 | 一根悬臂弹簧，螃蟹单手吊在梢上荡，另一只手冲你挥。点树枝抖一下；拽狠了叶子被甩掉，过几秒在原处长回来。叶子平时自己飘，落在打字框上沿，点打字框就拂下去 |
| 秋千 | 一根一节一节的绳，螃蟹两只手各抓一股。有新未读就顺着绳往下跳（蹦极），没事爬回顶栏底下打瞌睡。往哪儿拽都行，拽到头整根是直的 |
| 头顶那一排 | 点螃蟹或往下拽：顶栏下面长出「未读 · 去哪儿 · 长按 · 设置 · 玩一下」。两种样子：一行字（未读底下一道手画波浪）、水滴（从螃蟹那儿流出一颗颗水珠）。点哪个，底下像一滴水那样涨出下拉，字跟着水滴一起露出来 |
| 设置（下拉） | 挂在枫枝还是秋千、那行小字、季节（夏天青、秋天红，叶子一片一片换色）、切字速度；打瞌睡、有风、飘叶子、往上冒；最底下「收起」，枫枝和秋千都收 |
| 长按 | 按住螃蟹 0.42 秒，弹出一排：按着滑过去松手就选，也能松手再点；「…」展开全部。选一个满屏落下来（或往上冒），按住不放一阵一阵地来；停手以后螃蟹愣一下冒个「！」 |
| 玩一下 | 切字：这页聊天里的字一个个蹦出来给你切，混着丢上来的螃蟹，切到螃蟹就结束。另一项「丢它点东西」直接弹出长按那一排 |

## 怎么打开

```bash
# 在仓库根目录
python3 -m http.server 8000
# 打开 http://localhost:8000/components/maple-crab/demo.html
```

手机右边那张卡上是演示用的开关（未读多少、来一条新的、重新来）。真正的设置都在手机里顶上菜单「设置」里。

## 装进你的页面

```html
<link rel="stylesheet" href="maple-crab.css">
<script src="crab-art.js"></script>
<script src="maple-crab.js"></script>
```

页面要有一个 host（整页或者一台假手机都行），里面有一条顶栏。最好是一列：顶栏 → 聊天 → 打字框。组件把那一排塞在顶栏后面，打开时把聊天往下推；树枝、螃蟹、下拉、落下来的东西都是盖在 host 上的层。顶栏要有不透明的底，往上长的枝叶才藏得进去。

```js
var mc = MapleCrab.mount(document.getElementById('app'), {
  bar: '.top', chat: '.chat', bubble: '.msg', input: '#composer',
  places: [{ key: 'space', label: '动态' }, { key: 'fish', label: '钓鱼' }],
  unread: [{ id: 'm1', place: 'space', text: '发了一条：今天风好大', at: '22:10' }],
  onGo: function (key) { myRouter.go(key); },
  onRead: function (item) { myRouter.go(item.place, item.id); }
});
mc.push({ id: 'm2', place: 'fish', text: '钓到一条鱼', at: '刚刚' });
```

颜色吃页面上的 token：`--bg` `--card` `--ink` `--sub` `--hint` `--line` `--accent`。`demo.html` 开头有亮暗两套，照抄或者换成你自己的。

### `MapleCrab.mount(host, 参数)`

| 键 | 默认 | 意思 |
|---|---|---|
| `bar` | 必须 | 顶栏，元素或 host 里的选择器。那一排插在它后面 |
| `chat` | — | 聊天区，切字游戏从这里取字 |
| `bubble` | — | `chat` 里每个气泡的选择器；不给就把整个 `chat` 当一块 |
| `input` | — | 打字框：叶子落在它上沿，聚焦时拂下去 |
| `places` | `[]` | 去处 `{ key, label }`：「去哪儿」那一格一格，也是未读分组的标题 |
| `unread` | `[]` | 未读，格式见下 |
| `sets` | 内置五类 | 长按出来的分类，格式见下 |
| `menus` | 全部 | 那一排要哪几个：`'unread'` `'go'` `'press'` `'settings'` `'play'` |
| `carrier` | `'branch'` | `'branch'` 枫枝 / `'swing'` 秋千 |
| `variant` | `'line'` | 那行小字：`'line'` 一行字 / `'drop'` 水滴 |
| `season` | `'green'` | 季节：`'green'` 夏天的青叶 / `'red'` 秋天的红叶 |
| `speed` | `.5` | 切字速度：`.5` 慢 / `.75` 中 / `1` 快 |
| `doze` | `true` | 没人理就打瞌睡 |
| `wind` | `false` | 有风 |
| `leaves` | `true` | 飘叶子（系统开了「减少动态效果」时默认 `false`） |
| `up` | `false` | 长按的东西往上冒，不然往下落 |
| `press` | 第一类 | 长按出来哪一类（分类的 `key`） |
| `shown` | `true` | 一开始挂不挂出来 |
| `hints` | `true` | 组件自己的小提示（「动态 来了一条」「戳 ×3」）；`false` 关掉 |

从 `carrier` 到 `press` 这几项，用户也能在「设置」那张下拉里改，改了会调 `onSettings`。

### 事件

| 键 | 什么时候 | 拿到 |
|---|---|---|
| `onGo(key)` | 「去哪儿」里点了一个 | 去处的 `key` |
| `onRead(item)` | 「未读」里点了一条，它已经从未读里拿掉 | 那一条 |
| `onAllRead(items)` | 点了「都标成看过了」 | 刚清掉的那些 |
| `onUnread(n)` | 未读条数变了；mount 时也调一次 | 条数 |
| `onReact(e)` | 长按那一排里选了一个 | `{ set, item, name, combo }`，`combo` 是连着第几下 |
| `onPlay(key)` | 开了一个小游戏 | `'slice'` / `'toss'` |
| `onSettings(s)` | 下拉里改了设置 | 全部设置的一份拷贝；存起来，下次当参数传回来 |
| `onHide()` / `onShow()` | 收起 / 再挂出来 | — |

### 方法

| 方法 | 做什么 |
|---|---|
| `open()` / `close()` | 打开 / 合上那一排 |
| `push(item)` | 来一条新未读：螃蟹蹦一下（秋千再跳一次），不在就来 |
| `setUnread(list)` / `unread()` | 整个换掉 / 拿一份 |
| `set(key, value)` / `settings()` | 改一项设置 / 拿全部 |
| `hide()` / `show()` | 收起 / 再挂出来。收起以后从哪儿再打开由你的页面定，演示里在打字框左边的加号里 |
| `play('slice')` / `play('toss')` | 直接开切字 / 弹出长按那一排 |
| `again()` | 让螃蟹走了再来一次，掉了的叶子都长回来 |
| `brush()` | 打字框挪了位置时调：把搭在上面的叶子拂掉 |
| `toast(text)` | 在 host 里冒一句小提示 |

## 未读的格式

```js
{ id: 'm42', place: 'space', text: '发了一条：今天风好大', at: '22:10' }
```

| 字段 | 必须 | 意思 |
|---|---|---|
| `id` | 建议给 | 认这一条；不给就现编一个 |
| `place` | ✓ | 去处的 `key`。按它分组，组标题取 `places` 里的 `label` |
| `text` | ✓ | 那一行字 |
| `at` | | 右边灰色的小字，原样显示 |

新的在前：`push` 放在最前面，`setUnread` 按你给的顺序。

## 长按的分类

```js
sets: [
  { key: 'kao',   label: '颜文字', type: 'text',  items: ['(´･ω･`)', '(≧▽≦)'] },
  { key: 'stamp', label: '小字章', type: 'stamp', items: ['戳', '在吗'] },
  { key: 'crab',  label: '螃蟹',   type: 'crab',  items: ['happy', 'shy', 'dizzy'] },
  { key: 'doing', label: '在干嘛', type: 'img',   items: [{ name: '钓鱼', src: 'crab/fish.svg' }] },
  { key: 'bits',  label: '小东西', type: 'svg',   items: [{ name: '星星', svg: '<svg viewBox="0 0 24 24">…</svg>' }] }
]
```

| `type` | 一项是什么 | 怎么画 |
|---|---|---|
| `text` | 字符串 | 原样放在一个小框里，颜文字这类 |
| `stamp` | 一两个字 | 一枚枫红描边的小字章 |
| `crab` | 表情的 key | 一张螃蟹表情，见下 |
| `img` | `{ name, src }` | 一张图（会动的 SVG 也行） |
| `svg` | `{ name, svg }` | 一段 SVG，或者 `size => '<svg …>'` |

要别的样子，给这一类加 `render(item, size)` 返回 HTML、`name(item)` 返回名字。默认那五类用 `MapleCrab.defaultSets()` 拿到，加减以后再传进来。前五个直接摆出来，多的在「…」里；一排放不下会自动少摆几个。

## 螃蟹

螃蟹长什么样全在 `crab-art.js`，组件只通过 `window.MapleCrabArt` 拿；想换一只，照那个文件开头的接口表写一个同名对象就行。

| 表情 key | | 表情 key | |
|---|---|---|---|
| `happy` | 高兴 | `sleepy` | 睡了 |
| `shy` | 害羞 | `teary` | 哭哭（切字时刀碰到螃蟹换成这张） |
| `startled` | 被戳 | `squint` | >< |
| `sulky` | 不高兴 | `stare` | 盯着你 |
| `dizzy` | 晕了 | | |

`crab/` 里六张会动的（10 秒一圈）：`care` 喝热水、`fish` 钓鱼、`food` 挑吃的、`letter` 写信、`travel` 出门、`window` 看雨。`MapleCrabArt.face(key, size)` 单独拿一张表情的 SVG。

## 调好的数

| 量 | 值 |
|---|---|
| 长按 | 0.42 秒，手指动超过 5px 就算拽 |
| 拉开那一排 | 往下拽过静止的位置 40px，咔哒一下 |
| 枫枝 | 梢的弹簧 k 190、阻尼比 .11（多弹几下）；往下最多拽 90px，越拽越拽不动 |
| 甩掉叶子 | 梢的速度过 520px/s 才甩；一次最多甩掉四成多 |
| 落叶 | 打字框上沿最多攒九片，5.5–9 秒淡掉 |
| 秋千 | 9 节，重力 1400，阻尼 .92；绳长：开着 22、有未读 46、没有 28、睡着 8；拽出绳长再软软让出 110 |
| 下拉那滴水 | 弹簧 k 230（往下涨 170），阻尼比 .6 |
| 切字 | 字的判定半径 字号×.6＋9（擦边就算），螃蟹 22（好躲）；默认放慢一半 |

## 设计上的几条

| | |
|---|---|
| 下拉的字 | 不按时间渐显，每一帧按那滴水的大小裁（`clip-path`）：字永远不比水先出来 |
| 水滴的颜色 | 要不透明。goo 是先模糊、再按透明度切边，半透明的颜色会被切没；所以用 `--accent` 和 `--card` 混出一个实色 |
| 长按不算拽 | 弹出那一排时螃蟹原地松开，不带走拽的速度 |
| 「…」 | 点它时手指下那颗按钮会被换掉；`pointerdown` 先在那一排里拦住，不然「点外面就收」会把它当成点了外面 |
| 时间差 | rAF 的时间戳可能比 `performance.now()` 早一帧，所有 dt 都 `max(0, …)` |
| 不动就不画 | 树枝、绳子、水滴各自一个循环，停稳了就停；树没动不重写路径 |

## 文件

| 文件 | 管什么 |
|---|---|
| `maple-crab.js` | 本体，对外只有 `window.MapleCrab` |
| `maple-crab.css` | 样式 |
| `crab-art.js` | 螃蟹长什么样，对外是 `window.MapleCrabArt` |
| `crab/*.svg` | 六张会动的螃蟹 |
| `demo.html` | 演示页 |
| `CREDITS.md` | clawd-tank 的许可全文 |

## 协议

跟整个仓库一样：[MIT](../../LICENSE)。螃蟹的身子来自 clawd-tank（MIT，Copyright (c) 2026 Marcio Granzotto Rodrigues），拿走时把 [CREDITS.md](CREDITS.md) 一起带上。
