# MCP Raindrop

A Model Context Protocol (MCP) server implementation for Raindrop.io API, providing bookmark management capabilities.

## Features

- **Bookmark Management Tools**:
  - `create-bookmark`: Create new bookmarks with customizable metadata
  - `search-bookmarks`: Search through your bookmarks with flexible filtering
  - `list-collections`: View all your bookmark collections
- **Rich Configuration Options**: Extensive options for searching, tagging, and organizing bookmarks

### Usage with MCP

Add the Raindrop.io MCP server to your MCP configuration:

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

> Note: Make sure to replace `your-api-token` with your actual Raindrop.io API token. You can also set it as an environment variable `RAINDROP_TOKEN` before running the server.

## API Reference

### Bookmark Tools

The server provides three tools that can be called through MCP:

#### 1. Create Bookmark

```typescript
// Tool name: create-bookmark
{
  url: "https://example.com/article",
  title: "Example Article",
  tags: ["example", "article"],
  collection: 123456
}
```

#### 2. Search Bookmarks

```typescript
// Tool name: search-bookmarks
{
  query: "example search",
  tags: ["example"],
  page: 0,
  perpage: 20,
  sort: "-created",
  collection: 123456,
  word: false
}
```

#### 3. List Collections

```typescript
// Tool name: list-collections
{
}
```

### Response Format

All tools return responses in the following format:

```typescript
{
  content: Array<{
    type: "text";
    text: string;
  }>;
}
```

For search results, each item includes:

- Title
- URL
- Tags
- Creation date
- Last update date

For collections, each item includes:

- Name
- ID
- Bookmark count
- Parent collection
- Creation date

## Error Handling

All tools include proper error handling and will throw descriptive error messages if something goes wrong.

## Installation

```bash
npm install @mcptools/mcp-raindrop
```

Or use it directly with npx:

```bash
npx @mcptools/mcp-raindrop
```

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Raindrop.io API token (get one from your [Raindrop.io account settings](https://app.raindrop.io/settings/integrations))

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set your Raindrop.io API token:

```bash
export RAINDROP_TOKEN=your_api_token
```

### Building

```bash
npm run build
```

## License

This project is licensed under the MIT License.

## Support

For any questions or issues:

- Raindrop.io API: refer to the [Raindrop.io API documentation](https://developer.raindrop.io/)
- MCP integration: refer to the [MCP documentation](https://modelcontextprotocol.io/)
