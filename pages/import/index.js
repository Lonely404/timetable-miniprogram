/**
 * 导入课表 · 三步流程：选择文件 → 智能识别 → 确认导入
 *
 * ⚠️ 关于 PDF 解析的重要说明
 * ─────────────────────────────────────────────────────────────
 * 小程序端 **无法** 解析 PDF：无论是表格版还是文字版课表，
 * 都需要把文件传到服务端做 OCR / 版面还原，再返回结构化数据。
 * 因此这里的解析步骤必须由你自己的后端或云函数完成。
 *
 * 接后端时只需要改下面这一个常量：
 *   const PARSE_API = 'https://your-domain.com/api/timetable/parse';
 *
 * 接口约定
 *   请求：POST multipart/form-data，字段名 file
 *   响应：{ ok: true, courses: [ { name, teacher, room, day, slot, weeks, color } ] }
 *         day  = 0-6（周一至周日）
 *         slot = 0-4（第1-2节 / 第3-4节 / 第5-6节 / 第7-8节 / 第9-10节）
 *
 * PARSE_API 为空时自动走本地模拟数据，方便先把 UI 流程跑通。
 * ─────────────────────────────────────────────────────────────
 */
const app = getApp();
const C = require('../../utils/constants.js');
const store = require('../../utils/store.js');

const PARSE_API = '';

let toastTimer = null;
let parseTimer = null;

Page({
  data: {
    theme: 'light',
    isDark: false,
    statusBarHeight: 20,

    stage: 1,                 // 1 选择文件 / 2 识别中 / 3 确认导入
    fileName: '',
    fileSizeText: '',
    progress: 0,

    parsed: [],               // [{ key, name, teacher, room, day, slot, weeks, color, selected, metaText }]
    foundCount: 0,
    pickedCount: 0,

    toastMsg: '',
    toastOn: false,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
  },

  onShow() {
    const theme = app.globalData.theme || 'light';
    app.applyNavTheme(theme);
    this.setData({ theme, isDark: theme === 'dark' });
  },

  onUnload() {
    clearInterval(parseTimer);
  },

  back() {
    wx.navigateBack({
      fail() {
        wx.redirectTo({ url: '/pages/timetable/index' });
      },
    });
  },

  showTip() {
    wx.showModal({
      title: '如何拿到课表 PDF',
      content: '登录教务系统 → 打开「我的课表」→ 浏览器打印并另存为 PDF → 发送到微信文件传输助手 → 回到本页选择该文件。',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  /* ==================== 阶段 1：选择文件 ==================== */
  chooseFile() {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'xlsx', 'xls'],
      success(res) {
        const f = res.tempFiles && res.tempFiles[0];
        if (!f) return;
        if (f.size > 20 * 1024 * 1024) {
          that.showToast('文件超过 20 MB，请压缩后再试');
          return;
        }
        that.setData({
          fileName: f.name || '课表.pdf',
          fileSizeText: that.formatSize(f.size),
        });
        that.startParse(f);
      },
      fail() {},
    });
  },

  formatSize(bytes) {
    if (!bytes) return '未知大小';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  },

  /* ==================== 阶段 2：识别 ==================== */
  startParse(file) {
    this.setData({ stage: 2, progress: 0 });

    if (!PARSE_API) {
      this.simulateParse();
      return;
    }

    const that = this;
    const task = wx.uploadFile({
      url: PARSE_API,
      filePath: file.path,
      name: 'file',
      success(res) {
        let data = {};
        try {
          data = JSON.parse(res.data);
        } catch (e) {
          that.showToast('服务端返回格式异常');
          that.setData({ stage: 1 });
          return;
        }
        if (!data.ok || !Array.isArray(data.courses)) {
          that.showToast('未能识别出课程，请检查文件');
          that.setData({ stage: 1 });
          return;
        }
        that.showResult(data.courses);
      },
      fail() {
        that.showToast('上传失败，请检查网络或接口域名');
        that.setData({ stage: 1 });
      },
    });

    if (task && task.onProgressUpdate) {
      task.onProgressUpdate((p) => {
        // 上传占进度条的 70%，剩余 30% 留给服务端解析
        this.setData({ progress: Math.round(p.progress * 0.7) });
      });
    }
  },

  /** 本地模拟：没有后端时也能完整跑通交互 */
  simulateParse() {
    const that = this;
    let p = 0;
    clearInterval(parseTimer);
    parseTimer = setInterval(() => {
      p += Math.random() * 16 + 7;
      if (p >= 100) {
        p = 100;
        clearInterval(parseTimer);
        setTimeout(() => that.showResult(store.demoData()), 420);
      }
      that.setData({ progress: Math.floor(p) });
    }, 170);
  },

  /* ==================== 阶段 3：确认导入 ==================== */
  showResult(courses) {
    const parsed = courses.map((c, i) => ({
      key: 'p' + i,
      name: c.name,
      teacher: c.teacher,
      room: c.room,
      day: c.day,
      slot: c.slot,
      weeks: c.weeks || '1-16 周',
      color: c.color || store.COLORS[i % store.COLORS.length],
      selected: true,
      metaText: `周${C.DAY_NAMES[c.day]} ${C.SLOTS[c.slot].label} · ${c.room}`,
    }));

    this.setData({
      stage: 3,
      progress: 100,
      parsed,
      foundCount: parsed.length,
      pickedCount: parsed.length,
    });
  },

  toggleItem(e) {
    const key = e.currentTarget.dataset.key;
    const parsed = this.data.parsed.map((p) =>
      p.key === key ? { ...p, selected: !p.selected } : p
    );
    this.setData({
      parsed,
      pickedCount: parsed.filter((p) => p.selected).length,
    });
  },

  toggleAll() {
    const allOn = this.data.pickedCount === this.data.parsed.length;
    const parsed = this.data.parsed.map((p) => ({ ...p, selected: !allOn }));
    this.setData({
      parsed,
      pickedCount: allOn ? 0 : parsed.length,
    });
  },

  doImport() {
    const picked = this.data.parsed.filter((p) => p.selected);
    if (!picked.length) {
      this.showToast('请至少选择一门课程');
      return;
    }

    const added = store.addMany(
      picked.map((p) => ({
        name: p.name,
        teacher: p.teacher,
        room: p.room,
        day: p.day,
        slot: p.slot,
        weeks: p.weeks,
        color: p.color,
      }))
    );

    const skipped = picked.length - added;
    const msg = skipped > 0
      ? `导入 ${added} 门，跳过 ${skipped} 门重复课程`
      : `成功导入 ${added} 门课程`;
    this.showToast(msg);

    setTimeout(() => {
      wx.navigateBack({
        fail() {
          wx.redirectTo({ url: '/pages/timetable/index' });
        },
      });
    }, 900);
  },

  /* ==================== Toast ==================== */
  showToast(msg) {
    clearTimeout(toastTimer);
    this.setData({ toastMsg: msg, toastOn: true });
    toastTimer = setTimeout(() => this.setData({ toastOn: false }), 1900);
  },
});
