/* ============================================================
   声界域 - 全局脚本（加载动画 / 悬浮控制 / 水印跑马灯）
   说明：加载动画不依赖真实资源清单，采用"假进度 + 真实完成"混合方案
   （详见下方进度驱动注释），保证启动节奏感的同时不卡页面
   ============================================================ */
(function () {
  'use strict'

  /* ---------- 加载遮罩：DOM 引用与阶段文案 ----------
     cover        - 整屏遮罩（含网格背景、Logo、进度条、扫屏层）
     fill         - 左侧竖向进度条的填充块
     percentEl    - 大号百分比数字
     statusText   - 状态文案（INITIALIZING / LOADING / READY ...）
     progressInfo - 进度数字 + 状态点的容器（同时承担移动端横向进度条）
     phase        - 当前阶段标记（init/loading/complete/sweeping/fadeout）
     statuses     - 各阶段对应的状态文案映射
     加载期间锁定页面滚动，结束后恢复 */
  var cover = document.getElementById('loading-cover')
  var fill = document.getElementById('progress-fill')
  var percentEl = document.getElementById('progress-percent')
  var statusText = document.getElementById('status-text')
  var progressInfo = document.getElementById('progress-info')
  var progress = 0
  var phase = 'init'
  var statuses = {
    init: 'INITIALIZING',
    loading: 'LOADING',
    complete: 'READY',
    sweeping: 'LAUNCHING',
    fadeout: 'WELCOME'
  }
  document.body.style.overflow = 'hidden'

  /* 100ms 后从"初始化"切入"加载中" */
  setTimeout(function () { phase = 'loading'; statusText.textContent = statuses.loading }, 100)

  /* ---------- 进度驱动：缓动到 50% 短暂停顿 → 再缓动到 85%（封顶）→ 真实 load 后收尾 ----------
     设计说明：
       - 前两段（0→50%、50 停顿 350ms、50→85%）是"假进度"，
         用二次缓出曲线制造自然的加载节奏；
       - 85% 封顶后保持不动，等 window.load 真实事件；
         所有资源加载完成后才允许跳到 100% 收尾；
       - 兜底：5 秒后无论 load 是否触发都强制收尾，避免页面卡死在遮罩下。
     CAP     - 假进度封顶值（85%）
     HOLD    - 中途停顿的百分比位置（50%）
     HOLD_MS - 停顿时长（350ms）
     holdUntil - 记录到达 50% 的时刻，用于计算停顿结束时间
     finished  - 收尾是否已开始（防止重复收尾） */
  var CAP = 85
  var HOLD = 50
  var HOLD_MS = 350
  var holdUntil = 0
  var finished = false
  var startTime = Date.now()

  /* 把进度同步到 DOM：CSS 变量驱动进度条高度/位置，文本显示整数百分比
     --progress     : 进度条高度（桌面）与宽度（移动端）共用
     --progress-num : 移动端进度信息气泡的横向位移依据 */
  function render () {
    fill.style.setProperty('--progress', progress + '%')
    progressInfo.style.setProperty('--progress', progress + '%')
    progressInfo.style.setProperty('--progress-num', progress)
    percentEl.textContent = Math.floor(progress) + '%'
  }

  /** 二次缓出插值：elapsed 为秒，0.6 秒内从 from 缓动到 to（越接近目标增幅越小） */
  function easeTo (elapsed, from, to) {
    var t = Math.min(elapsed / 0.6, 1)
    return from + (to - from) * (1 - (1 - t) * (1 - t))
  }

  /* 80ms 心跳：按时间分三段推进进度，直到收尾标志置位 */
  var timer = setInterval(function () {
    if (finished) return
    var now = Date.now()
    if (progress < HOLD) {
      // 第一段：0 → 50%，到达时记录停顿起点
      progress = easeTo((now - startTime) / 1000, 0, HOLD)
      if (progress >= HOLD) holdUntil = now
    } else if (now - holdUntil < HOLD_MS) {
      // 第二段：50% 短暂停顿（营造加载中的"呼吸感"）
      progress = HOLD
    } else if (progress < CAP) {
      // 第三段：50 → 85%，此后停在 85% 等待真实 load 事件
      progress = easeTo((now - holdUntil - HOLD_MS) / 1000, HOLD, CAP)
    }
    render()
  }, 80)

  /* ---------- 收尾链：READY → 扫屏(LAUNCHING) → 淡出(WELCOME) → 移除遮罩 ----------
     时间轴：立即跳 100% → 等 100ms → 扫屏动画 400ms → 淡出 300ms → 删除遮罩并解锁滚动 */
  function finish () {
    if (finished) return
    finished = true
    clearInterval(timer)
    progress = 100
    render()
    phase = 'complete'
    statusText.textContent = statuses.complete
    setTimeout(function () {
      phase = 'sweeping'
      statusText.textContent = statuses.sweeping
      cover.classList.add('sweeping')          // 触发黄色扫屏动画
      setTimeout(function () {
        phase = 'fadeout'
        statusText.textContent = statuses.fadeout
        cover.classList.add('fadeout')         // 遮罩淡出
        setTimeout(function () {
          cover.parentNode.removeChild(cover)  // 移除遮罩
          document.body.style.overflow = ''    // 恢复页面滚动
        }, 300)
      }, 400)
    }, 100)
  }

  /* 收尾闸门：保证遮罩至少展示 1.2s（本地资源加载太快时也不闪没），
     不足则延时自调用补齐 */
  function tryFinish () {
    var elapsed = Date.now() - startTime
    if (elapsed >= 1200) finish()
    else setTimeout(tryFinish, Math.max(50, 1200 - elapsed))
  }

  /* 真实完成信号：window.load（CSS/JS/图片/字体全部就绪） */
  window.addEventListener('load', function () { tryFinish() })
  /* 兜底：5 秒强制收尾，load 事件异常也不会卡死 */
  setTimeout(function () { if (!finished) finish() }, 5000)

  /* ---------- 悬浮控制：回到顶部按钮与滚动百分比 ----------
     btn-top      ：点击平滑滚动回页面顶部
     scroll-percent：实时显示当前滚动进度百分比（滚动条外接指示） */
  var btnTop = document.getElementById('btn-top')
  var scrollPercent = document.getElementById('scroll-percent')

  btnTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  /* 滚动监听（passive 优化性能）：按 (已滚动高度 / 可滚动高度) 计算百分比 */
  window.addEventListener('scroll', function () {
    var st = window.scrollY
    var docH = document.documentElement.scrollHeight - window.innerHeight
    var p = docH > 0 ? Math.min((st / docH) * 100, 100) : 0
    scrollPercent.textContent = Math.round(p) + '%'
  }, { passive: true })

  /* ---------- 标题水印跑马灯：复制一份内容实现无缝循环 ----------
     CSS 动画 translateX(-50%) 循环，半份内容恰好被另一半无缝接上 */
  var marquee = document.getElementById('watermark-scroll')
  marquee.innerHTML += marquee.innerHTML

  /* ---------- 主题切换（浅色/深色） ----------
     初始值：localStorage 记忆 > 系统 prefers-color-scheme；
     点击右下角按钮切换并持久化；同步更新 theme-color（移动端浏览器外壳色） */
  var themeBtn = document.getElementById('btn-theme')
  var metaThemeColor = document.getElementById('meta-theme-color')
  var savedTheme = null
  try { savedTheme = localStorage.getItem('sf-theme') } catch (e) {}
  var preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  var currentTheme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : (preferDark ? 'dark' : 'light')

  function applyTheme (theme) {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('sf-theme', theme) } catch (e) {}
    if (metaThemeColor) metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f1419' : '#fafafa')
  }
  applyTheme(currentTheme)
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
    })
  }

  /* ---------- 禁止复制：拦截复制 / 剪切 / 拖拽 ----------
     全站禁止复制内容（配合 CSS 的 user-select: none）；
     例外：输入框（如搜索框）内允许正常选择与粘贴 */
  function isEditable (el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  }
  document.addEventListener('copy', function (e) {
    if (!isEditable(e.target)) e.preventDefault()
  })
  document.addEventListener('cut', function (e) {
    if (!isEditable(e.target)) e.preventDefault()
  })
  /* 禁止拖拽选中内容 / 拖走图片 */
  document.addEventListener('dragstart', function (e) {
    e.preventDefault()
  })
})()
