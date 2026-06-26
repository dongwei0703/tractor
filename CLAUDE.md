# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

拖拉机（80分/升级）纸牌游戏，三国主题。Vue 3 + Pinia + TypeScript + Vite 单页应用，1 玩家 + 3 AI，两副牌 108 张。

## 常用命令

```bash
npm install              # 安装依赖
npm run dev              # 启动开发服务器 (默认 http://localhost:5173)
npm run build            # 类型检查 + 生产构建
npx vue-tsc --noEmit    # 仅类型检查，不构建
```

无测试框架配置。`test_sim.ts` 是独立 Node.js 脚本，用 `npx tsx test_sim.ts` 运行 20 轮自动模拟。

## 核心架构

```
src/
├── main.ts                  # Vue 入口，挂载 Pinia + App
├── App.vue                  # 根组件，StartScreen / GameBoard 切换
├── store/game.ts            # Pinia store — 游戏状态机（核心）
├── game/                    # 纯逻辑层，无 Vue 依赖
│   ├── types.ts             # Card, Suit, Seat, GamePhase, TrickPlay 等类型
│   ├── constants.ts         # 花色、点数映射、分数阈值、玩家名称
│   ├── deck.ts              # 创建/洗牌/发牌/排序（两副108张）
│   ├── comparator.ts        # isTrump, getCardPower, identifyPlayType
│   ├── rules.ts             # getValidLeads(首出) / getValidFollows(跟牌)
│   ├── trick.ts             # determineTrickWinner — 墩胜负判定
│   ├── scoring.ts           # countTrickPoints, calculateLevelChange
│   └── ai.ts                # shouldBid(叫牌), selectPlay(出牌)
└── components/              # Vue UI 组件
    ├── StartScreen.vue      # 开始界面（难度选择）
    ├── GameBoard.vue        # 主布局（四座 + 中央出牌区）
    ├── CardHand.vue         # 手牌展示 + 出牌/扣底按钮
    ├── CardComponent.vue    # 单张牌渲染
    ├── ScoreBar.vue         # 顶部信息栏
    ├── BiddingPanel.vue     # 叫主面板
    ├── PlayedTrick.vue      # 已出牌展示
    └── RoundResult.vue      # 局结束结果弹窗
```

## 关键设计

### 游戏状态机 (store/game.ts)

阶段流转：`start → dealing → bidding/bottom_cards → playing → round_end`

- **发牌**：`setInterval` 逐张发，每张间隔 140ms，发牌过程中 AI 可抢主
- **出牌**：人类玩家通过 `playSelectedCards()` 入口 → 规则校验 → `playerPlay()` 执行
- **AI**：通过 `scheduleAutoPlay()` 延迟触发 `doAutoPlay()` → `ai.selectPlay()`
- **墩结算**：四人出满 → `finishTrick()` → 25 墩后 `endRound()`

### 出牌规则校验（最近修复）

校验链：`CardHand 点击选牌`（无校验，自由选）→ `playSelectedCards()`（**校验点**）→ `playerPlay()`（执行）

- **首出**：调用 `getValidLeads()` 验证选中的牌是否为合法首出牌型
- **跟牌**：调用 `getValidFollows()` 验证花色、牌型是否合规，支持杀牌/垫牌
- 校验失败时设置 `store.playError`，UI 显示红色错误提示

### 牌力体系 (comparator.ts)

```
大王(16) → 1000    小王(15) → 900    级牌 → 800    将牌花色 → 500+rank    普通牌 → rank(2-14)
```

主牌判定优先级：joker > 级牌 > 将牌花色。一张牌同时满足多个条件时取最高优先级的判定。

### 座位与团队

| 座位 | 名称 | 团队 | 类型 |
|------|------|------|------|
| 0 | 玩家 | us | 人类 |
| 1 | 关羽 | them | AI |
| 2 | 刘备 | us | AI |
| 3 | 张飞 | them | AI |

### AI 难度差异

| 难度 | 叫牌门槛 (该花色≥N张) | 出牌策略 |
|------|----------------------|----------|
| easy | 8 张 | 随机选合法牌 |
| hard | 6 张 | smartPick（有分出大、无分出小） |
| crazy | 5 张 | 同 hard |

### 计分系统

总分 200 分。非庄家得分按阈值升级：0-15 升3级, 16-35 升2级, 36-75 升1级, 76-115 下台, 116-155 扣1级, 156-195 扣2级, 196-200 扣3级。

## 路径别名

`@/` 映射到 `src/`，在 `vite.config.ts` 和 `tsconfig.json` 中配置。
