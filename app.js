/**
 * 课表小程序 · 全局逻辑
 *
 * 主题策略：
 *   首次启动跟随系统（wx.getAppBaseInfo().theme），
 *   用户在课表页手动切换后写入本地存储并长期生效。
 */

const THEME_KEY = 'timetable_theme';

App({
  globalData: {
    theme: 'light',
    /** 状态栏高度（px），自定义导航栏用它做顶部避让 */
    statusBarHeight: 20,
    /** 导航栏内容高度（px），与 wxss 里的 88rpx 对应 */
    navBarHeight: 44,
    /** 当前时间（分钟），用于「进行中 / 已结束 / 还剩多久」判断。
     *  真实项目里应在进入页面时用 new Date() 计算；
     *  此处固定为 14:20，与设计稿的时间线位置保持一致。 */
    nowMinutes: 14 * 60 + 20,
  },

  onLaunch() {
    this.globalData.theme = this.resolveTheme();

    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      if (win && win.statusBarHeight) {
        this.globalData.statusBarHeight = win.statusBarHeight;
      }
    } catch (e) {
      // 拿不到就用默认 20px
    }
  },

  /** 读取主题：本地存储优先，其次跟随系统 */
  resolveTheme() {
    const saved = wx.getStorageSync(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;

    let sysTheme = 'light';
    try {
      const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync();
      if (info && info.theme === 'dark') sysTheme = 'dark';
    } catch (e) {
      // 低版本基础库拿不到系统主题，按亮色处理
    }
    return sysTheme;
  },

  setTheme(theme) {
    this.globalData.theme = theme;
    wx.setStorageSync(THEME_KEY, theme);
    this.applyNavTheme(theme);
  },

  /** 导航栏配色跟随主题 */
  applyNavTheme(theme) {
    const dark = theme === 'dark';
    wx.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? '#0D1119' : '#F6F7FB',
      fail() {},
    });
  },
});
