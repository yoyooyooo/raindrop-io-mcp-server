#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const RAINDROP_API_BASE = "https://api.raindrop.io/rest/v1";
// 创建MCP服务器
const server = new McpServer({
    name: "Raindrop.io MCP Server",
    version: "1.0.0",
});
// APIリクエストヘルパー
async function makeRaindropRequest(endpoint, method = "GET", body) {
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
// 添加创建书签工具
server.tool("create-bookmark", "Create a new bookmark in Raindrop.io", {
    url: z.string().url().describe("URL to bookmark"),
    title: z.string().optional().describe("Title for the bookmark (optional)"),
    tags: z
        .array(z.string())
        .optional()
        .describe("Tags for the bookmark (optional)"),
    collection: z
        .number()
        .optional()
        .describe("Collection ID to save to (optional)"),
}, async ({ url, title, tags, collection }) => {
    try {
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
    catch (error) {
        throw new Error(`Failed to create bookmark: ${error.message}`);
    }
});
// 添加搜索书签工具
server.tool("search-bookmarks", "Search through your Raindrop.io bookmarks", {
    query: z.string().describe("Search query"),
    tags: z.array(z.string()).optional().describe("Filter by tags (optional)"),
    page: z
        .number()
        .min(0)
        .optional()
        .describe("Page number (0-based, optional)"),
    perpage: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Items per page (1-50, optional)"),
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
        .optional()
        .describe("Sort order (optional). Prefix with - for descending order."),
    collection: z
        .number()
        .optional()
        .describe("Collection ID to search in (optional, 0 for all collections)"),
    word: z
        .boolean()
        .optional()
        .describe("Whether to match exact words only (optional)"),
}, async ({ query, tags, page, perpage, sort, collection, word }) => {
    try {
        const searchParams = new URLSearchParams({
            search: query,
            ...(tags && { tags: tags.join(",") }),
            ...(page !== undefined && { page: page.toString() }),
            ...(perpage !== undefined && { perpage: perpage.toString() }),
            ...(sort && { sort }),
            ...(word !== undefined && { word: word.toString() }),
        });
        const collectionId = collection ?? 0;
        const results = await makeRaindropRequest(`/raindrops/${collectionId}?${searchParams}`);
        const formattedResults = results.items
            .map((item) => `
Title: ${item.title}
URL: ${item.link}
Tags: ${item.tags?.length ? item.tags.join(", ") : "No tags"}
Created: ${new Date(item.created).toLocaleString()}
Last Updated: ${new Date(item.lastUpdate).toLocaleString()}
---`)
            .join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: results.items.length > 0
                        ? `Found ${results.count} total bookmarks (showing ${results.items.length} on page ${page ?? 0 + 1}):\n${formattedResults}`
                        : "No bookmarks found matching your search.",
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Search failed: ${error.message}`);
    }
});
// 添加列出收藏夹工具
server.tool("list-collections", "List all your Raindrop.io collections", {}, async () => {
    try {
        const collections = await makeRaindropRequest("/collections");
        const formattedCollections = collections.items
            .map((item) => `
Name: ${item.title}
ID: ${item._id}
Count: ${item.count} bookmarks
Parent: ${item.parent?._id || "None"}
Created: ${new Date(item.created).toLocaleString()}
---`)
            .join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: collections.items.length > 0
                        ? `Found ${collections.items.length} collections:\n${formattedCollections}`
                        : "No collections found.",
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Failed to list collections: ${error.message}`);
    }
});
