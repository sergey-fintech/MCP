#!/usr/bin/env node
// Whisper STT MCP server that forwards requests to the HTTP server at http://localhost:8081

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// HTTP server URL
const HTTP_SERVER_URL = 'http://localhost:8081';

class WhisperHttpMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'whisper-stt-mcp-http',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
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
          name: 'transcribe_audio',
          description: 'Transcribe audio to text using faster-whisper (via HTTP server)',
          inputSchema: {
            type: 'object',
            properties: {
              audio_base64: {
                type: 'string',
                description: 'Base64 encoded audio data',
              },
              language: {
                type: 'string',
                description: 'Optional language code (e.g., "en", "ru"). If not provided, language will be auto-detected.',
              },
            },
            required: ['audio_base64'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'transcribe_audio') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as { 
        audio_base64: string;
        language?: string;
      };
      
      if (!args.audio_base64) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Missing required parameter: audio_base64'
        );
      }

      try {
        // Forward the request to the HTTP server
        console.error(`Forwarding request to ${HTTP_SERVER_URL}/transcribe...`);
        
        const requestData = {
          audio: args.audio_base64,
          language: args.language || null
        };
        
        const response = await fetch(`${HTTP_SERVER_URL}/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.error(`HTTP server successfully transcribed the audio`);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } else {
          throw new Error(`HTTP server returned error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
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
    console.error('Whisper STT MCP HTTP server running on stdio');
    console.error(`Forwarding requests to ${HTTP_SERVER_URL}`);
  }
}

const server = new WhisperHttpMcpServer();
server.run().catch(console.error);