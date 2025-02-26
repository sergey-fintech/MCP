#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  created: string;
}

class FileFinder {
  searchFiles(fragment: string): FileInfo[] {
    const results: FileInfo[] = [];
    this.walkDir('.', fragment, results);
    return results;
  }

  private walkDir(dir: string, fragment: string, results: FileInfo[]): void {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        this.walkDir(fullPath, fragment, results);
      } else if (file.name.includes(fragment)) {
        const stats = fs.statSync(fullPath);
        results.push({
          name: file.name,
          path: path.resolve(fullPath),
          size: stats.size,
          created: stats.birthtime.toLocaleString()
        });
      }
    }
  }
}

class FileFinderMcpServer {
  private server: Server;
  private fileFinder: FileFinder;

  constructor() {
    this.server = new Server(
      {
        name: 'file-finder-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.fileFinder = new FileFinder();
    
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_files',
          description: 'Search for files containing a specified fragment in their names',
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
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as { fragment: string };
      
      if (!args.fragment) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: fragment'
        );
      }

      try {
        const results = this.fileFinder.searchFiles(args.fragment);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error searching files:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
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
    console.error('File Finder MCP server running on stdio');
  }
}

const server = new FileFinderMcpServer();
server.run().catch(console.error);
