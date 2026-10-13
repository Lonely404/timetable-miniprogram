/**
 * 新增 / 编辑课程
 * 带 id 参数进入即为编辑模式。
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

    isEdit: false,
    editId: '',

    name: '',
    teacher: '',
    room: '',

    day: C.TODAY,
    slot: 2,
    weeks: '1-16 周',
    color: 'c1',
    remind: true,

    days: [],
    slots: [],
    weekOptions: [],
    colors: [],
    pickerColors: [],

    toastMsg: '',
    toastOn: false,
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    this.buildControls();

    if (options && options.id) {
      const c = store.getById(options.id);
      if (c) {
        this.setData({
          isEdit: true,
          editId: c.id,
          name: c.name,
          teacher: c.teacher,
          room: c.room,
          day: c.day,
          slot: c.slot,
          weeks: c.weeks,
          color: c.color,
        });
        this.buildControls();
      }
    } else {
      this.setData({ color: store.nextColor() });
      this.buildControls();
    }
  },

  onShow() {
    const theme = app.globalData.theme || 'light';
    app.applyNavTheme(theme);
    this.setData({ theme, isDark: theme === 'dark' });
  },

  /** 把 chips 的选中态预计算好，避免在 WXML 里做逻辑 */
  buildControls() {
    const d = this.data;
    this.setData({
      days: C.DAY_NAMES.map((n, i) => ({ key: i, name: n, sel: i === d.day })),
      slots: C.SLOTS.map((s, i) => ({ key: i, label: s.label, sel: i === d.slot })),
      weekOptions: C.WEEK_OPTIONS.map((w) => ({ text: w, sel: w === d.weeks })),
      colors: C.COLORS.map((k) => ({ key: k, sel: k === d.color })),
      pickerColors: C.COLORS.map((k) => ({
        key: k,
        sel: k === d.color,
        // background 填色；--ring 供 .pk.on 的圈选外环使用
        style: `background:var(--${k.replace('c', 'k')});--ring:var(--${k.replace('c', 'k')})`,
      })),
    });
  },

  /* ==================== 输入 ==================== */
  onName(e) { this.setData({ name: e.detail.value }); },
  onTeacher(e) { this.setData({ teacher: e.detail.value }); },
  onRoom(e) { this.setData({ room: e.detail.value }); },

  pickDay(e) {
    const day = Number(e.currentTarget.dataset.key);
    this.setData({ day }, () => this.buildControls());
  },
  pickSlot(e) {
    const slot = Number(e.currentTarget.dataset.key);
    this.setData({ slot }, () => this.buildControls());
  },
  pickWeeks(e) {
    const weeks = e.currentTarget.dataset.text;
    this.setData({ weeks }, () => this.buildControls());
  },
  pickColor(e) {
    const color = e.currentTarget.dataset.key;
    this.setData({ color }, () => this.buildControls());
  },
  toggleRemind() { this.setData({ remind: !this.data.remind }); },

  /* ==================== 保存 / 取消 ==================== */
  save() {
    const d = this.data;
    const name = (d.name || '').trim();

    if (!name) {
      this.showToast('请先填写课程名称');
      return;
    }

    const payload = {
      name,
      teacher: (d.teacher || '').trim() || '未填写',
      room: (d.room || '').trim() || '待定',
      day: d.day,
      slot: d.slot,
      weeks: d.weeks,
      color: d.color,
    };

    if (d.isEdit) {
      store.update({ id: d.editId, ...payload });
      this.showToast('已保存修改');
    } else {
      store.add(payload);
      this.showToast(`已添加「${name}」`);
    }

    setTimeout(() => {
      wx.navigateBack({
        fail() {
          wx.redirectTo({ url: '/pages/timetable/index' });
        },
      });
    }, 700);
  },

  cancel() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({ url: '/pages/timetable/index' });
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
