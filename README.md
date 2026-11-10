# curio 

一些前端玩具和乱七八糟的草稿，按 MIT 随便拿。纯前端，不接后端。


**先看再拿：https://tangfanovo.github.io/curio/** —— 假手机。

| 分类 | 是什么 | 先开哪个 | 协议 |
|---|---|---|---|
| 组件 · [`components/maple-crab`](components/maple-crab) | **前台螃蟹**：聊天页顶栏下面挂一只像素小螃蟹，吊在一根从右边伸进来的枫枝上，或者抓着一根绳子荡（秋千）。点它或往下拽，顶栏下面长出一排菜单（未读、去哪儿、长按、设置、玩一下），点哪个就像一滴水那样涨出下拉；长按它，选个小东西满屏落下来；还能把这页聊天的字切着玩。叶子自己会飘，落在打字框上 | `demo.html` | MIT（螃蟹的身子来自 [clawd-tank](https://github.com/marciogranzotto/clawd-tank)，也是 MIT） |
| 组件 · [`components/paper-crumple`](components/paper-crumple) | **纸团换页**：把页面上的一块揉成纸团，字跟着纸一起皱进去。揉好的团能抓起来甩，撞墙、落地弹、贴地滚，停稳了淡掉。画用 WebGL，没有 three.js | `demo.html` | MIT |

每个文件夹都是独立的：单独拷走一个就能用，各自的 README 里写着怎么装进你自己的页面、能调哪些参数。
这里有的还是草稿，改得会比较勤。反正什么时候鬼脑一发作就开始做玩具，没有上游协议要求的话都放这里。
依旧是虽然个人喜好不会影响mit协议本身的授权范围，但是还是不太愿意讨厌蔡依林的人使用。

## 怎么打开

```bash
git clone https://github.com/TangfanOVO/curio.git
cd curio
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000 就是那台假手机
```

首页要从手机外面拨手机里的开关，浏览器在 `file://` 下不让，所以要起一个本地服务器。手机上看效果最好。

## 协议

[MIT](LICENSE)：

| 你打算怎么用 | 要做什么 |
|---|---|
| 自己用、改、发出去、商用 | 都行，留着 [LICENSE](LICENSE) 里那段版权和许可 |
| 拿走一个文件夹 | 那个文件夹里要是有 `CREDITS.md`（用到了别人的东西），一起带上 |
