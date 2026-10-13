/**
 * 课表主页 · 周视图 / 日视图 / 空状态 / 课程详情面板
 */
const app = getApp();
const C = require('../../utils/constants.js');
const store = require('../../utils/store.js');

let toastTimer = null;

Page({
  data: {
    theme: 'light',
    isDark: false,
    statusBarHeight: 20,

    /* toast */
    toastMsg: '',
    toastOn: false,

    /* 数据状态 */
    isEmpty: true,
    view: 'week',          // week | day
    day: C.TODAY,          // 选中星期 0-6
    week: 7,
    weekLabel: '第 7 周',
    weekRangeText: '',

    /* 周视图 */
    days: [],
    timeLabels: C.TIME_LABELS,
    todayColStyle: '',
    nowTop: '0rpx',
    gridCourses: [],
    footText: '',

    /* 日视图 */
    hero: null,
    dayList: [],
    dayEmpty: false,

    /* 详情面板 */
    sheetOn: false,
    sheet: {},
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight || 20,
    });
  },

  onShow() {
    const theme = app.globalData.theme || 'light';
    app.applyNavTheme(theme);
    this.setData({ theme, isDark: theme === 'dark' });
    this.refresh();
  },

  /* ==================== 数据刷新 ==================== */
  refresh() {
    const courses = store.load();
    const isEmpty = courses.length === 0;
    this.setData({ isEmpty });
    if (isEmpty) {
      this.setData({ gridCourses: [], dayList: [], hero: null, footText: '', days: this.buildDays([]) });
      return;
    }
    this.renderAll(courses);
  },

  buildDays(courses) {
    const dates = C.weekDates(this.data.week);
    const hasDays = courses.map((c) => c.day);
    return C.DAY_NAMES.map((n, i) => ({
      name: n,
      date: dates[i],
      sel: i === this.data.day,
      has: hasDays.indexOf(i) >= 0,
    }));
  },

  renderAll(courses) {
    this.setData({
      days: this.buildDays(courses),
      weekLabel: `第 ${this.data.week} 周`,
      weekRangeText: C.weekRange(this.data.week),
      todayColStyle: C.todayColStyle(C.TODAY),
      nowTop: C.nowLineTop(),
    });
    this.renderGrid(courses);
    this.renderDay(courses);
  },

  renderGrid(courses) {
    const gridCourses = courses.map((c) => {
      const p = C.layout(c.day, c.slot);
      return {
        id: c.id,
        name: c.name,
        room: c.room,
        color: c.color,
        style: `left:${p.left};width:${p.width};top:${p.top};height:${p.height};`,
      };
    });
    const subjectCount = {};
    courses.forEach((c) => { subjectCount[c.name] = 1; });
    this.setData({
      gridCourses,
      footText: `共 ${Object.keys(subjectCount).length} 门课 · 本周 ${courses.length} 节`,
    });
  },

  renderDay(courses) {
    const day = this.data.day;
    const list = courses.filter((c) => c.day === day).sort((a, b) => a.slot - b.slot);

    if (!list.length) {
      this.setData({ hero: null, dayList: [], dayEmpty: true });
      return;
    }

    const isToday = day === C.TODAY;
    const cur = isToday ? list.filter((c) => C.slotStatus(c.slot).key === 'live')[0] : null;
    const next = isToday ? list.filter((c) => C.slotStatus(c.slot).key === 'soon')[0] : null;

    const hero = {
      count: list.length,
      nowText: '14:20',
      remainText: cur ? C.fmtDur(C.toMin(C.SLOTS[cur.slot].e) - C.NOW_MIN) : '—',
      remainLabel: cur ? '本节剩余' : '暂无进行中',
      nextText: next ? C.SLOTS[next.slot].s : '—',
      nextLabel: next ? '下节开始' : '今日已结束',
    };

    const dayList = list.map((c, i) => {
      const st = isToday ? C.slotStatus(c.slot) : null;
      const live = st && st.key === 'live';
      return {
        id: c.id,
        name: c.name,
        room: c.room,
        teacher: c.teacher,
        weeks: c.weeks,
        color: c.color,
        start: C.SLOTS[c.slot].s,
        end: C.SLOTS[c.slot].e,
        pillClass: st ? st.key : 'done',
        pillText: st ? st.text : c.weeks,
        isDone: st ? st.key === 'done' : false,
        isLive: live,
        progress: C.termProgress(this.data.week),
        delay: i * 60,
      };
    });

    this.setData({ hero, dayList, dayEmpty: false });
  },

  /* ==================== 视图与导航 ==================== */
  setWeekView() { this.setData({ view: 'week' }); },
  setDayView() { this.setData({ view: 'day' }); },

  pickDay(e) {
    const day = Number(e.currentTarget.dataset.day);
    this.setData({ day }, () => this.renderDay(store.load()));
  },

  prevWeek() { this.shiftWeek(-1); },
  nextWeek() { this.shiftWeek(1); },

  shiftWeek(delta) {
    const week = Math.max(1, Math.min(20, this.data.week + delta));
    if (week === this.data.week) return;
    this.setData({ week }, () => {
      this.renderAll(store.load());
      this.showToast(`第 ${week} 周`);
    });
  },

  goToday() {
    this.setData({ day: C.TODAY, week: 7 }, () => {
      this.renderAll(store.load());
      this.showToast('已回到今天 · 第 7 周');
    });
  },

  /* ==================== 详情面板 ==================== */
  openSheet(e) {
    const id = e.currentTarget.dataset.id;
    const c = store.getById(id);
    if (!c) return;

    const st = C.slotStatus(c.slot);
    const isToday = c.day === C.TODAY;

    let remain = '2 学时';
    if (isToday && st.key === 'live') {
      remain = '剩 ' + C.fmtDur(C.toMin(C.SLOTS[c.slot].e) - C.NOW_MIN);
    } else if (isToday && st.key === 'soon') {
      remain = '还有 ' + C.fmtDur(C.toMin(C.SLOTS[c.slot].s) - C.NOW_MIN);
    }

    this.setData({
      sheetOn: true,
      sheet: {
        id: c.id,
        name: c.name,
        room: c.room,
        teacher: c.teacher,
        weeks: c.weeks,
        color: c.color,
        dayText: `周${C.DAY_NAMES[c.day]} · ${C.SLOTS[c.slot].label}`,
        timeText: `${C.SLOTS[c.slot].s} – ${C.SLOTS[c.slot].e}`,
        statusText: isToday ? st.text : '非当日课程',
        remainText: remain,
      },
    });
  },

  closeSheet() {
    this.setData({ sheetOn: false });
  },

  /** 阻止面板内部点击穿透到遮罩 */
  noop() {},

  deleteCourse() {
    const c = this.data.sheet;
    if (!c.id) return;

    // 破坏性操作：应用内两步确认
    if (this.__pendingDelete !== c.id) {
      this.__pendingDelete = c.id;
      this.showToast('再次点击「删除」以确认');
      clearTimeout(this.__delTimer);
      this.__delTimer = setTimeout(() => { this.__pendingDelete = null; }, 3200);
      return;
    }

    clearTimeout(this.__delTimer);
    this.__pendingDelete = null;
    store.remove(c.id);
    this.setData({ sheetOn: false });
    this.showToast(`已删除「${c.name}」`);
    setTimeout(() => this.refresh(), 180);
  },

  editCourse() {
    const c = this.data.sheet;
    if (!c.id) return;
    this.setData({ sheetOn: false });
    wx.navigateTo({ url: `/pages/add/index?id=${c.id}` });
  },

  shareCourse() {
    this.showToast('已复制课程信息');
  },

  /* ==================== 跳转 ==================== */
  goImport() { wx.navigateTo({ url: '/pages/import/index' }); },
  goAdd() { wx.navigateTo({ url: '/pages/add/index' }); },

  /* ==================== 主题 / 更多 ==================== */
  toggleTheme() {
    const theme = this.data.theme === 'dark' ? 'light' : 'dark';
    app.setTheme(theme);
    this.setData({ theme, isDark: theme === 'dark' });
    this.showToast(theme === 'dark' ? '已切换到暗色模式' : '已切换到亮色模式');
  },

  openMore() {
    const that = this;
    wx.showActionSheet({
      itemList: ['载入示例课表', '清空全部课程', '管理课程颜色'],
      success(res) {
        if (res.tapIndex === 0) that.loadDemo();
        if (res.tapIndex === 1) that.confirmClear();
        if (res.tapIndex === 2) that.showToast('课程颜色在「手动添加」里选择');
      },
      fail() {},
    });
  },

  loadDemo() {
    store.save([]);
    store.addMany(store.demoData());
    this.setData({ view: 'week', day: C.TODAY });
    this.refresh();
    this.showToast('已载入示例课表 · 12 节课');
  },

  confirmClear() {
    const that = this;
    wx.showModal({
      title: '清空全部课程',
      content: '此操作不可撤销，确定继续吗？',
      confirmText: '清空',
      confirmColor: '#E8486A',
      success(res) {
        if (!res.confirm) return;
        store.clear();
        that.refresh();
        that.showToast('已清空，回到空状态');
      },
    });
  },

  /* ==================== Toast ==================== */
  showToast(msg) {
    clearTimeout(toastTimer);
    this.setData({ toastMsg: msg, toastOn: true });
    toastTimer = setTimeout(() => this.setData({ toastOn: false }), 1900);
  },
});
