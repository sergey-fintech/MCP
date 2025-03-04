# File Finder MCP Server

Это сервер Model Context Protocol (MCP), который предоставляет функциональность поиска файлов. Он позволяет искать файлы, содержащие указанный текстовый фрагмент в их именах.

## Предварительные требования

- Node.js (версия 14 или выше)
- npm (версия 6 или выше)
- Python 3.6 или выше (для HTTP сервера)

## Установка

1. Клонируйте или скачайте этот репозиторий
2. Перейдите в директорию проекта
3. Установите зависимости:
   ```
   npm install
   ```
4. Соберите проект:
   ```
   npm run build
   ```

## Запуск сервера

Проект предоставляет несколько вариантов запуска MCP сервера:

### Вариант 1: Прямой запуск MCP сервера

Вы можете запустить MCP сервер напрямую с помощью Node.js:

```
npm start
```

или

```
node build/index.js
```

Это запустит сервер, и он будет ожидать JSON-RPC запросы на stdin/stdout.

### Вариант 2: Запуск HTTP сервера и MCP прокси

Этот вариант использует Python HTTP сервер и MCP прокси, который перенаправляет запросы к HTTP серверу:

1. Сначала запустите HTTP сервер:
   ```
   npm run start:python
   ```
   или
   ```
   python main.py
   ```

2. Затем в другом терминале запустите MCP прокси:
   ```
   npm run start:http
   ```
   или
   ```
   node build/index-http.js
   ```

### Вариант 3: Интеграция с VS Code (расширение Cline)

Для интеграции сервера с VS Code и расширением Cline:

1. Найдите файл настроек MCP:
   - Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2. Добавьте следующую конфигурацию в объект `mcpServers` в файле настроек:

```json
"file-finder-mcp": {
  "command": "node",
  "args": ["<ПОЛНЫЙ_ПУТЬ_К_ПРОЕКТУ>/build/index.js"],
  "disabled": false,
  "autoApprove": []
}
```

Для использования HTTP прокси:

```json
"file-finder-mcp-http": {
  "command": "node",
  "args": ["<ПОЛНЫЙ_ПУТЬ_К_ПРОЕКТУ>/build/index-http.js"],
  "disabled": false,
  "autoApprove": []
}
```

Замените `<ПОЛНЫЙ_ПУТЬ_К_ПРОЕКТУ>` на фактический путь к директории вашего проекта.

3. Перезапустите VS Code для загрузки обновленных настроек.

## Доступные инструменты

MCP сервер предоставляет один инструмент:

- `search_files`: Ищет файлы, содержащие указанный фрагмент в их именах
  - Параметры:
    - `fragment` (строка, обязательный): Текстовый фрагмент для поиска в именах файлов

## Пример использования

```
<use_mcp_tool>
<server_name>file-finder-mcp</server_name>
<tool_name>search_files</tool_name>
<arguments>
{
  "fragment": ".py"
}
</arguments>
</use_mcp_tool>
```

Этот пример ищет все файлы, содержащие ".py" в их именах.

## HTTP сервер (main.py)

В корневой директории проекта находится файл `main.py`, который реализует HTTP сервер для поиска файлов. Этот сервер предоставляет REST API для поиска файлов, содержащих указанный фрагмент в их именах.

### Запуск HTTP сервера

1. Перейдите в корневую директорию проекта
2. Запустите сервер с помощью Python:
   ```
   python main.py
   ```
3. Сервер будет запущен на http://localhost:8080

### Использование API

Для поиска файлов отправьте GET запрос на `/search` с параметром запроса `q`:

```
http://localhost:8080/search?q=.json
```

Этот запрос вернет JSON-массив с информацией о всех файлах, содержащих ".json" в их именах. Каждый элемент массива содержит следующие поля:
- `name`: имя файла
- `path`: абсолютный путь к файлу
- `size`: размер файла в байтах
- `created`: дата и время создания файла

Пример ответа:
```json
[
    {
        "name": "package.json",
        "path": "/absolute/path/to/package.json",
        "size": 1234,
        "created": "Wed Feb 26 17:00:00 2025"
    }
]
```

## Устранение неполадок

- Если вы получаете ошибку "No connection found for server", убедитесь, что вы перезапустили VS Code после обновления настроек MCP.
- Если сервер не отвечает, проверьте, что путь в настройках MCP правильный и указывает на собранный JavaScript файл.
- Убедитесь, что сервер правильно собран, выполнив `npm run build` перед попыткой его использования.
- Для использования HTTP прокси убедитесь, что HTTP сервер запущен на http://localhost:8080.

## Когда использовать file-finder-mcp, а когда file-finder-mcp-http

Проект предоставляет два варианта MCP сервера для поиска файлов. Ниже приведены рекомендации, когда использовать каждый из них:

### file-finder-mcp (прямой MCP сервер)

**Рекомендуется использовать, когда:**
- Вам нужно простое решение без дополнительных зависимостей
- Вы хотите запустить только один процесс
- У вас нет необходимости в HTTP API для поиска файлов
- Вы работаете в среде, где Python недоступен
- Вам не требуется расширенная функциональность или интеграция с другими сервисами

**Преимущества:**
- Простота: запускается одной командой
- Меньше зависимостей: требуется только Node.js
- Меньше ресурсов: запускается один процесс вместо двух
- Прямая реализация: поиск файлов выполняется непосредственно в Node.js

### file-finder-mcp-http (HTTP прокси)

**Рекомендуется использовать, когда:**
- Вам нужен также HTTP API для поиска файлов
- Вы хотите иметь возможность использовать функциональность поиска файлов через REST API
- Вы планируете расширять функциональность HTTP сервера
- Вы предпочитаете реализацию поиска файлов на Python
- Вам нужна возможность вызывать API поиска файлов из других приложений

**Преимущества:**
- Гибкость: доступ к функциональности через MCP и HTTP API
- Расширяемость: можно легко добавить новые эндпоинты в HTTP сервер
- Разделение ответственности: MCP сервер отвечает только за коммуникацию, а HTTP сервер - за логику поиска
- Возможность независимого использования HTTP API

**Обратите внимание:** При использовании file-finder-mcp-http необходимо запустить два процесса:
1. Python HTTP сервер (main.py)
2. Node.js MCP прокси (build/index-http.js)

## Структура проекта

Ниже приведен список основных файлов проекта и их назначение:

### Корневая директория
- `src/index.ts` - Исходный код TypeScript MCP сервера (прямая реализация)
- `src/index-http.ts` - Исходный код TypeScript MCP прокси для HTTP сервера
- `build/index.js` - Скомпилированный JavaScript код MCP сервера
- `build/index-http.js` - Скомпилированный JavaScript код MCP прокси
- `tsconfig.json` - Конфигурация TypeScript
- `package.json` - Описание пакета и зависимости
- `main.py` - HTTP сервер на Python для поиска файлов
- `README.md` - Документация проекта (этот файл)

# Speech-to-Text MCP Server

This is a Model Context Protocol (MCP) server that provides speech-to-text functionality for voice commands in VSCode. It allows you to transcribe audio to text and execute voice commands.

## Prerequisites

- Node.js (version 14 or higher)
- npm (version 6 or higher)
- Python 3.6 or higher
- PyTorch
- faster-whisper

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install Node.js dependencies:
   ```
   npm install
   ```
4. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
5. Build the project:
   ```
   npm run build
   ```

## Running the Server

The project provides several options for running the MCP server:

### Option 1: Direct MCP Server

You can run the speech-to-text MCP server directly with Node.js:

```
npm run start:speech
```

or

```
node build/index-speech.js
```

This will start the server, and it will wait for JSON-RPC requests on stdin/stdout.

### Option 2: Integration with VS Code (Cline Extension)

To integrate the server with VS Code and the Cline extension:

1. Find the MCP settings file:
   - Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

2. Add the following configuration to the `mcpServers` object in the settings file:

```json
"speech-to-text-mcp": {
  "command": "node",
  "args": ["<FULL_PATH_TO_PROJECT>/build/index-speech.js"],
  "disabled": false,
  "autoApprove": []
}
```

Replace `<FULL_PATH_TO_PROJECT>` with the actual path to your project directory.

3. Restart VS Code to load the updated settings.

## Available Tools

The speech-to-text MCP server provides two tools:

- `transcribe_audio`: Transcribes audio to text using fastWhisper
  - Parameters:
    - `audio_data` (string, required): Base64 encoded audio data
    - `audio_format` (string, optional, default: "wav"): Audio format (e.g., wav, mp3)

- `execute_voice_command`: Executes a voice command in VSCode
  - Parameters:
    - `audio_data` (string, required): Base64 encoded audio data
    - `audio_format` (string, optional, default: "wav"): Audio format (e.g., wav, mp3)

## Example Usage

```
<use_mcp_tool>
<server_name>speech-to-text-mcp</server_name>
<tool_name>transcribe_audio</tool_name>
<arguments>
{
  "audio_data": "<BASE64_ENCODED_AUDIO>",
  "audio_format": "wav"
}
</arguments>
</use_mcp_tool>
```

This example transcribes the provided audio data to text.

```
<use_mcp_tool>
<server_name>speech-to-text-mcp</server_name>
<tool_name>execute_voice_command</tool_name>
<arguments>
{
  "audio_data": "<BASE64_ENCODED_AUDIO>",
  "audio_format": "wav"
}
</arguments>
</use_mcp_tool>
```

This example executes a voice command based on the transcribed audio.

## Supported Voice Commands

The speech-to-text MCP server supports the following voice commands:

- "Open file [filename]" or "Find file [filename]": Searches for a file with the specified name
- "Create new file [filename]": Creates a new file with the specified name
- "Save" or "Save file": Saves the current file
- "Close file": Closes the current file
- "Undo": Undoes the last action
- "Redo": Redoes the last action

## Troubleshooting

- If you get a "No connection found for server" error, make sure you've restarted VS Code after updating the MCP settings.
- If the server doesn't respond, check that the path in the MCP settings is correct and points to the built JavaScript file.
- Make sure the server is properly built by running `npm run build` before attempting to use it.
- If you encounter issues with the speech recognition, check that you have installed all the required Python dependencies.
- Make sure the audio data is properly encoded in base64 format.

## Python Speech-to-Text Script (speech_to_text.py)

The project includes a Python script `speech_to_text.py` that uses faster-whisper to transcribe audio files. This script is called by the MCP server to perform speech-to-text conversion.

### Running the Script Directly

You can run the script directly to transcribe an audio file:

```
python speech_to_text.py path/to/audio/file.wav
```

By default, the script uses the "base" model size. You can specify a different model size using the `--model` parameter:

```
python speech_to_text.py path/to/audio/file.wav --model medium
```

Available model sizes are: tiny, base, small, medium, large.