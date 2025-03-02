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
  page: z.number().min(0).optional(),
  perpage: z.number().min(1).max(50).optional(),
  sort: z
    .enum([
      "-created",
      "created",
      "-last_update",
      "last_update",
      "-title",
      "title",
      "-domain",
      "domain",
    ])
    .optional(),
  collection: z.number().optional(),
  word: z.boolean().optional(),
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
            page: {
              type: "number",
              description: "Page number (0-based, optional)",
            },
            perpage: {
              type: "number",
              description: "Items per page (1-50, optional)",
            },
            sort: {
              type: "string",
              enum: [
                "-created",
                "created",
                "-last_update",
                "last_update",
                "-title",
                "title",
                "-domain",
                "domain",
              ],
              description:
                "Sort order (optional). Prefix with - for descending order.",
            },
            collection: {
              type: "number",
              description:
                "Collection ID to search in (optional, 0 for all collections)",
            },
            word: {
              type: "boolean",
              description: "Whether to match exact words only (optional)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list-collections",
        description: "List all your Raindrop.io collections",
        inputSchema: {
          type: "object",
          properties: {},
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
        const { query, tags, page, perpage, sort, collection, word } =
          SearchBookmarksSchema.parse(args);

        const searchParams = new URLSearchParams({
          search: query,
          ...(tags && { tags: tags.join(",") }),
          ...(page !== undefined && { page: page.toString() }),
          ...(perpage !== undefined && { perpage: perpage.toString() }),
          ...(sort && { sort }),
          ...(word !== undefined && { word: word.toString() }),
        });

        const collectionId = collection ?? 0;
        const results = await makeRaindropRequest(
          `/raindrops/${collectionId}?${searchParams}`
        );

        const formattedResults = results.items
          .map(
            (item: any) => `
Title: ${item.title}
URL: ${item.link}
Tags: ${item.tags?.length ? item.tags.join(", ") : "No tags"}
Created: ${new Date(item.created).toLocaleString()}
Last Updated: ${new Date(item.lastUpdate).toLocaleString()}
---`
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text:
                results.items.length > 0
                  ? `Found ${results.count} total bookmarks (showing ${
                      results.items.length
                    } on page ${page ?? 0 + 1}):\n${formattedResults}`
                  : "No bookmarks found matching your search.",
            },
          ],
        };
      }

      if (name === "list-collections") {
        const collections = await makeRaindropRequest("/collections");

        const formattedCollections = collections.items
          .map(
            (item: any) => `
Name: ${item.title}
ID: ${item._id}
Count: ${item.count} bookmarks
Parent: ${item.parent?._id || "None"}
Created: ${new Date(item.created).toLocaleString()}
---`
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text:
                collections.items.length > 0
                  ? `Found ${collections.items.length} collections:\n${formattedCollections}`
                  : "No collections found.",
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
