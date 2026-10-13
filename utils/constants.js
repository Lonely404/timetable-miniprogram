/**
 * 课表常量与纯函数工具
 */

/* ---------- 时间槽：一大节 = 一行 ---------- */
const SLOTS = [
  { s: '08:00', e: '09:40', label: '第 1-2 节' },
  { s: '10:00', e: '11:40', label: '第 3-4 节' },
  { s: '14:00', e: '15:40', label: '第 5-6 节' },
  { s: '16:00', e: '17:40', label: '第 7-8 节' },
  { s: '19:00', e: '20:40', label: '第 9-10 节' },
];

/* 左侧时间刻度（top 已按行高预计算，避免 WXML 里做运算） */
const TIME_LABELS = SLOTS.map((s, i) => ({
  text: s.s,
  top: i * 160 + 12,
}));

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];
const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const WEEK_OPTIONS = ['1-16 周', '1-8 周', '9-16 周', '单周', '双周'];

/* ---------- 课表网格几何 ----------
   750rpx 画布：时间轴列 76rpx + 右侧留白 28rpx → 网格区 646rpx
   646 / 7 = 92.2857rpx 每一列，行高 160rpx
   因为 rpx 会按屏幕宽度自动归一化，所以这里的数值在所有机型上完全一致。 */
const COL = 92.2857;
const ROW = 160;
const GAP = 4;          // 课程块左右各内缩
const V_GAP = 6;        // 课程块上下各内缩
const COLS = 7;

/* 当前时间：14:20（与设计稿时间线一致） */
const NOW_MIN = 14 * 60 + 20;
const TODAY = 2;        // 周三

/* 学期起始：2026-10-12 是第 7 周的周一 */
const TERM_MONDAY = new Date(2026, 9, 12);

/* ---------- 纯函数 ---------- */
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** 把分钟数格式化成 "1h 20m" / "45m" */
function fmtDur(min) {
  if (min < 0) min = 0;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return m + 'm';
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 某一大节相对「现在」的状态 */
function slotStatus(slotIndex) {
  const start = toMin(SLOTS[slotIndex].s);
  const end = toMin(SLOTS[slotIndex].e);
  if (NOW_MIN >= end) return { key: 'done', text: '已结束' };
  if (NOW_MIN >= start) return { key: 'live', text: '进行中' };
  return { key: 'soon', text: fmtDur(start - NOW_MIN) + '后' };
}

/** 课程块在网格中的绝对定位（rpx 字符串） */
function layout(day, slot) {
  return {
    left: (day * COL + GAP).toFixed(2) + 'rpx',
    width: (COL - GAP * 2).toFixed(2) + 'rpx',
    top: (slot * ROW + V_GAP) + 'rpx',
    height: (ROW - V_GAP * 2) + 'rpx',
  };
}

/** 今日列高亮 */
function todayColStyle(day) {
  return `left:${(day * COL).toFixed(2)}rpx;width:${COL.toFixed(2)}rpx`;
}

/** 当前时间线距网格顶部的距离（14:20 落在第 5-6 节内 20/100 处） */
function nowLineTop() {
  const slotStart = toMin(SLOTS[2].s);
  const slotEnd = toMin(SLOTS[2].e);
  const ratio = Math.min(1, Math.max(0, (NOW_MIN - slotStart) / (slotEnd - slotStart)));
  return Math.round(2 * ROW + ratio * ROW) + 'rpx';
}

/** 第 N 周的 7 个日期（返回日号数组） */
function weekDates(week) {
  const base = new Date(TERM_MONDAY);
  base.setDate(base.getDate() + (week - 7) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d.getDate();
  });
}

/** 第 N 周的日期区间文案，如 "10.12 – 10.18" */
function weekRange(week) {
  const base = new Date(TERM_MONDAY);
  base.setDate(base.getDate() + (week - 7) * 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 6);
  const f = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
  return `${f(base)} – ${f(end)}`;
}

/** 学期进度百分比（按 16 周计） */
function termProgress(week) {
  return Math.max(0, Math.min(100, Math.round((week / 16) * 100)));
}

module.exports = {
  SLOTS,
  TIME_LABELS,
  DAY_NAMES,
  COLORS,
  WEEK_OPTIONS,
  COLS,
  ROW,
  NOW_MIN,
  TODAY,
  toMin,
  fmtDur,
  slotStatus,
  layout,
  todayColStyle,
  nowLineTop,
  weekDates,
  weekRange,
  termProgress,
};
