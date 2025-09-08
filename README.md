# 数独游戏微信小程序

这是一个功能完整的数独游戏微信小程序，从 Flutter 项目移植而来。

## 功能特性

### 游戏功能
- **多难度等级**：9个难度等级（1级到9级）
  - 1-2级：4x4网格，数字1-4
  - 3-4级：6x6网格，数字1-6  
  - 5-9级：9x9网格，数字1-9
- **智能生成**：每个难度都有不同的初始数字数量和约束
- **游戏辅助**：
  - 检查功能：高亮显示冲突的数字
  - 智能提示：自动选择最容易填写的格子
  - 备注模式：为空白格子添加候选数字
  - 擦除功能：清除错误输入
- **游戏保存**：自动保存游戏进度，支持中途退出后继续
- **计时功能**：记录游戏用时

### 界面设计
- **现代化UI**：简洁美观的界面设计
- **响应式布局**：适配不同屏幕尺寸
- **直观操作**：点击选择格子，底部数字键盘输入
- **状态反馈**：
  - 选中格子高亮显示
  - 相同数字、同行列、同区域高亮
  - 冲突检查时红绿色提示
  - 智能提示时绿色高亮

### 统计功能
- **游戏记录**：
  - 总游戏数统计
  - 完成游戏数统计
  - 最佳用时记录
  - 平均用时计算
- **数据管理**：
  - 数据导出功能
  - 清除所有数据功能

## 项目结构

```
miniprogram/
├── app.json                 # 小程序配置
├── app.ts                   # 小程序入口
├── app.wxss                 # 全局样式
├── pages/
│   ├── index/               # 主页
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   └── index.json
│   ├── sudoku/              # 数独游戏页面
│   │   ├── sudoku.ts
│   │   ├── sudoku.wxml
│   │   ├── sudoku.wxss
│   │   └── sudoku.json
│   ├── profile/             # 个人中心页面
│   │   ├── profile.ts
│   │   ├── profile.wxml
│   │   ├── profile.wxss
│   │   └── profile.json
│   └── logs/                # 日志页面（保留原有功能）
│       ├── logs.ts
│       ├── logs.wxml
│       ├── logs.wxss
│       └── logs.json
└── utils/
    ├── sudoku-game.js       # 数独游戏模型
    ├── sudoku-service.js    # 数独服务类
    └── util.ts              # 工具函数
```

## 核心模块

### SudokuGame 类
- 游戏状态管理
- 棋盘数据存储
- 游戏配置信息
- 序列化/反序列化

### SudokuService 类
- 数独棋盘生成
- 游戏规则验证
- 智能提示算法
- 冲突检测
- 数据持久化

### 游戏难度配置
```javascript
const GameDifficulty = {
  level1: { displayName: '1级', gridSize: 4, numberRange: 4, initialClues: 8, checkLimit: 5, hintLimit: 3 },
  level2: { displayName: '2级', gridSize: 4, numberRange: 4, initialClues: 5, checkLimit: 5, hintLimit: 3 },
  level3: { displayName: '3级', gridSize: 6, numberRange: 6, initialClues: 16, checkLimit: 5, hintLimit: 3 },
  // ... 更多难度级别
}
```

## 技术特性

### 算法实现
- **棋盘生成**：基于预定义模板的随机变换算法
- **规则验证**：行、列、子区域的完整性检查
- **智能提示**：基于约束强度和候选数分析的难度评估
- **冲突检测**：实时检查数字放置的合法性

### 性能优化
- **增量更新**：只更新变化的棋盘区域
- **内存管理**：及时清理定时器和事件监听器
- **数据缓存**：本地存储游戏状态和统计数据

### 用户体验
- **无缝保存**：每秒自动保存游戏进度
- **快速响应**：优化的渲染性能
- **错误处理**：完善的异常捕获和用户提示

## 使用说明

1. **开始游戏**：
   - 在主页选择难度级别（1-9级）
   - 点击"开始游戏"按钮

2. **游戏操作**：
   - 点击空白格子选中
   - 使用底部数字键盘输入数字
   - 点击相同数字可清除

3. **游戏辅助**：
   - **擦除**：清除选中格子的数字
   - **备注**：开启/关闭备注模式
   - **检查**：显示当前棋盘的冲突情况
   - **提示**：智能推荐最容易填写的格子

4. **游戏管理**：
   - 支持中途退出，下次打开自动继续
   - 游戏完成后可选择再来一局或返回主页
   - 在个人中心查看游戏统计和管理数据

## 开发说明

本项目使用微信小程序原生开发框架，主要技术栈：
- **TypeScript**：类型安全的 JavaScript 超集
- **WXML**：微信小程序标记语言
- **WXSS**：微信小程序样式语言
- **小程序API**：存储、界面、导航等

### 从 Flutter 移植的主要变更
1. **语言转换**：Dart → TypeScript/JavaScript
2. **UI框架**：Flutter Widgets → WXML/WXSS
3. **状态管理**：StatefulWidget → 小程序 Component data
4. **本地存储**：SharedPreferences → wx.getStorageSync
5. **导航系统**：Navigator → wx.navigateTo

项目完整保留了原 Flutter 版本的所有核心功能和游戏逻辑，并针对小程序平台进行了优化。