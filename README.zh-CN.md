# MCP Raindrop

基于 Raindrop.io API 的模型上下文协议（MCP）服务器实现，提供书签管理功能。

## 功能特点

- **书签管理工具**:
  - `create-bookmark`: 创建新书签，支持自定义元数据
  - `search-bookmarks`: 搜索书签，提供灵活的过滤选项
  - `list-collections`: 查看所有书签集合
- **丰富的配置选项**: 支持搜索、标签和书签组织的多种配置

### MCP 配置使用

在你的 MCP 配置中添加 Raindrop.io 服务器：

```json
{
  "mcpServers": {
    "raindrop": {
      "command": "npx",
      "args": ["-y", "@mcptools/mcp-raindrop"],
      "env": {
        "RAINDROP_TOKEN": "your-api-token"
      }
    }
  }
}
```

> 注意：请确保将 `your-api-token` 替换为你的实际 Raindrop.io API 令牌。你也可以在运行服务器之前将其设置为环境变量 `RAINDROP_TOKEN`。

## API 参考

### 书签工具

服务器提供三种可通过 MCP 调用的工具：

#### 1. 创建书签

```typescript
// 工具名称: create-bookmark
{
  url: "https://example.com/article",
  title: "示例文章",
  tags: ["示例", "文章"],
  collection: 123456
}
```

#### 2. 搜索书签

```typescript
// 工具名称: search-bookmarks
{
  query: "示例搜索",
  tags: ["示例"],
  page: 0,
  perpage: 20,
  sort: "-created",
  collection: 123456,
  word: false
}
```

#### 3. 列出集合

```typescript
// 工具名称: list-collections
{
}
```

### 响应格式

所有工具返回的响应格式如下：

```typescript
{
  content: Array<{
    type: "text";
    text: string;
  }>;
}
```

搜索结果包含：

- 标题
- URL
- 标签
- 创建日期
- 最后更新日期

集合信息包含：

- 名称
- ID
- 书签数量
- 父集合
- 创建日期

## 错误处理

所有工具都包含适当的错误处理，并会在出现问题时抛出描述性的错误消息。

## 安装

```bash
npm install @mcptools/mcp-raindrop
```

或直接使用 npx：

```bash
npx @mcptools/mcp-raindrop
```

## 开发

### 环境要求

- Node.js 16 或更高版本
- npm 或 yarn
- Raindrop.io API 令牌（从你的[Raindrop.io 账户设置](https://app.raindrop.io/settings/integrations)获取）

### 设置

1. 克隆仓库
2. 安装依赖：

```bash
npm install
```

3. 设置 Raindrop.io API 令牌：

```bash
export RAINDROP_TOKEN=your_api_token
```

### 构建

```bash
npm run build
```

## 许可证

本项目基于 MIT 许可证开源。

## 支持

如有任何问题：

- Raindrop.io API：请参考 [Raindrop.io API 文档](https://developer.raindrop.io/)
- MCP 集成：请参考 [MCP 文档](https://modelcontextprotocol.io/)
