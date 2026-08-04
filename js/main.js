/**
 * 声界域 (SOUNDFIELD SPACE) - 音频档案数据源与动态渲染
 *
 * 职责：
 *   1. 提供全站唯一的音频数据源 audioDataList（日期 + 音频路径）
 *   2. 页面加载后动态构建「月份区块 → 时间线 → 声音条目」三级结构
 *   3. 绑定逐条播放/停止、倍速切换、音量切换、时长回填等交互
 *   4. 提供「一键正放 / 一键倒放」全局控制（Web Audio 反转 PCM 数据）
 *   5. 根据收录数量自动更新档案阶段名（STAGE_MILESTONES + getStage）
 *
 * 说明：
 *   - 实现方式迁移自 Sound 项目 js/main.js（动态创建卡片的方式）
 *   - src 路径相对于 index.html 所在目录
 *   - 新增录音时，请用 tools.py 自动维护本文件（不要手工改结构）
 */

/* ============================================================
   音频数据源：每条记录 = { date: 录入时间文案, src: 音频文件路径 }
   date 格式："YYYY年MM月DD日 星期X HH:MM"
   src  格式："sounds/YYYY-MM-DD_HH-MM.ogg"（与 sounds 目录文件一一对应）
   ============================================================ */
const audioDataList = [
    { date: "2026年07月12日 星期日 23:27", src: "sounds/2026-07-12_23-27.ogg" },
    { date: "2026年07月13日 星期一 14:55", src: "sounds/2026-07-13_14-55.ogg" },
    { date: "2026年07月13日 星期一 14:55", src: "sounds/2026-07-13_14-55-2.ogg" },
    { date: "2026年07月13日 星期一 17:05", src: "sounds/2026-07-13_17-05.ogg" },
    { date: "2026年07月13日 星期一 17:17", src: "sounds/2026-07-13_17-17.ogg" },
    { date: "2026年07月13日 星期一 19:12", src: "sounds/2026-07-13_19-12.ogg" },
    { date: "2026年07月14日 星期二 14:01", src: "sounds/2026-07-14_14-01.ogg" },
    { date: "2026年07月14日 星期二 14:04", src: "sounds/2026-07-14_14-04.ogg" },
    { date: "2026年07月14日 星期二 22:34", src: "sounds/2026-07-14_22-34.ogg" },
    { date: "2026年07月15日 星期三 16:33", src: "sounds/2026-07-15_16-33.ogg" },
    { date: "2026年07月15日 星期三 17:23", src: "sounds/2026-07-15_17-23.ogg" },
    { date: "2026年07月15日 星期三 17:28", src: "sounds/2026-07-15_17-28.ogg" },
    { date: "2026年07月15日 星期三 22:22", src: "sounds/2026-07-15_22-22.ogg" },
    { date: "2026年07月16日 星期四 13:40", src: "sounds/2026-07-16_13-40.ogg" },
    { date: "2026年07月16日 星期四 14:15", src: "sounds/2026-07-16_14-15.ogg" },
    { date: "2026年07月17日 星期五 11:40", src: "sounds/2026-07-17_11-40.ogg" },
    { date: "2026年07月17日 星期五 14:31", src: "sounds/2026-07-17_14-31.ogg" },
    { date: "2026年07月17日 星期五 17:18", src: "sounds/2026-07-17_17-18.ogg" },
    { date: "2026年07月17日 星期五 17:22", src: "sounds/2026-07-17_17-22.ogg" },
    { date: "2026年07月18日 星期六 19:18", src: "sounds/2026-07-18_19-18.ogg" },
    { date: "2026年07月19日 星期日 11:37", src: "sounds/2026-07-19_11-37.ogg" },
    { date: "2026年07月19日 星期日 11:51", src: "sounds/2026-07-19_11-51.ogg" },
    { date: "2026年07月19日 星期日 11:53", src: "sounds/2026-07-19_11-53.ogg" },
    { date: "2026年07月19日 星期日 13:21", src: "sounds/2026-07-19_13-21.ogg" },
    { date: "2026年07月19日 星期日 13:23", src: "sounds/2026-07-19_13-23.ogg" },
    { date: "2026年07月20日 星期一 16:58", src: "sounds/2026-07-20_16-58.ogg" },
    { date: "2026年07月20日 星期一 17:00", src: "sounds/2026-07-20_17-00.ogg" },
    { date: "2026年07月22日 星期三 13:35", src: "sounds/2026-07-22_13-35.ogg" },
    { date: "2026年07月22日 星期三 13:56", src: "sounds/2026-07-22_13-56.ogg" },
    { date: "2026年07月23日 星期四 15:31", src: "sounds/2026-07-23_15-31.ogg" },
    { date: "2026年07月25日 星期六 16:03", src: "sounds/2026-07-25_16-03.ogg" },
    { date: "2026年07月25日 星期六 16:09", src: "sounds/2026-07-25_16-09.ogg" },
    { date: "2026年07月25日 星期六 16:28", src: "sounds/2026-07-25_16-28.ogg" },
    { date: "2026年07月26日 星期日 22:23", src: "sounds/2026-07-26_22-23.ogg" },
    { date: "2026年07月26日 星期日 23:10", src: "sounds/2026-07-26_23-10.ogg" },
    { date: "2026年07月27日 星期一 15:08", src: "sounds/2026-07-27_15-08.ogg" },
    { date: "2026年07月27日 星期一 16:42", src: "sounds/2026-07-27_16-42.ogg" },
    { date: "2026年07月27日 星期一 16:43", src: "sounds/2026-07-27_16-43.ogg" },
    { date: "2026年07月27日 星期一 16:44", src: "sounds/2026-07-27_16-44.ogg" },
    { date: "2026年07月27日 星期一 17:11", src: "sounds/2026-07-27_17-11.ogg" },
    { date: "2026年07月28日 星期二 08:38", src: "sounds/2026-07-28_08-38.ogg" },
    { date: "2026年07月29日 星期三 16:06", src: "sounds/2026-07-29_16-06.ogg" },
    { date: "2026年7月31日 星期五 16:19", src: "sounds/2026-07-31_16-19.ogg" },
    { date: "2026年7月31日 星期五 16:19", src: "sounds/2026-07-31_16-19-2.ogg" },
    { date: "2026年7月31日 星期五 16:19", src: "sounds/2026-07-31_16-19-3.ogg" },
    { date: "2026年7月31日 星期五 16:19", src: "sounds/2026-07-31_16-19-4.ogg" },
    { date: "2026年7月1日 星期三 09:33", src: "sounds/2026-07-01_09-33.ogg" },
    { date: "2026年7月1日 星期三 10:23", src: "sounds/2026-07-01_10-23.ogg" },
    { date: "2026年7月2日 星期四 11:53", src: "sounds/2026-07-02_11-53.ogg" },
    { date: "2026年7月2日 星期四 12:14", src: "sounds/2026-07-02_12-14.ogg" },
    { date: "2026年7月2日 星期四 14:23", src: "sounds/2026-07-02_14-23.ogg" },
    { date: "2026年7月2日 星期四 16:37", src: "sounds/2026-07-02_16-37.ogg" },
    { date: "2026年7月2日 星期四 18:38", src: "sounds/2026-07-02_18-38.ogg" },
    { date: "2026年7月2日 星期四 21:57", src: "sounds/2026-07-02_21-57.ogg" },
    { date: "2026年7月3日 星期五 11:46", src: "sounds/2026-07-03_11-46.ogg" },
    { date: "2026年7月4日 星期六 19:57", src: "sounds/2026-07-04_19-57.ogg" },
];

/* 中文星期 → 英文大写（用于条目副标题与搜索索引的英文检索词） */
const WEEKDAY_EN = {
    "星期日": "SUNDAY",
    "星期一": "MONDAY",
    "星期二": "TUESDAY",
    "星期三": "WEDNESDAY",
    "星期四": "THURSDAY",
    "星期五": "FRIDAY",
    "星期六": "SATURDAY"
};

/**
 * 解析日期文案
 * 输入："2026年07月12日 星期日 23:27"（以空格分隔成 3 段）
 * 输出：
 *   yy      - 年份（字符串，如 "2026"）
 *   mm      - 月份（字符串，如 "7"）
 *   dd      - 日（字符串，如 "12"）
 *   iso     - 补零后的 ISO 日期（如 "2026-07-12"，用于时间排序）
 *   weekday - 英文星期（如 "SUNDAY"，无法识别时回退为原文）
 *   time    - 时分（如 "23:27"）
 */
function parseDate(dateStr) {
    const parts = dateStr.split(" ");
    const m = parts[0].match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    const weekCn = parts[1] || "";
    return {
        yy: m[1],
        mm: m[2],
        dd: m[3],
        iso: m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0"),
        weekday: WEEKDAY_EN[weekCn] || weekCn,
        time: parts[2] || ""
    };
}

/**
 * 秒数 → "MM:SS" 时长文案（用于时长回填与播放进度显示）
 * 规则：非法/负数输入返回 "--:--"；四舍五入到秒，60 秒自动进位
 */
function formatDuration(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    let mm = Math.floor(sec / 60);
    let ss = Math.round(sec % 60);
    if (ss === 60) { mm++; ss = 0; }
    return String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

/**
 * 档案阶段里程碑表（每 50 件一个阶段，覆盖 0 ~ 500+ 件）
 * 规则：条目按 threshold 从大到小排列，取第一个 count >= threshold 的标题；
 *       500 件以上封顶在最后一档（THE DOMAIN COMPLETE）。
 * 说明：表项按数量级降序书写，getStage 遍历时首个命中即返回，
 *       与 Sound 项目 js/main.js 的 MILESTONES 机制一致。
 */
const STAGE_MILESTONES = [
    { threshold: 451, title: "THE DOMAIN COMPLETE" },
    { threshold: 401, title: "SOUNDS BECOME A RIVER" },
    { threshold: 351, title: "PEARLS OF THE SOUND SEA" },
    { threshold: 301, title: "TRUE ECHOES KEPT" },
    { threshold: 251, title: "MANY IN CHORUS" },
    { threshold: 201, title: "ALL HEARD" },
    { threshold: 151, title: "DOMAIN STAKED" },
    { threshold: 101, title: "ECHO WEAVE" },
    { threshold: 51, title: "INTO THE WILD" },
    { threshold: 1, title: "FIRST TAKING" },
    { threshold: 0, title: "AWAITING FIRST SOUND" },
];

/** 根据已收录数量返回当前阶段名（无匹配时回退到初始档） */
function getStage(count) {
    for (const m of STAGE_MILESTONES) {
        if (count >= m.threshold) return m.title;
    }
    return "AWAITING FIRST SOUND";
}

(function () {
    "use strict";

    const monthsWrap = document.getElementById("sound-months");

    /* ----- 按月份分组（数据驱动：遍历全部数据源，空月份不会渲染） ----- */
    const byMonth = {};
    audioDataList.forEach(function (item) {
        const p = parseDate(item.date);
        const key = p.yy + "-" + p.mm;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(item);
    });

    /* ----- 编号：先按时间正序排序，日期越靠前编号越小（SOUND_UNIT_001 起） ----- */
    const rankBySrc = {};
    audioDataList.slice().sort(function (a, b) {
        return parseDate(a.date).iso.localeCompare(parseDate(b.date).iso);
    }).forEach(function (item, i) {
        rankBySrc[item.src] = String(i + 1).padStart(3, "0");
    });

    /* 条目运行时引用表：{ entry, audio, action, curWrap, durSpan, speedEl, volEl, titleRow, no, p }
       entry    - 条目容器 <a>（整行可点击播放/暂停）
       audio    - 隐藏的 <audio> 播放器
       action   - ">> SOUND_ACCESS / 当前 / 总时长" 文案元素
       curWrap  - 播放中实时更新的当前秒数 span
       durSpan  - 元数据回填的总时长 span
       speedEl / volEl - 倍速与音量控制元素
       titleRow - 桌面端标题行容器（移动端联动用）
       no       - 三位编号（SOUND_UNIT_00X）
       p        - parseDate 的解析结果 */
    const entries = [];

    /* ----- 按月渲染区块：月份倒序（新月份在前） ----- */
    Object.keys(byMonth).sort().reverse().forEach(function (monthKey) {
        const list = byMonth[monthKey];

        /* ---- 区块头部：水印年份 + 月份标题 + 条数 + 归档状态 ---- */
        const block = document.createElement("div");
        block.className = "sound-block";
        block.setAttribute("data-block", monthKey);

        const head = document.createElement("div");
        head.className = "sound-log-heading";
        const watermark = document.createElement("div");
        watermark.className = "sound-log-watermark";
        watermark.textContent = "SOUND_" + monthKey.split("-")[0];
        const logTitle = document.createElement("h2");
        logTitle.className = "sound-log-title";
        logTitle.textContent = monthKey;
        const meta = document.createElement("span");
        meta.className = "sound-log-meta";
        meta.textContent = "// " + list.length + "_SOUNDS_FOUND";
        const flex = document.createElement("div");
        flex.style.flex = "1";
        const status = document.createElement("div");
        status.className = "sound-log-status";
        status.textContent = "STATUS: STORED";
        head.appendChild(watermark);
        head.appendChild(logTitle);
        head.appendChild(meta);
        head.appendChild(flex);
        head.appendChild(status);

        const timeline = document.createElement("div");
        timeline.className = "timeline";

        /* ---- 月内新条目在前（倒序渲染），逐条构建时间线项 ---- */
        list.slice().reverse().forEach(function (item) {
            const p = parseDate(item.date);
            const no = rankBySrc[item.src];

            /* 时间线外层：承接 data-search 供顶部搜索框全文检索
               （检索词 = 编号 + ISO 日期 + 英文星期 + 时分） */
            const itemWrap = document.createElement("div");
            itemWrap.className = "timeline-item";
            itemWrap.setAttribute(
                "data-search",
                "sound unit " + no + " " + p.iso + " " + p.weekday.toLowerCase() + " " + p.time
            );

            const connector = document.createElement("div");
            connector.className = "timeline-connector";
            const dot = document.createElement("div");
            dot.className = "timeline-dot";

            /* ---- 条目主体：左日期 + 中标题/副标题 + 右倍速音量 ---- */
            const entry = document.createElement("a");
            entry.href = "index.html";
            entry.className = "endspace-frame sound-entry";

            /* 左侧日期徽标：[MM-DD] */
            const dateEl = document.createElement("div");
            dateEl.className = "sound-entry-date";
            const dateSpan = document.createElement("span");
            dateSpan.textContent = "[" + p.mm.padStart(2, "0") + "-" + p.dd.padStart(2, "0") + "]";
            dateEl.appendChild(dateSpan);

            const action = document.createElement("div");
            action.className = "sound-entry-action";
            action.textContent = ">> SOUND_ACCESS / ";

            const curWrap = document.createElement("span");
            curWrap.className = "sound-cur-wrap";
            curWrap.hidden = true;
            curWrap.textContent = "00:00 / ";

            const durSpan = document.createElement("span");
            durSpan.className = "sound-dur";
            durSpan.textContent = "--:--";

            action.appendChild(curWrap);
            action.appendChild(durSpan);

            /* 中部：标题行（编号 + SOUND_ACCESS 文案）与副标题（星期 + 时间） */
            const mid = document.createElement("div");
            mid.style.minWidth = "0";
            const titleRow = document.createElement("div");
            titleRow.className = "sound-entry-title-row";
            const titleEl = document.createElement("h3");
            titleEl.className = "sound-entry-title";
            titleEl.textContent = "SOUND_UNIT_" + no;
            const tags = document.createElement("div");
            tags.className = "sound-entry-tags";
            const tagSpan = document.createElement("span");
            tagSpan.textContent = (p.weekday + " " + p.time).trim();
            tags.appendChild(tagSpan);
            titleRow.appendChild(titleEl);
            titleRow.appendChild(action);
            mid.appendChild(titleRow);
            mid.appendChild(tags);

            /* 右侧列：倍速与音量（移动端与 SOUND_ACCESS 文案同行，见下方联动逻辑） */
            const speedEl = document.createElement("div");
            speedEl.className = "sound-entry-speed";
            speedEl.textContent = "1.0x";

            const volEl = document.createElement("div");
            volEl.className = "sound-entry-vol";
            volEl.textContent = "100%";

            const side = document.createElement("div");
            side.className = "sound-entry-side";
            side.appendChild(speedEl);
            side.appendChild(volEl);

            entry.appendChild(dateEl);
            entry.appendChild(mid);
            entry.appendChild(side);

            /* 隐藏的音频播放器：preload=metadata 只为读取时长，不整段下载 */
            const audio = document.createElement("audio");
            audio.preload = "metadata";
            audio.src = item.src;
            audio.setAttribute("hidden", "");

            itemWrap.appendChild(connector);
            itemWrap.appendChild(dot);
            itemWrap.appendChild(entry);
            itemWrap.appendChild(audio);
            timeline.appendChild(itemWrap);

            entries.push({ entry: entry, audio: audio, action: action, curWrap: curWrap, durSpan: durSpan, speedEl: speedEl, volEl: volEl, titleRow: titleRow, no: no, p: p });
        });

        block.appendChild(head);
        block.appendChild(timeline);
        monthsWrap.appendChild(block);
    });

    /* ----- SEARCH 区块索引计数 ----- */
    const indexedMeta = document.getElementById("sounds-indexed-meta");
    if (indexedMeta) indexedMeta.textContent = "// " + audioDataList.length + "_SOUNDS_INDEXED";

    /* ----- 阶段名（随收录数量自动变化，见 STAGE_MILESTONES） ----- */
    const stageDisplay = document.getElementById("stage-display");
    if (stageDisplay) stageDisplay.textContent = getStage(audioDataList.length);

    /* ----- 时长：读取音频元数据后回填（读取失败显示 --:--） ----- */
    entries.forEach(function (rec) {
        rec.audio.addEventListener("loadedmetadata", function () {
            rec.durSpan.textContent = formatDuration(rec.audio.duration);
        });
        rec.audio.addEventListener("error", function () {
            rec.durSpan.textContent = "--:--";
        });
    });

    /* ----- 逐条交互：点击整行播放/暂停；可同时播放多个条目 -----
       playing 类用于锁定悬停高亮（播放中也保持黄色底）
       curWrap 在播放期间实时显示已播放秒数 */
    entries.forEach(function (rec) {
        function setPlaying(on) { rec.entry.classList.toggle("playing", on); }
        rec.audio.addEventListener("play", function () { setPlaying(true); rec.curWrap.hidden = false; });
        rec.audio.addEventListener("pause", function () { setPlaying(false); rec.curWrap.hidden = true; });
        rec.audio.addEventListener("ended", function () { setPlaying(false); rec.curWrap.hidden = true; });
        rec.audio.addEventListener("timeupdate", function () {
            rec.curWrap.textContent = formatDuration(Math.floor(rec.audio.currentTime)) + " / ";
        });
        rec.entry.addEventListener("click", function (e) {
            e.preventDefault();
            if (rec.audio.paused) {
                rec.audio.currentTime = 0;
                rec.audio.play().catch(function () {});
            } else {
                rec.audio.pause();
            }
        });

        /* 倍速循环：1.0x → 0.5x → 1.5x → 2.0x → 1.0x（循环切换，不改音高） */
        const SPEED_CYCLE = [1.0, 0.5, 1.5, 2.0];
        let speedIdx = 0;
        rec.speedEl.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            speedIdx = (speedIdx + 1) % SPEED_CYCLE.length;
            rec.audio.playbackRate = SPEED_CYCLE[speedIdx];
            rec.speedEl.textContent = SPEED_CYCLE[speedIdx].toFixed(1) + "x";
        });

        /* 音量回绕：100% 每次 -10%，到 0% 再点回 100% */
        rec.volPct = 100;
        rec.volEl.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            rec.volPct = rec.volPct <= 0 ? 100 : rec.volPct - 10;
            rec.audio.volume = rec.volPct / 100;
            rec.volEl.textContent = rec.volPct + "%";
        });
    });

    /* ----- 移动端布局联动：>> SOUND_ACCESS 移入右侧列与倍速/音量同行；桌面端保留在标题行 -----
       通过 matchMedia 监听视口变化，窗口缩放 / 横竖屏切换时自动搬运，
       无需刷新页面；旧版浏览器回退到 addListener 接口 */
    const mqMobile = window.matchMedia("(max-width: 767px)");
    entries.forEach(function (rec) {
        const sideEl = rec.speedEl.parentNode;
        function syncActionPosition() {
            if (mqMobile.matches) {
                if (rec.action.parentNode !== sideEl) {
                    sideEl.insertBefore(rec.action, sideEl.firstChild);
                }
            } else if (rec.action.parentNode !== rec.titleRow) {
                rec.titleRow.appendChild(rec.action);
            }
        }
        syncActionPosition();
        if (mqMobile.addEventListener) {
            mqMobile.addEventListener("change", syncActionPosition);
        } else if (mqMobile.addListener) {
            mqMobile.addListener(syncActionPosition);
        }
    });

    /* =========================================================
       一键正放 / 一键倒放（实现方式同 Sound 项目 js/main.js）
       解码与播放链路：
         fetch 取二进制 → decodeAudioData 解码 OGG → 逐声道反转
         样本点数组（时间轴倒置）→ 存 decodedCache 缓存 → BufferSource 播放
       decodedCache   : 缓存已反转的 AudioBuffer，二次倒放零网络请求
       reverseSources : 当前正在播放的倒放源（供一键停止）
       reverseCtx     : 全局复用的 AudioContext（首次点击时才创建）
       ========================================================= */
    const decodedCache = new Map();
    let reverseSources = [];
    let reverseCtx = null;

    function stopReverse() {
        reverseSources.forEach(function (s) { try { s.stop(); } catch (_) {} });
        reverseSources = [];
    }

    /* -------------------- 一键正放：全部从头开始播放 -------------------- */
    function playAll() {
        stopReverse();                          // 互斥：正放前先停止倒放
        entries.forEach(function (rec) {
            rec.audio.currentTime = 0;          // 从头开始
            rec.audio.play().catch(function () {});
        });
    }

    /* -------------------- 全部暂停并回到开头 -------------------- */
    function pauseAll() {
        entries.forEach(function (rec) {
            rec.audio.pause();
            rec.audio.currentTime = 0;
        });
    }

    /* -------------------- 一键倒放：解码并反转全部音频后播放 -------------------- */
    async function reverseAll() {
        stopReverse();                          // 互斥：倒放前先停止上一次倒放
        entries.forEach(function (rec) { rec.audio.pause(); rec.audio.currentTime = 0; });  // 停止正放

        // 延迟创建 AudioContext，避免无用户交互时被浏览器阻止
        if (!reverseCtx) {
            reverseCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (reverseCtx.state === "suspended") await reverseCtx.resume();

        const tasks = audioDataList.map(async function (item) {
            try {
                let buf;

                // 缓存命中则跳过网络请求和解码
                if (decodedCache.has(item.src)) {
                    buf = decodedCache.get(item.src);
                } else {
                    // 1. 以二进制形式获取音频文件
                    const res = await fetch(item.src);
                    const raw = await res.arrayBuffer();

                    // 2. 解码 OGG → PCM 浮点样本
                    buf = await reverseCtx.decodeAudioData(raw);

                    // 3. 反转每个声道的时间轴数据
                    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
                        Array.prototype.reverse.call(buf.getChannelData(ch));
                    }

                    // 4. 存入缓存，下次直接使用
                    decodedCache.set(item.src, buf);
                }

                // 5. 创建音频源节点并播放
                const src = reverseCtx.createBufferSource();
                src.buffer = buf;
                src.connect(reverseCtx.destination);
                src.start();
                reverseSources.push(src);
            } catch (e) {
                console.error("倒放失败:", item.src, e);
            }
        });

        await Promise.all(tasks);
    }

    /* ----- 悬浮按钮点击绑定：再点一次可停止 -----
       btn-play    ：有音频在播则全部暂停，否则全部正放
       btn-reverse ：倒放中则停止，否则启动倒放（reverseActive 标记状态） */
    const btnPlay = document.getElementById("btn-play");
    const btnReverse = document.getElementById("btn-reverse");
    let reverseActive = false;
    if (btnPlay) {
        btnPlay.addEventListener("click", function () {
            if (entries.some(function (rec) { return !rec.audio.paused; })) {
                pauseAll();
            } else {
                playAll();
            }
        });
    }
    if (btnReverse) {
        btnReverse.addEventListener("click", function () {
            if (reverseActive) {
                stopReverse();
                reverseActive = false;
            } else {
                reverseActive = true;
                reverseAll();
            }
        });
    }
})();
