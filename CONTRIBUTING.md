# Contributing

## Implementation notes

- The extension scans the parsed JSON tree and generates paths for object properties and array indices.
- Navigation uses the node offset/length to select and reveal the target range.
- Copying computes a safe path string (identifier vs quoted key) and writes it to the clipboard.

## Development

This project uses TypeScript and depends on `jsonc-parser` and `jsonpath-plus` at runtime. Build and test scripts are available in `package.json`.

If you want to run and test locally:

1. Install dependencies: use your package manager (pnpm/npm/yarn) to install.
2. Compile TypeScript: `npm run compile` (or run `pnpm` equivalent).
3. Launch the extension in the Extension Development Host from VS Code.

## Publishing

Create vsix package with `vsce package`

Upload to extension registries:

### Open VSX

https://github.com/eclipse/openvsx/wiki/Publishing-Extensions

`npx ovsx publish <vsix file>`
