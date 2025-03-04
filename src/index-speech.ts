#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

class SpeechToTextMcpServer {
  private server: Server;
  private tempDir: string;

  constructor() {
    this.server = new Server(
      {
        name: 'speech-to-text-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Create a temporary directory for audio files
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speech-to-text-'));
    
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      // Clean up temp directory
      try {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error cleaning up temp directory:', error);
      }
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'transcribe_audio',
          description: 'Transcribe audio to text using fastWhisper',
          inputSchema: {
            type: 'object',
            properties: {
              audio_data: {
                type: 'string',
                description: 'Base64 encoded audio data',
              },
              audio_format: {
                type: 'string',
                description: 'Audio format (e.g., wav, mp3)',
                default: 'wav',
              },
            },
            required: ['audio_data'],
          },
        },
        {
          name: 'execute_voice_command',
          description: 'Execute a voice command in VSCode',
          inputSchema: {
            type: 'object',
            properties: {
              audio_data: {
                type: 'string',
                description: 'Base64 encoded audio data',
              },
              audio_format: {
                type: 'string',
                description: 'Audio format (e.g., wav, mp3)',
                default: 'wav',
              },
            },
            required: ['audio_data'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'transcribe_audio') {
        return await this.handleTranscribeAudio(args as { audio_data: string, audio_format?: string });
      } else if (name === 'execute_voice_command') {
        return await this.handleExecuteVoiceCommand(args as { audio_data: string, audio_format?: string });
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      }
    });
  }

  private async handleTranscribeAudio(args: { audio_data: string, audio_format?: string }) {
    if (!args.audio_data) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter: audio_data'
      );
    }

    const audioFormat = args.audio_format || 'wav';
    
    try {
      // Save base64 audio data to a temporary file
      const audioFilePath = path.join(this.tempDir, `audio_${Date.now()}.${audioFormat}`);
      fs.writeFileSync(audioFilePath, Buffer.from(args.audio_data, 'base64'));
      
      // Call Python script to transcribe audio
      const { stdout, stderr } = await execAsync(`python speech_to_text.py "${audioFilePath}"`);
      
      if (stderr) {
        console.error('Error from Python script:', stderr);
      }
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(audioFilePath);
      } catch (error) {
        console.error('Error removing temporary audio file:', error);
      }
      
      const transcription = stdout.trim();
      
      return {
        content: [
          {
            type: 'text',
            text: transcription,
          },
        ],
      };
    } catch (error) {
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
  }

  private async handleExecuteVoiceCommand(args: { audio_data: string, audio_format?: string }) {
    if (!args.audio_data) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Missing required parameter: audio_data'
      );
    }

    try {
      // First, transcribe the audio
      const transcribeResult = await this.handleTranscribeAudio(args);
      
      if (transcribeResult.isError) {
        return transcribeResult;
      }
      
      const command = transcribeResult.content[0].text;
      console.error(`Recognized command: ${command}`);
      
      // Process the command
      const processedCommand = await this.processCommand(command);
      
      return {
        content: [
          {
            type: 'text',
            text: `Command executed: ${command}\nResult: ${processedCommand}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error executing voice command:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing voice command: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async processCommand(command: string): Promise<string> {
    // Simple command processing logic
    const lowerCommand = command.toLowerCase();
    
    // Example commands
    if (lowerCommand.includes('open file') || lowerCommand.includes('find file')) {
      const filePattern = command.replace(/open file|find file/i, '').trim();
      if (filePattern) {
        return `Searching for file: ${filePattern}`;
      } else {
        return 'No file pattern specified';
      }
    } else if (lowerCommand.includes('create new file')) {
      const fileName = command.replace(/create new file/i, '').trim();
      if (fileName) {
        return `Creating new file: ${fileName}`;
      } else {
        return 'No file name specified';
      }
    } else if (lowerCommand.includes('save') || lowerCommand.includes('save file')) {
      return 'Saving current file';
    } else if (lowerCommand.includes('close file')) {
      return 'Closing current file';
    } else if (lowerCommand.includes('undo')) {
      return 'Undoing last action';
    } else if (lowerCommand.includes('redo')) {
      return 'Redoing last action';
    } else {
      return `Command not recognized: ${command}`;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Speech-to-Text MCP server running on stdio');
  }
}

const server = new SpeechToTextMcpServer();
server.run().catch(console.error);