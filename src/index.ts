import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const RAINDROP_API_BASE = "https://api.raindrop.io/rest/v1";

// バリデーションスキーマ
const CreateBookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  collection: z.number().optional(),
});

const SearchBookmarksSchema = z.object({
  query: z.string(),
  tags: z.array(z.string()).optional(),
});

const server = new Server(
  {
    name: "raindrop-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// APIリクエストヘルパー
async function makeRaindropRequest(
  endpoint: string,
  method: string = "GET",
  body?: any
) {
  const token = process.env.RAINDROP_TOKEN;
  if (!token) {
    throw new Error("RAINDROP_TOKEN is not set");
  }

  const response = await fetch(`${RAINDROP_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Raindrop API error: ${response.statusText}`);
  }

  return response.json();
}

// ツール一覧の定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create-bookmark",
        description: "Create a new bookmark in Raindrop.io",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to bookmark",
            },
            title: {
              type: "string",
              description: "Title for the bookmark (optional)",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for the bookmark (optional)",
            },
            collection: {
              type: "number",
              description: "Collection ID to save to (optional)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "search-bookmarks",
        description: "Search through your Raindrop.io bookmarks",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by tags (optional)",
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

// ツール実行のハンドリング
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === "create-bookmark") {
        const { url, title, tags, collection } =
          CreateBookmarkSchema.parse(args);

        const bookmark = await makeRaindropRequest("/raindrop", "POST", {
          link: url,
          title,
          tags,
          collection: collection || { $id: 0 },
        });

        return {
          content: [
            {
              type: "text",
              text: `Bookmark created successfully: ${bookmark.link}`,
            },
          ],
        };
      }

      if (name === "search-bookmarks") {
        const { query, tags } = SearchBookmarksSchema.parse(args);

        const searchParams = new URLSearchParams({
          search: query,
          ...(tags && { tags: tags.join(",") }),
        });

        const results = await makeRaindropRequest(
          `/raindrops/0?${searchParams}`
        );

        const formattedResults = results.items
          .map(
            (item: any) => `
Title: ${item.title}
URL: ${item.link}
Tags: ${item.tags.join(", ") || "No tags"}
---`
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text:
                results.items.length > 0
                  ? `Found ${results.items.length} bookmarks:\n${formattedResults}`
                  : "No bookmarks found matching your search.",
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid arguments: ${error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      throw error;
    }
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Raindrop MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
