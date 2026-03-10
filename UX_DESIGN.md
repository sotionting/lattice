# UX 设计规范 — 每次写前端代码必读

> **强制要求**：每次修改任何前端文件前，必须先阅读本文件，确认改动符合所有设计规范，不得以"偷懒"为由省略任何细节。

---

## 一、设计原则（最高优先级）

1. **完整性**：用户能看见的每一个元素都必须完整实现。用户上传了附件，**无论在哪种模式下**，附件都必须在消息气泡中显示，不能因为"模式不同"而省略。
2. **一致性**：同类元素在所有页面/模式下行为和外观必须一致。用户消息气泡在对话/图像/视频模式下外观完全相同。
3. **反馈及时**：任何用户操作都必须有即时视觉反馈（loading 状态、禁用态、颜色变化）。
4. **参考标准**：UI 风格对标 **Claude.ai** 和 **ChatGPT**，不得使用过时/简陋的布局。

---

## 二、色彩规范

### 页面背景
| 区域 | 颜色 |
|---|---|
| 整体页面背景 | `#f7f7f8`（极浅灰，非纯白） |
| 消息列表区域 | 透明（继承页面背景） |
| 顶部栏 / 输入卡片 | `#ffffff`（纯白） |

### 模式主题色（三套，不可混用）
| 模式 | 主色 | 渐变 | 阴影色 |
|---|---|---|---|
| 对话模式（chat） | `#1677ff` | `linear-gradient(135deg, #1677ff, #0958d9)` | `rgba(22,119,255,0.25)` |
| 图像生成（image） | `#eb2f96` | `linear-gradient(135deg, #eb2f96, #c41d7f)` | `rgba(235,47,150,0.25)` |
| 视频生成（video） | `#722ed1` | `linear-gradient(135deg, #722ed1, #531dab)` | `rgba(114,46,209,0.25)` |

### 文字色
| 用途 | 颜色 |
|---|---|
| 主要文字 | `#1a1a1a` |
| 次要文字 | `#666` |
| 时间戳 / 辅助说明 | `#bbb` |
| 占位符 | `#999` |

---

## 三、布局规范

### 整体结构
```
┌─────────────────────────────────────────┐
│  顶部栏（56px，白色，底部 1px #ebebeb）  │
├─────────────────────────────────────────┤
│                                         │
│  消息区域（flex:1，可滚动）              │
│  内容居中：max-width 760px              │
│                                         │
├─────────────────────────────────────────┤
│  底部输入区（白色背景，自适应高度）       │
│  内容居中：max-width 760px              │
│  ├─ 模式切换标签（Segmented，居中）     │
│  └─ 输入卡片（圆角 16px，白色卡片）     │
└─────────────────────────────────────────┘
```

### 消息列表内边距
- 上下内边距：`24px 20px 12px`
- 每条消息间距：`margin-bottom: 28px`

### 输入区域
- 外层 padding：`0 20px 16px`
- 模式切换标签：`margin-bottom: 10px`，水平居中
- 输入卡片 padding：`10px 14px`
- 底部提示文字：`font-size: 11px, color: #bbb, margin-top: 8px`

---

## 四、消息气泡规范

### ❗ 核心规则：用户消息必须完整显示所有内容
**用户发送的消息气泡，无论当前是对话/图像/视频模式，必须包含：**
1. 附件区（如有）：图片缩略图 / 视频播放器 / 音频播放器，显示在文字上方
2. 文字内容（如有）：`pre-wrap` 保留换行
3. 时间戳：右对齐，`font-size: 11px, color: #bbb`

**任何 `handleSend` 分支中创建 `userMsg` 时，必须携带 `attachments: currentAttachments`，不得省略。**

### 用户消息（右对齐）
```
布局：display:flex, justifyContent:flex-end, alignItems:flex-end, gap:10px
最大宽度：70%
气泡样式：
  background: #1677ff
  color: #fff
  border-radius: 18px 4px 18px 18px  （右上角小，其余大）
  padding: 11px 15px
  box-shadow: 0 2px 6px rgba(22,119,255,0.25)
  font-size: 14px, line-height: 1.65
  white-space: pre-wrap, word-break: break-word
头像：右侧，size=36，绿色背景，显示用户名首字母
```

### AI 消息（左对齐）
```
布局：display:flex, gap:10px, alignItems:flex-start
头像：左侧，size=36，颜色 = 当前模式主题色，带彩色阴影
气泡样式：
  background: #fff
  color: #1a1a1a
  border-radius: 4px 18px 18px 18px  （左上角小，其余大）
  padding: 11px 15px
  box-shadow: 0 1px 4px rgba(0,0,0,0.07)
  border: 1px solid #f0f0f0
  font-size: 14px, line-height: 1.7
```

### 附件展示（用户消息内）
- 图片：`AntImage`，`maxWidth:220px, maxHeight:160px, borderRadius:10px`，支持点击放大
- 视频：`<video controls>`，`maxWidth:260px, maxHeight:160px, borderRadius:10px`
- 音频：`<audio controls>`，`maxWidth:260px, borderRadius:10px`
- 附件区在文字上方，`margin-bottom: 6px`（有文字时）

---

## 五、输入卡片规范

```
外层容器：
  background: #fff
  border: 1px solid #e0e0e0
  border-radius: 16px（无附件时）/ 0 0 16px 16px（有附件时，顶部与附件区无缝拼接）
  box-shadow: 0 4px 20px rgba(0,0,0,0.07)
  padding: 10px 14px

内部布局（flexbox，alignItems:flex-end）：
  [📎 附件按钮] [textarea 文本框（flex:1）] [发送/生成按钮]

textarea 规范：
  border: none, outline: none, resize: none
  font-size: 14px, line-height: 1.6
  background: transparent
  自动撑高：onInput 事件调整 height，最高 160px
  Enter 发送（所有模式），Shift+Enter 换行

发送按钮：
  border-radius: 10px, height: 34px, paddingInline: 16px
  对话模式文字："发送"，图像/视频模式文字："生成"
  颜色使用当前模式渐变色
  disabled 条件：
    - 对话模式：无文字且无附件，或正在流式输出
    - 图像/视频模式：无文字（Prompt 必须是文字），或正在请求中
```

---

## 六、附件预览栏规范（输入框上方）

```
显示条件：attachments.length > 0
位置：输入卡片正上方，与卡片无缝拼接（卡片顶部圆角变为 0）
容器样式：
  display: flex, gap: 8px, flexWrap: wrap
  padding: 10px 14px 6px
  background: #fff
  border: 1px solid #e0e0e0
  border-bottom: none
  border-radius: 12px 12px 0 0

每个附件项：
  图片：60x60 正方形，objectFit:cover，borderRadius:8px，支持点击预览
  视频/音频：60x60 方块，图标 + 文件名（截断），浅灰背景
  删除按钮：右上角 CloseCircleFilled，红色，白色背景圆形
```

---

## 七、欢迎屏规范（空消息时）

```
显示条件：messages.length === 0 && !loading && !initLoading
布局：flex column, alignItems:center, minHeight:52vh, gap:20px

图标容器：
  width:76px, height:76px, borderRadius:22px
  background: 当前模式渐变色
  box-shadow: 0 10px 30px 模式阴影色

标题：font-size:24px, fontWeight:700, color:#111
描述：font-size:14px, color:#888, lineHeight:1.8, maxWidth:420px

示例按钮（快捷 Prompt）：
  padding: 8px 16px, borderRadius: 20px
  background: #fff, border: 1px solid #e8e8e8
  hover 时边框和文字变为模式主题色
  点击：将示例文本填入 input 输入框
```

---

## 八、Loading 状态规范

### Loading 气泡（始终在消息列表底部）
```
位置：所有已有消息之后，messagesEndRef 之前
布局：与 AI 消息完全相同（头像在左，气泡在右）
头像颜色：当前模式主题色

气泡内容：
  - 对话模式：TypingDots 三点动画（三个灰色圆点）
  - 图像模式：<Spin size="small" /> + "正在生成图片，请稍候…" 文字
  - 视频模式：<Spin size="small" /> + "正在生成视频，请稍候…" 文字
```

### TypingDots 动画规范
```
3 个圆点，size: 7x7px，颜色 #999
animation: typingBounce 1.2s infinite
各点延迟：0s / 0.2s / 0.4s（波浪错开效果）
```

---

## 九、顶部栏规范

```
高度：56px, background:#fff, border-bottom: 1px solid #ebebeb
box-shadow: 0 1px 4px rgba(0,0,0,0.04)

左侧（模式图标 + 模型名 + 状态）：
  图标：36x36px, borderRadius:10px, 渐变背景, 彩色阴影
  模型名：fontWeight:600, fontSize:15px, color:#111
  状态点：5x5px 圆点 + 文字，就绪时绿色 #52c41a，生成中橙色 #fa8c16

右侧（模型选择 + 新建按钮）：
  Select：width:160px, size:small
  新建按钮：size:small，PlusOutlined 图标
```

---

## 十、模式切换标签规范

```
组件：Ant Design Segmented
位置：输入卡片正上方，水平居中（display:flex, justifyContent:center）
margin-bottom: 10px
background: #ebebeb（Segmented 容器背景）
disabled 条件：loading 或 streaming 期间禁止切换

切换后必须执行：
  1. setChatMode(新模式)
  2. setSelectedModelId(undefined)（让 Effect 重新选默认模型）
  3. setMessages([])（清空消息，各模式独立）
  4. setAttachments([])（清空附件）
  5. navigate('/', { replace: true })（清除 URL cid 参数）
```

---

## 十一、拖放上传规范

```
触发区域：整个聊天页面
遮罩样式：
  position:absolute, inset:0, zIndex:100, pointerEvents:none
  background: rgba(22,119,255,0.06)
  border: 2px dashed #1677ff
  display flex, alignItems:center, justifyContent:center
  图标 PaperClipOutlined，fontSize:40，#1677ff
  文字："松手即可上传" + "支持图片、视频、音频文件"

计数器逻辑：dragEnter +1，dragLeave -1，减到 0 才真正隐藏遮罩
（防止鼠标移过子元素时遮罩闪烁）
```

---

## 十二、代码质量要求

1. **每个 handleSend 分支创建 userMsg 时，必须包含 `attachments: currentAttachments`**
2. **每个模式的 loading 状态必须显示在消息列表底部，不得显示在顶部或中间**
3. **所有模式共用同一消息列表 `<div>`，不得为不同模式创建独立的面板/容器**
4. **Enter 键在所有模式下均可发送，条件：`e.key === 'Enter' && !e.shiftKey`**
5. **组件引用大小写必须一致**（如 `MarkdownComponents`，不得写成 `markdownComponents`）
6. **不得因为"模式不同"而省略用户已上传的附件显示**
