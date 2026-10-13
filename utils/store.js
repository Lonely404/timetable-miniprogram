/**
 * 课程数据存取（wx.setStorageSync 本地持久化）
 *
 * 数据结构：
 * {
 *   id:      'c1712345678901',
 *   name:    '概率论与数理统计',
 *   teacher: '周敏',
 *   room:    '明理楼 A205',
 *   day:     2,              // 0=周一 ... 6=周日
 *   slot:    2,              // 0=第1-2节 ... 4=第9-10节
 *   weeks:   '1-16 周',      // 展示用文案
 *   color:   'c4'            // 六色标记之一
 * }
 */

const KEY = 'timetable_courses';
const COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

function load() {
  const list = wx.getStorageSync(KEY);
  return Array.isArray(list) ? list : [];
}

function save(list) {
  wx.setStorageSync(KEY, list);
  return list;
}

function uid() {
  return 'c' + Date.now() + Math.floor(Math.random() * 1000);
}

function add(course) {
  const list = load();
  course.id = course.id || uid();
  list.push(course);
  save(list);
  return course;
}

/**
 * 批量导入并自动去重（课程名 + 星期 + 节次 相同视为重复）
 * @returns {number} 实际新增条数
 */
function addMany(courses) {
  const list = load();
  const seen = new Set(list.map((c) => `${c.name}|${c.day}|${c.slot}`));
  let added = 0;
  courses.forEach((c) => {
    const key = `${c.name}|${c.day}|${c.slot}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ ...c, id: c.id || uid() });
    added += 1;
  });
  save(list);
  return added;
}

function update(course) {
  const list = load();
  const i = list.findIndex((c) => c.id === course.id);
  if (i >= 0) list[i] = { ...list[i], ...course };
  save(list);
  return list[i];
}

function remove(id) {
  save(load().filter((c) => c.id !== id));
}

function getById(id) {
  return load().find((c) => c.id === id) || null;
}

function clear() {
  wx.removeStorageSync(KEY);
}

/** 取一个还没被用过的颜色，让新课表天然五彩缤纷 */
function nextColor() {
  const used = load().map((c) => c.color);
  const free = COLORS.filter((c) => used.indexOf(c) < 0);
  if (free.length) return free[0];
  return COLORS[load().length % COLORS.length];
}

/** 演示数据：用于「载入示例课表」 */
function demoData() {
  return [
    { name: '数据结构与算法',   teacher: '陈立群', room: '博学楼 B301', day: 0, slot: 0, weeks: '1-16 周', color: 'c1' },
    { name: '大学英语（三）',   teacher: '许文倩', room: '文科楼 D208', day: 0, slot: 2, weeks: '1-16 周', color: 'c3' },
    { name: '计算机网络',       teacher: '许文倩', room: '实验楼 C402', day: 1, slot: 1, weeks: '1-12 周', color: 'c2' },
    { name: '高等数学 A2',      teacher: '周敏',   room: '明理楼 A101', day: 1, slot: 4, weeks: '1-16 周', color: 'c5' },
    { name: '数据结构与算法',   teacher: '陈立群', room: '博学楼 B301', day: 2, slot: 0, weeks: '1-16 周', color: 'c1' },
    { name: '概率论与数理统计', teacher: '周敏',   room: '明理楼 A205', day: 2, slot: 2, weeks: '1-16 周', color: 'c4' },
    { name: '中国建筑史',       teacher: '何知远', room: '文科楼 D108', day: 2, slot: 4, weeks: '单周',    color: 'c6' },
    { name: '计算机网络',       teacher: '许文倩', room: '实验楼 C402', day: 3, slot: 1, weeks: '1-12 周', color: 'c2' },
    { name: '软件工程导论',     teacher: '林奕',   room: '创新工坊 3F', day: 3, slot: 3, weeks: '1-16 周', color: 'c3' },
    { name: '线性代数',         teacher: '周敏',   room: '明理楼 A301', day: 4, slot: 0, weeks: '1-16 周', color: 'c6' },
    { name: '体育（羽毛球）',   teacher: '刘铮',   room: '东区体育馆',  day: 4, slot: 2, weeks: '1-16 周', color: 'c5' },
    { name: '创新创业实践',     teacher: '林奕',   room: '创新工坊 2F', day: 5, slot: 1, weeks: '1-8 周',  color: 'c4' },
  ];
}

module.exports = {
  load, save, add, addMany, update, remove, getById, clear, nextColor, demoData, COLORS,
};
