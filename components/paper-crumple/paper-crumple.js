/* paper-crumple · 把页面上的一块揉成纸团，揉好了能抓起来甩
   MIT，见仓库根目录的 LICENSE

   怎么揉的：
   1. 纸是一张三角网，每条边的长度不变（纸拉不长，也压不短）。
   2. 纸上有几组折痕：每组一个走向、隔一段就是一道，几组交叉起来就是一张折痕网；折痕附近的弯折更软。
      再给整张纸一点高低起伏，有的地方先往前拱、有的往后，定下哪里是山折哪里是谷折。
   3. 一个跟着纸的形状（长方形的外接椭圆）慢慢收成球的壳从外往里压。纸面积缩不了，只能前后拱起来，于是皱了。
   4. 被压短的弯折记住新的长度，不回弹；纸上隔得远的两个点揉到一起时留一点厚度，团才是鼓的。
   5. 整个过程在开始前一次算完（一两百毫秒），播放时在存下的形状之间插值。
   画用 WebGL（自己写的着色器，不依赖 three.js）：正面贴这一块的截图，背面是纸色；按朝向打光，
   折痕处的明暗半软半硬，压在团里面的更暗一些，再加一层细细的纸纹。平着的时候不打光，跟原来那块一模一样。
   截图默认用 html-to-image（MIT），页面上没有就从 CDN 加载。没有 WebGL 或截不了图时，退成缩小转走。 */
(function (root) {
  'use strict';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seeded = function (s) { return function () { return (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }; };
  var H2I = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';

  function loadScript(src) {
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  function shoot(el, bg) {
    return (root.htmlToImage ? Promise.resolve() : loadScript(H2I)).then(function () {
      return root.htmlToImage.toPng(el, { pixelRatio: Math.min(2, root.devicePixelRatio || 1), backgroundColor: bg });
    }).then(function (url) { var im = new Image(); im.src = url; return im.decode().then(function () { return im; }); });
  }
  function rgb(c) {
    var m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return [.94, .91, .87];
    var v = parseInt(m[1], 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
  }
  /* 3×3 旋转，按行放 */
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  function mul(A, B) {
    var o = new Array(9);
    for (var k = 0; k < 9; k++) { var r = (k / 3 | 0) * 3, c = k % 3; o[k] = A[r] * B[c] + A[r + 1] * B[c + 3] + A[r + 2] * B[c + 6]; }
    return o;
  }

  /* 算整个揉的过程。单位：纸宽 = 1，中心在原点，y 朝下，z 朝着看的人 */
  function fold(cols, rows, asp, seed) {
    var rnd = seeded(seed), n = (cols + 1) * (rows + 1), P = new Float32Array(n * 3), Q, uv = new Float32Array(n * 2), tri = [];
    var r, q, i, j, k;
    for (r = 0; r <= rows; r++) for (q = 0; q <= cols; q++) {
      i = r * (cols + 1) + q;
      var rim = q === 0 || q === cols || r === 0 || r === rows;
      var u = (q + (rim ? 0 : (rnd() - .5) * .44)) / cols, v = (r + (rim ? 0 : (rnd() - .5) * .44)) / rows;   // 格点抖一抖，褶子才不是一格一格的
      uv[i * 2] = u; uv[i * 2 + 1] = v; P[i * 3] = u - .5; P[i * 3 + 1] = (v - .5) * asp;
      if (q < cols && r < rows) { var a = i, b = i + 1, c = i + cols + 1, d = c + 1; if (rnd() < .5) tri.push(a, b, d, a, d, c); else tri.push(a, b, c, b, d, c); }
    }
    /* 三角都排成同一个绕向（正面朝着看的人），画的时候好分正反 */
    for (k = 0; k < tri.length; k += 3) {
      var A0 = tri[k], B0 = tri[k + 1], C0 = tri[k + 2];
      if ((uv[B0 * 2] - uv[A0 * 2]) * (uv[C0 * 2 + 1] - uv[A0 * 2 + 1]) - (uv[C0 * 2] - uv[A0 * 2]) * (uv[B0 * 2 + 1] - uv[A0 * 2 + 1]) < 0) { tri[k + 1] = C0; tri[k + 2] = B0; }
    }
    Q = P.slice();
    /* 几组折痕：每组一个走向，隔 gap 一道，位置错开一点 */
    var sets = [];
    for (k = 0; k < 7; k++) { var t = rnd() * Math.PI; sets.push({ nx: -Math.sin(t), ny: Math.cos(t), gap: .28 + rnd() * .3, off: rnd(), w: .5 + rnd() * .5 }); }
    function crease(x, y) {
      var best = 0;
      for (var s = 0; s < sets.length; s++) {
        var f = sets[s], p = (x * f.nx + y * f.ny) / f.gap + f.off, d = (p - Math.round(p)) * f.gap;
        best = Math.max(best, Math.exp(-d * d * 520) * f.w);
      }
      return best;
    }
    /* 整张纸的高低起伏：几道斜着的波叠在一起 */
    var waves = [];
    for (k = 0; k < 6; k++) { var tw = rnd() * Math.PI * 2, fq = 5 + rnd() * 7; waves.push({ x: Math.cos(tw) * fq, y: Math.sin(tw) * fq, ph: rnd() * Math.PI * 2, w: .4 + rnd() * .6 }); }
    var lift = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var z = 0; for (k = 0; k < waves.length; k++) z += Math.sin(P[i * 3] * waves[k].x + P[i * 3 + 1] * waves[k].y + waves[k].ph) * waves[k].w;
      lift[i] = z / waves.length * 2 + (rnd() - .5) * .4;
    }
    /* 每个点碰到的壳大小不一样，边缘才是毛的，不是一个光滑的蛋 */
    var reach = new Float32Array(n); for (i = 0; i < n; i++) reach[i] = .86 + rnd() * .26;
    function dist(a, b) { return Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); }
    /* 杆：三角的边。弯：相邻两块三角的两个对角点，弯折就是它变短；折痕附近软 */
    var seen = new Map(), rods = [], bends = [];
    for (var t3 = 0; t3 < tri.length; t3 += 3) for (k = 0; k < 3; k++) {
      var A = tri[t3 + k], B = tri[t3 + (k + 1) % 3], O = tri[t3 + (k + 2) % 3], key = A < B ? A * n + B : B * n + A, other = seen.get(key);
      if (other === undefined) { seen.set(key, O); rods.push(A, B, dist(A, B)); }
      else bends.push(other, O, dist(other, O), .7 - .62 * crease((P[A * 3] + P[B * 3]) / 2, (P[A * 3 + 1] + P[B * 3 + 1]) / 2));
    }
    function pull(L, stride, k0, back) {
      var m = L.length / stride;
      for (var jj = 0; jj < m; jj++) {
        var e = (back ? m - 1 - jj : jj) * stride, a = L[e] * 3, b = L[e + 1] * 3, dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2], d = Math.hypot(dx, dy, dz);
        if (d < 1e-7) continue;
        var s = (1 - L[e + 2] / d) * .5 * k0 * (stride === 4 ? L[e + 3] : 1);
        P[a] += dx * s; P[a + 1] += dy * s; P[a + 2] += dz * s; P[b] -= dx * s; P[b + 1] -= dy * s; P[b + 2] -= dz * s;
      }
    }
    /* 两层纸之间的厚度：纸上隔得远的两点，揉到一起也不贴死 */
    var gap = .036, far2 = .05, box = new Map(), CX = new Int16Array(n), CY = new Int16Array(n), CZ = new Int16Array(n);
    function cellKey(a, b, c) { return ((a + 64) * 128 + (b + 64)) * 128 + (c + 64); }
    function keepApart() {
      box.clear();
      for (var a = 0; a < n; a++) {
        CX[a] = Math.floor(P[a * 3] / gap); CY[a] = Math.floor(P[a * 3 + 1] / gap); CZ[a] = Math.floor(P[a * 3 + 2] / gap);
        var kk = cellKey(CX[a], CY[a], CZ[a]), list = box.get(kk); if (!list) box.set(kk, list = []); list.push(a);
      }
      for (var p = 0; p < n; p++) for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) for (var oz = -1; oz <= 1; oz++) {
        var cell = box.get(cellKey(CX[p] + ox, CY[p] + oy, CZ[p] + oz)); if (!cell) continue;
        for (var ci = 0; ci < cell.length; ci++) {
          var w = cell[ci]; if (w <= p) continue;
          var du = uv[p * 2] - uv[w * 2], dv = (uv[p * 2 + 1] - uv[w * 2 + 1]) * asp; if (du * du + dv * dv < far2) continue;
          var dx = P[w * 3] - P[p * 3], dy = P[w * 3 + 1] - P[p * 3 + 1], dz = P[w * 3 + 2] - P[p * 3 + 2], d = Math.hypot(dx, dy, dz);
          if (d >= gap || d < 1e-7) continue;
          var s = (gap - d) / d * .5;
          P[p * 3] -= dx * s; P[p * 3 + 1] -= dy * s; P[p * 3 + 2] -= dz * s; P[w * 3] += dx * s; P[w * 3 + 1] += dy * s; P[w * 3 + 2] += dz * s;
        }
      }
    }
    var r1 = .13 * Math.sqrt(asp), steps = 140, shots = [P.slice()];
    for (var st = 1; st <= steps; st++) {
      var tt = st / steps, e = tt * tt * (3 - 2 * tt);
      var ex = .72 + (r1 * .95 - .72) * e, ey = .72 * asp + (r1 * 1.05 - .72 * asp) * e, ez = .6 + (r1 * .85 - .6) * e;
      for (j = 0; j < n * 3; j++) { var vel = clamp((P[j] - Q[j]) * .6, -.02, .02); Q[j] = P[j]; P[j] += vel; }   // 带一点惯性
      for (i = 0; i < n; i++) P[i * 3 + 2] += lift[i] * .0009 * Math.sin(tt * Math.PI);
      for (var it = 0; it < 10; it++) {
        pull(bends, 4, .3, it & 1);
        for (i = 0; i < n; i++) {
          var dd = Math.hypot(P[i * 3] / ex, P[i * 3 + 1] / ey, P[i * 3 + 2] / ez);
          if (dd > reach[i]) {   // 壳外的往里推；被推的边顺势往前或往后卷，不平躺在壳上
            var kk2 = (1 - reach[i] / dd) * .5; P[i * 3] *= 1 - kk2; P[i * 3 + 1] *= 1 - kk2; P[i * 3 + 2] *= 1 - kk2;
            P[i * 3 + 2] += (lift[i] < 0 ? -1 : 1) * (dd - reach[i]) * .05;
          }
        }
        pull(rods, 3, 1, !(it & 1));
        if (it % 4 === 3) keepApart();
      }
      for (j = 0; j < bends.length; j += 4) { var cur = dist(bends[j], bends[j + 1]); if (cur < bends[j + 2] * .9) bends[j + 2] += (cur - bends[j + 2]) * .18; }   // 折过的回不去
      if (st % 2 === 0) shots.push(P.slice());
    }
    return { shots: shots, uv: uv, tri: tri, n: n };
  }

  /* ── WebGL 那一层 ── */
  var VS = [
    'attribute vec3 aP;attribute vec3 aN;attribute vec2 aU;attribute float aO;',
    'uniform mat3 uM;uniform vec2 uC;uniform float uS;uniform vec2 uV;uniform float uF;',
    'varying vec2 vU;varying vec3 vN;varying vec3 vP;varying float vO;',
    'void main(){vec3 p=uM*aP;float w=(uF-p.z)/uF;vec2 s=uC+p.xy*uS/w;',
    'gl_Position=vec4((s.x/uV.x*2.-1.)*w,(1.-s.y/uV.y*2.)*w,-p.z*.3*w,w);',
    'vU=aU;vN=uM*aN;vP=p*uS;vO=aO;}'
  ].join('\n');
  var FS = [
    '#ifdef GL_OES_standard_derivatives', '#extension GL_OES_standard_derivatives : enable', '#endif',
    'precision mediump float;',
    'uniform sampler2D uT;uniform vec3 uB;uniform float uL;uniform float uH;',
    'varying vec2 vU;varying vec3 vN;varying vec3 vP;varying float vO;',
    'void main(){vec3 n=normalize(vN);',
    '#ifdef GL_OES_standard_derivatives',
    'vec3 f=normalize(cross(dFdx(vP),dFdy(vP)));if(dot(f,n)<0.)f=-f;n=normalize(mix(n,f,uH));',   // 折痕半软半硬
    '#endif',
    'vec3 c;if(gl_FrontFacing){c=texture2D(uT,vU).rgb;}else{c=uB;n=-n;}',
    'float d=max(dot(n,normalize(vec3(-.42,-.62,.66))),0.);',
    'float g=fract(sin(dot(floor(vU*vec2(620.,1100.)),vec2(12.9898,78.233)))*43758.5453);',   // 纸纹
    'vec3 lit=c*(.5+.74*d)*vO*(1.-.05*g);',
    'gl_FragColor=vec4(mix(c,lit,uL),1.);}'
  ].join('\n');

  function makeGL(cv) {
    var gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }); if (!gl) return null;
    gl.getExtension('OES_standard_derivatives');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    return { gl: gl, pr: pr };
  }

  /* 截不了图、没有 WebGL、或者用户要求少动画时的退路 */
  function simple(el, reduced) {
    var a = el.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'none', opacity: 1 }, { transform: 'scale(.15) rotate(220deg)', opacity: 0 }],
      { duration: reduced ? 220 : 700, easing: 'cubic-bezier(.5,0,.75,0)' });
    return a.finished.then(function () {});
  }

  /**
   * crumple(el, opts) → Promise，纸团消失以后 resolve。
   * opts.host        纸团在哪个盒子里飞（画布盖住它），默认 el.parentElement
   * opts.floor       地面在 host 里的 y（px），或者返回它的函数；默认 host 的底边
   * opts.image       自己给好的截图（img / canvas）；不给就用 html-to-image 截 el
   * opts.background  截图的底色，默认取 el 的背景色，取不到用 #ffffff
   * opts.backColor   纸背面的颜色，默认 #F0E9DD
   * opts.duration    揉多久（毫秒），默认 1000
   * opts.wait        揉好以后等多久没人抓就自己掉（毫秒），默认 1800
   * opts.sharpness   折痕多硬，0 是圆润的皱、1 是一块一块的硬折，默认 0.55
   */
  function crumple(el, opts) {
    opts = opts || {};
    var host = opts.host || el.parentElement || document.body;
    var reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return simple(el, true);
    var bg = opts.background || (function () { var c = getComputedStyle(el).backgroundColor; return c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' ? c : '#ffffff'; })();
    var got = opts.image ? Promise.resolve(opts.image) : shoot(el, bg);
    return got.then(function (img) { return run(el, host, img, opts); }).catch(function (err) {
      if (root.console) console.warn('paper-crumple: 退成简单的缩小转走', err);
      el.style.visibility = '';
      return simple(el, false);
    });
  }

  function run(el, host, img, opts) {
    var hr = host.getBoundingClientRect(), er = el.getBoundingClientRect(), W0 = hr.width, H0 = hr.height, dpr = Math.min(2, root.devicePixelRatio || 1);
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;left:' + hr.left + 'px;top:' + hr.top + 'px;width:' + W0 + 'px;height:' + H0 + 'px;z-index:2147483000;touch-action:none;cursor:grab';
    cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr);
    var ctx = makeGL(cv); if (!ctx) throw new Error('没有 WebGL');
    var gl = ctx.gl, pr = ctx.pr;
    var R0 = { x: er.left - hr.left, y: er.top - hr.top, w: er.width, h: er.height }, asp = R0.h / R0.w, cols = 12, rows = Math.max(12, Math.round(cols * asp)), S = R0.w;
    var paper = fold(cols, rows, asp, (Math.random() * 1e9) | 0), shots = paper.shots, uv = paper.uv, tri = paper.tri, n = paper.n;
    var X = Float32Array.from(shots[0]), N = new Float32Array(n * 3), O = new Float32Array(n).fill(1);
    var dur = opts.duration || 1000, waitMs = opts.wait == null ? 1800 : opts.wait, F = 3.5;
    var floor = function () { var f = typeof opts.floor === 'function' ? opts.floor() : opts.floor; return f == null ? H0 : f; };

    function buf(data, size, name, dynamic) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b;
    }
    var bP = buf(X, 3, 'aP', true), bN = buf(N, 3, 'aN', true), bO = buf(O, 1, 'aO', true); buf(uv, 2, 'aU', false);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tri), gl.STATIC_DRAW);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    var U = {}; ['uM', 'uC', 'uS', 'uV', 'uF', 'uT', 'uB', 'uL', 'uH'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    gl.uniform1f(U.uS, S); gl.uniform2f(U.uV, W0, H0); gl.uniform1f(U.uF, F); gl.uniform1i(U.uT, 0);
    var bc = rgb(opts.backColor || '#F0E9DD'); gl.uniform3f(U.uB, bc[0], bc[1], bc[2]);
    gl.uniform1f(U.uH, opts.sharpness == null ? .55 : clamp(opts.sharpness, 0, 1));
    gl.viewport(0, 0, cv.width, cv.height); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.frontFace(gl.CW); gl.clearColor(0, 0, 0, 0);

    /* 每个点的法线（周围三角的朝向加起来），和它被压在团里多深 */
    function shade(deep) {
      var i, k; N.fill(0);
      for (k = 0; k < tri.length; k += 3) {
        var a = tri[k] * 3, b = tri[k + 1] * 3, c = tri[k + 2] * 3;
        var ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[c] - X[a], vy = X[c + 1] - X[a + 1], vz = X[c + 2] - X[a + 2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        N[a] += nx; N[a + 1] += ny; N[a + 2] += nz; N[b] += nx; N[b + 1] += ny; N[b + 2] += nz; N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
      }
      var cx = 0, cy = 0, cz = 0, rm = 1e-6;
      for (i = 0; i < n; i++) { cx += X[i * 3]; cy += X[i * 3 + 1]; cz += X[i * 3 + 2]; }
      cx /= n; cy /= n; cz /= n;
      for (i = 0; i < n; i++) rm = Math.max(rm, Math.hypot(X[i * 3] - cx, X[i * 3 + 1] - cy, X[i * 3 + 2] - cz));
      for (i = 0; i < n; i++) {
        var r = Math.hypot(X[i * 3] - cx, X[i * 3 + 1] - cy, X[i * 3 + 2] - cz) / rm, s = clamp((r - .3) / .7, 0, 1);
        O[i] = 1 - deep * (1 - (.5 + .5 * s * s * (3 - 2 * s)));
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, bP); gl.bufferSubData(gl.ARRAY_BUFFER, 0, X);
      gl.bindBuffer(gl.ARRAY_BUFFER, bN); gl.bufferSubData(gl.ARRAY_BUFFER, 0, N);
      gl.bindBuffer(gl.ARRAY_BUFFER, bO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, O);
    }
    function draw(M, cx, cy, lit) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix3fv(U.uM, false, [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]]);
      gl.uniform2f(U.uC, cx, cy); gl.uniform1f(U.uL, lit);
      gl.drawElements(gl.TRIANGLES, tri.length, gl.UNSIGNED_SHORT, 0);
    }

    return new Promise(function (resolve) {
      var phase = 'crumple', t0 = 0, last = 0, sx = R0.x + R0.w / 2, sy = R0.y + R0.h / 2, vx = 0, vy = 0, R = 60, M = [1, 0, 0, 0, 1, 0, 0, 0, 1], waited = 0, still = 0, grab = null, raf = 0;
      function setShape(f) {
        var fr = clamp(f, 0, 1) * (shots.length - 1), lo = Math.floor(fr), hi = Math.min(lo + 1, shots.length - 1), m = fr - lo, A = shots[lo], B = shots[hi];
        for (var i = 0; i < X.length; i++) X[i] = A[i] + (B[i] - A[i]) * m;
      }
      /* 揉好了：重心挪到球心，好当一个球甩 */
      function toBall() {
        var ox = 0, oy = 0, oz = 0, rm = 0, i;
        for (i = 0; i < n; i++) { ox += X[i * 3]; oy += X[i * 3 + 1]; oz += X[i * 3 + 2]; }
        ox /= n; oy /= n; oz /= n;
        for (i = 0; i < n; i++) { X[i * 3] -= ox; X[i * 3 + 1] -= oy; X[i * 3 + 2] -= oz; rm = Math.max(rm, Math.hypot(X[i * 3], X[i * 3 + 1], X[i * 3 + 2])); }
        sx += (M[0] * ox + M[1] * oy + M[2] * oz) * S; sy += (M[3] * ox + M[4] * oy + M[5] * oz) * S; R = rm * S * .86;
        shade(1);
      }
      function pt(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      function down(e) {
        if (phase === 'crumple' || phase === 'fade') return;
        var p = pt(e); if (Math.hypot(p.x - sx, p.y - sy) > R * 1.5) return;
        e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
        grab = { dx: sx - p.x, dy: sy - p.y, t: performance.now() }; phase = 'held'; vx = vy = 0; cv.style.cursor = 'grabbing';
      }
      function move(e) {
        if (!grab) return;
        var p = pt(e), now = performance.now(), dt = Math.max(.008, (now - grab.t) / 1000), nx = p.x + grab.dx, ny = p.y + grab.dy;
        vx = vx * .5 + ((nx - sx) / dt) * .5; vy = vy * .5 + ((ny - sy) / dt) * .5;
        M = mul(mul(rotZ((nx - sx) / R), rotX(-(ny - sy) / R * .6)), M);   // 拖着走的时候团跟着滚
        sx = nx; sy = ny; grab.t = now;
      }
      function up() {
        if (!grab) return; grab = null; cv.style.cursor = 'grab';
        var sp = Math.hypot(vx, vy); if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; }
        phase = 'fly';
      }
      cv.addEventListener('pointerdown', down); root.addEventListener('pointermove', move); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);

      function frame(now) {
        var dt = Math.max(0, Math.min(.033, (now - last) / 1000)); last = now;
        if (phase === 'crumple') {
          var k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);   // 两头慢中间快，看得见起皱
          setShape(e); shade(e * e); M = mul(rotZ(e * .4), rotX(e * .3)); draw(M, sx, sy, clamp(e / .3, 0, 1));
          if (k >= 1) { toBall(); phase = 'wait'; }
        } else {
          var show = M;
          if (phase === 'wait') {   // 浮着等人抓；不理就自己掉
            waited += dt * 1000; sy += Math.sin(now / 170) * .35; show = mul(rotY(Math.sin(now / 420) * .18), M);
            if (waited > waitMs) { phase = 'fly'; vx = (Math.random() - .5) * 180; vy = -80; }
          } else if (phase === 'fly' || phase === 'fade') {
            vy += 2300 * dt; sx += vx * dt; sy += vy * dt;
            var fl = floor() - R;
            if (sy > fl) { sy = fl; if (vy > 0) { vy = -vy * .46; vx *= .84; if (Math.abs(vy) < 90) vy = 0; } }   // 落地弹一下、再弹小一下
            if (sx < R) { sx = R; vx = -vx * .55; } if (sx > W0 - R) { sx = W0 - R; vx = -vx * .55; } if (sy < R) { sy = R; vy = Math.abs(vy) * .5; }
            var ground = sy >= fl - .5 && vy === 0;
            if (ground) { vx *= Math.pow(.3, dt); still += dt; } else still = 0;
            M = mul(mul(rotZ(vx * dt / R), rotX(-vy * dt / R * .35)), M); show = M;   // 滚着转
            if (phase === 'fly' && (still > .45 || (ground && Math.abs(vx) < 10))) {
              phase = 'fade'; cv.style.transition = 'opacity .9s ease'; cv.style.opacity = '0'; setTimeout(done, 950);
            }
          }
          draw(show, sx, sy, 1);
        }
        raf = requestAnimationFrame(frame);
      }
      function done() {
        cancelAnimationFrame(raf);
        cv.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up);
        var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        cv.remove(); el.style.visibility = vis; resolve();
      }
      var vis = el.style.visibility;
      document.body.appendChild(cv); shade(0); draw(M, sx, sy, 0);
      requestAnimationFrame(function () { el.style.visibility = 'hidden'; t0 = last = performance.now(); raf = requestAnimationFrame(frame); });   // 纸先盖上去，再藏下面那块，不闪
    });
  }

  root.PaperCrumple = { crumple: crumple };
})(window);
