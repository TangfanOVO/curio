# 纸团换页

把页面上的一块（比如一整页聊天）揉成纸团：纸先起皱，四边带着上面的字卷进去，揉成一团。团能抓起来甩，会撞墙、落地弹两下、贴地滚，停稳了慢慢淡掉。适合放在「新开一段」「清空」这类按钮后面。

纯原生 JS，画用 WebGL，没有 three.js。截图用 [html-to-image](https://github.com/bubkoo/html-to-image)（MIT）：页面上已经有就直接用，没有就从 jsDelivr 加载。

## 怎么打开

```bash
# 在仓库根目录
python3 -m http.server 8000
# 打开 http://localhost:8000/components/paper-crumple/demo.html
```

## 装进你的页面

```html
<script src="paper-crumple.js"></script>
<script>
  PaperCrumple.crumple(document.querySelector('.chat'), {
    host: document.querySelector('.phone'),       // 纸团在哪个盒子里飞
    floor: () => 600                              // 地面在 host 里的 y（px），不给就是 host 底边
  }).then(() => {
    // 纸团没了，这时候把原来那块清空或换成新的
  });
</script>
```

揉的时候原来那块会先被藏起来（`visibility: hidden`），纸团消失时还原，`then` 里再决定它变成什么样。

| 选项 | 默认 | 是什么 |
|---|---|---|
| `host` | `el.parentElement` | 纸团在哪个盒子里飞，画布盖住它 |
| `floor` | host 底边 | 地面的 y，数字或返回数字的函数 |
| `image` | 无 | 自己给好的截图（img 或 canvas），给了就不用 html-to-image |
| `background` | `el` 的背景色 | 截图的底色 |
| `backColor` | `#F0E9DD` | 纸背面的颜色 |
| `duration` | `1000` | 揉多久，毫秒 |
| `wait` | `1800` | 揉好以后多久没人抓就自己掉，毫秒 |
| `sharpness` | `0.55` | 折痕多硬：0 是圆润的皱，1 是一块一块的硬折 |

系统设置里开了「减少动态效果」时，只是淡出。没有 WebGL 或截不了图时，退成缩小转走。

## 怎么揉的

纸是一张三角网，边长不变。纸上有几组交叉的折痕，折痕附近更容易弯；整张纸再给一点高低起伏，决定哪儿往前拱、哪儿往后。然后一个跟着纸的形状慢慢收成球的壳从外往里压：纸面积缩不了，只能前后拱起来，就皱了。压短的弯折会记住，不回弹；隔得远的两层纸之间留一点厚度，团才是鼓的。整个过程在开始前一次算完（一两百毫秒），播放时在存下的形状之间插值。

思路是看了 [React Bits](https://reactbits.dev) 的 Paper Crumple（three.js）以后弄懂的。代码是另写的，没有用它的代码。
