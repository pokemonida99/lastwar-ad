// 遊戲設定與關卡：之後改名字、數值、關卡都只改這個檔
// 關卡座標：z 是從起點往前的距離（公尺），x 是左右（馬路中線 0，左負右正，馬路半寬 6）

export const CONFIG = {
  title: '末日小隊',            // 遊戲名稱（暫定，之後再改）
  subtitle: '拖曳左右，帶隊衝過去',
  heroName: '隊長',             // 中間那位英雄
  runSpeed: 7.5,                // 前進速度（公尺／秒）
  fireRate: 0.5,                // 每個士兵每秒開幾槍
  heroFireRate: 4,              // 隊長每秒開幾槍
  bulletDamage: 1,
  zombieHp: 3,                  // 一隻殭屍挨幾槍
  range: 16,                    // 開槍距離
  battleRate: 22,               // 肉搏時每秒互換幾個（一換一）
  bossHitRate: 3,               // Boss 肉搏時每秒踩死幾個士兵
  bossContactDamage: 12,        // 士兵貼身時每換一個給 Boss 的傷害
  maxCount: 600,                // 人數上限
};

export const LEVELS = [
  {
    name: '第 1 關', start: 5, length: 168,
    items: [
      { z: 18, type: 'gate', x: -3, w: 5.6, op: '+', v: 15 },
      { z: 16, type: 'spikes', x: 3.2, w: 5, d: 4 },
      { z: 36, type: 'gates', left: ['+', 10], right: ['x', 2] },
      { z: 58, type: 'horde', x: 0, n: 20 },
      { z: 76, type: 'holes', x: -3, w: 5, d: 5 },
      { z: 78, type: 'gate', x: 3, w: 5.6, op: '+', v: 30 },
      { z: 96, type: 'gates', left: ['+', 40], right: ['x', 2] },
      { z: 118, type: 'horde', x: 0, n: 50 },
      { z: 134, type: 'gates', left: ['-', 10], right: ['+', 25] },
      { z: 156, type: 'boss', x: 0, hp: 400, n: 15 },
    ],
  },
  {
    name: '第 2 關', start: 8, length: 196,
    items: [
      { z: 16, type: 'gates', left: ['+', 20], right: ['-', 5] },
      { z: 32, type: 'spikes', x: 0, w: 4.4, d: 5 },
      { z: 46, type: 'gates', left: ['x', 2], right: ['+', 15] },
      { z: 66, type: 'horde', x: -2, n: 35 },
      { z: 82, type: 'holes', x: 3, w: 5, d: 6 },
      { z: 84, type: 'gate', x: -3, w: 5.6, op: 'x', v: 2 },
      { z: 100, type: 'spikes', x: -3.2, w: 5, d: 4 },
      { z: 102, type: 'gate', x: 3, w: 5.6, op: '+', v: 35 },
      { z: 124, type: 'horde', x: 2, n: 50 },
      { z: 142, type: 'gates', left: ['/', 2], right: ['x', 3] },
      { z: 160, type: 'holes', x: 0, w: 6, d: 5 },
      { z: 184, type: 'boss', x: 0, hp: 600, n: 25 },
    ],
  },
  {
    name: '第 3 關', start: 10, length: 230,
    items: [
      { z: 16, type: 'gate', x: -3, w: 5.6, op: '+', v: 20 },
      { z: 16, type: 'gate', x: 3, w: 5.6, op: '-', v: 5 },
      { z: 34, type: 'gates', left: ['x', 2], right: ['+', 30] },
      { z: 54, type: 'horde', x: 0, n: 40 },
      { z: 70, type: 'spikes', x: -3.2, w: 5, d: 5 },
      { z: 72, type: 'gate', x: 3, w: 5.6, op: 'x', v: 2 },
      { z: 90, type: 'holes', x: 3, w: 5, d: 5 },
      { z: 92, type: 'gate', x: -3, w: 5.6, op: '+', v: 40 },
      { z: 112, type: 'horde', x: -2, n: 60 },
      { z: 130, type: 'gates', left: ['-', 30], right: ['x', 2] },
      { z: 148, type: 'spikes', x: 0, w: 3.6, d: 5 },
      { z: 166, type: 'horde', x: 2, n: 80 },
      { z: 182, type: 'gates', left: ['+', 60], right: ['x', 2] },
      { z: 216, type: 'boss', x: 0, hp: 1000, n: 40 },
    ],
  },
];
