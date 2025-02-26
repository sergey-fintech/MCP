#!/usr/bin/env node
// Modified file-finder-mcp server that forwards requests to the HTTP server at http://localhost:8080
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
// HTTP server URL
const HTTP_SERVER_URL = 'http://localhost:8080';
class FileFinderHttpMcpServer {
    constructor() {
        this.server = new Server({
            name: 'file-finder-mcp-http',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search_files',
                    description: 'Search for files containing a specified fragment in their names (via HTTP server)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            fragment: {
                                type: 'string',
                                description: 'Text fragment to search for in file names',
                            },
                        },
                        required: ['fragment'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'search_files') {
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            const args = request.params.arguments;
            if (!args.fragment) {
                throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: fragment');
            }
            try {
                // Forward the request to the HTTP server
                console.error(`Forwarding request to ${HTTP_SERVER_URL}/search?q=${args.fragment}...`);
                const response = await fetch(`${HTTP_SERVER_URL}/search?q=${args.fragment}`);
                if (response.ok) {
                    const files = await response.json();
                    console.error(`HTTP server found ${files.length} files containing '${args.fragment}'`);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(files, null, 2),
                            },
                        ],
                    };
                }
                else {
                    throw new Error(`HTTP server returned error: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Error forwarding request to HTTP server:', error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error forwarding request to HTTP server: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('File Finder MCP HTTP server running on stdio');
        console.error(`Forwarding requests to ${HTTP_SERVER_URL}`);
    }
}
const server = new FileFinderHttpMcpServer();
server.run().catch(console.error);
