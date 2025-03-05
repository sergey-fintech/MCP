#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
class WhisperMcpServer {
    constructor() {
        this.server = new Server({
            name: 'whisper-stt-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Create a temporary directory for audio files if it doesn't exist
        this.audioDir = path.join(process.cwd(), 'temp_audio');
        if (!fs.existsSync(this.audioDir)) {
            fs.mkdirSync(this.audioDir, { recursive: true });
        }
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
                    name: 'transcribe_audio',
                    description: 'Transcribe audio to text using faster-whisper',
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
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
            }
            const args = request.params.arguments;
            if (!args.audio_base64) {
                throw new McpError(ErrorCode.InvalidParams, 'Missing required parameter: audio_base64');
            }
            try {
                // Save the audio data to a temporary file
                const audioFilePath = path.join(this.audioDir, `audio_${Date.now()}.wav`);
                const audioBuffer = Buffer.from(args.audio_base64, 'base64');
                fs.writeFileSync(audioFilePath, audioBuffer);
                console.error(`Saved audio to ${audioFilePath}`);
                // Prepare the command to run the Python script
                const pythonScript = path.join(process.cwd(), 'whisper_server.py');
                // Create a JSON object to send to the Python script
                const requestData = {
                    audio: args.audio_base64,
                    language: args.language || null
                };
                // Use node-fetch to send a request to the Python HTTP server
                const response = await fetch('http://localhost:8081/transcribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                // Clean up the temporary audio file
                fs.unlinkSync(audioFilePath);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                console.error('Error transcribing audio:', error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error transcribing audio: ${error instanceof Error ? error.message : String(error)}`,
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
        console.error('Whisper STT MCP server running on stdio');
    }
}
const server = new WhisperMcpServer();
server.run().catch(console.error);
