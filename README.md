# File Finder MCP Server

[![smithery badge](https://smithery.ai/badge/@sergey-fintech/MCP)](https://smithery.ai/server/@sergey-fintech/MCP)

Это сервер Model Context Protocol (MCP), который предоставляет функциональность поиска файлов. Он позволяет искать файлы, содержащие указанный текстовый фрагмент в их именах.

## Предварительные требования

- Node.js (версия 14 или выше)
- npm (версия 6 или выше)
- Python 3.6 или выше (для HTTP сервера)

## Установка

### Установка через Smithery

Для автоматической установки File Finder для Claude Desktop с помощью [Smithery](https://smithery.ai/server/@sergey-fintech/MCP):

```bash
npx -y @smithery/cli install @sergey-fintech/MCP --client claude
```

### Установка вручную
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
