# json-tools

json-tools is a small Visual Studio Code extension that helps you discover and navigate JSON paths inside a JSON (or JSONC) document and copy the path for the value under the cursor.

It provides two lightweight, editor-focused commands:

- "Go to JSON Path" — open a Quick Pick of discovered JSON paths (with short previews) and jump to the selected value in the document.
- "Copy JSON Path" — compute the JSON path for the value at the current cursor position and copy a dot/bracket-style path to the clipboard.

## Features

- Discover all object and array paths in the current JSON document and preview values in-place.
- Quick filtering and fuzzy search in the Quick Pick; you can also paste a path directly into the Quick Pick to jump to it.
- Copy a safe dot/bracket path representation for the value at the cursor (handles identifiers and quoted keys).
- Works with JSON and JSON with comments (uses `jsonc-parser`) and resolves paths with the same parsed tree.

## Commands

The extension contributes the following commands (also available on the editor context menu when the language is `json`):

- `json-tools.goToJsonPath` — "Go to JSON Path"
- `json-tools.copyJsonPath` — "Copy JSON Path"

You can run them from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) or find them in the editor context menu when editing JSON files.

## How to use

1. Open a JSON or JSONC file in the editor.
2. To navigate visually: right-click anywhere in the editor or open the Command Palette and choose "Go to JSON Path". A Quick Pick will appear showing discovered paths and a short preview of the value. Type to filter or paste a path and press Enter to jump to it.
3. To copy a path: place the cursor on or inside a value (key, object, array element) and run the "Copy JSON Path" command. The dot/bracket-style path will be copied to your clipboard and a confirmation message shown.

Example copied paths:

- top-level identifier: myKey
- nested property: parent.child.name
- array element: items[0].name
- quoted key: ['weird-key'].value

Notes:

- The "Go to JSON Path" Quick Pick shows a limited initial set of items for performance. Filtering increases the search set.
- The extension uses `jsonc-parser` to parse the document; if the file is not valid JSON/JSONC the extension may not find paths.

## Limitations & edge cases

- Malformed JSON: parsing must succeed to collect paths; the commands will report failures in that case.
- Very large JSON documents may take longer to collect all paths — the Quick Pick limits and filtering are used to keep the UI responsive.
- The path format produced and used by the extension is a dot/bracket path (not necessarily a full JSONPath expression). The Quick Pick accepts typed input and tries to match entries; you can paste JSONPath-like strings but behavior depends on how the path parses to segments.
