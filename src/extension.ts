// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { parseTree, findNodeAtLocation, getLocation } from "jsonc-parser";
import { JSONPath } from "jsonpath-plus";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "json-tools" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "json-tools.goToJsonPath",
    async () => {
      // Show a QuickPick that provides suggestions as the user types.
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor or file open");
        return;
      }

      const doc = editor.document;
      const content = doc.getText();
      const tree = parseTree(content);
      if (!tree) {
        console.error("Failed to parse JSON");
        return;
      }

      // Collect all possible JSON-paths and node locations from the parsed tree
      const allPaths: Array<{
        path: string;
        pathArray: (string | number)[];
        offset: number;
        length: number;
      }> = [];
      collectPaths(tree, [], allPaths);

      // Precompute short previews for each path (slice of document text at node)
      const makePreview = (offset: number, length: number) => {
        try {
          const raw = content.substring(offset, offset + length);
          const single = raw.replace(/\s+/g, " ").trim();
          if (single.length > 120) {
            return single.slice(0, 120) + "…";
          }
          return single;
        } catch (e) {
          return "";
        }
      };

      const allItems = allPaths.map((it) => ({
        ...it,
        preview: makePreview(it.offset, it.length),
      }));

      const qp = vscode.window.createQuickPick();
      qp.placeholder =
        "Enter JSON path (type to filter suggestions or paste one)";
      qp.matchOnDescription = true;
      qp.matchOnDetail = true;

      // initially show top-level paths with value previews
      qp.items = allItems
        .slice(0, 100)
        .map((p) => ({ label: p.path, description: p.preview }));

      const updateItems = (value: string) => {
        if (!value) {
          qp.items = allItems
            .slice(0, 100)
            .map((p) => ({ label: p.path, description: p.preview }));
          return;
        }
        const q = value.toLowerCase();
        const filtered = allItems
          .filter(
            (p) =>
              p.path.toLowerCase().startsWith(q) ||
              p.path.toLowerCase().includes(q) ||
              p.preview.toLowerCase().includes(q)
          )
          .slice(0, 200);
        qp.items = filtered.map((p) => ({
          label: p.path,
          description: p.preview,
        }));
      };

      const disposables: vscode.Disposable[] = [];

      disposables.push(
        qp.onDidChangeValue((v) => {
          updateItems(v);
        })
      );

      disposables.push(
        qp.onDidAccept(async () => {
          const selected =
            qp.selectedItems && qp.selectedItems[0]
              ? qp.selectedItems[0].label
              : qp.value;
          qp.hide();
          try {
            if (!selected) {
              return;
            }
            // convert the path string into a path array usable by findNodeAtLocation
            const jsonPathArray = JSONPath.toPathArray(selected)
              .filter((segment) => segment !== "")
              .map((segment) => {
                const intVal = parseInt(segment);
                return !Number.isNaN(intVal) ? intVal : segment;
              });

            const node = findNodeAtLocation(tree, jsonPathArray);
            if (!node) {
              vscode.window.showErrorMessage(
                `Path not found in document: ${selected}`
              );
              return;
            }
            const range = new vscode.Range(
              doc.positionAt(node.offset),
              doc.positionAt(node.offset + node.length)
            );
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
          } catch (err) {
            console.error(err);
            vscode.window.showErrorMessage("Failed to navigate to JSON path");
          }
        })
      );

      disposables.push(
        qp.onDidHide(() => {
          disposables.forEach((d) => d.dispose());
        })
      );

      qp.show();
    }
  );

  const copyPath = vscode.commands.registerCommand(
    "json-tools.copyJsonPath",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor or file open");
        return;
      }

      const doc = editor.document;
      const content = doc.getText();
      const position = editor.selection.active;
      const offset = doc.offsetAt(position);

      try {
        const location = getLocation(content, offset);
        const path = location.path || [];

        const pathStr = pathToString(path);
        if (!pathStr) {
          vscode.window.showInformationMessage("No JSON path at cursor");
          return;
        }

        await vscode.env.clipboard.writeText(pathStr);
        vscode.window.showInformationMessage(`Copied JSON path: ${pathStr}`);
      } catch (err) {
        console.error(err);
        vscode.window.showErrorMessage("Failed to compute JSON path");
      }
    }
  );

  context.subscriptions.push(copyPath);

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function pathToString(path: Array<string | number>): string {
  if (!path || path.length === 0) {
    return "";
  }

  const isIdentifier = (s: string) => {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);
  };

  let out = "";
  path.forEach((segment, idx) => {
    if (typeof segment === "number") {
      out += `[${segment}]`;
      return;
    }

    // string segment
    if (idx === 0) {
      // first segment — don't prefix with dot
      if (isIdentifier(segment)) {
        out += segment;
      } else {
        out += `['${(segment as string).replace(/'/g, "\\'")}']`;
      }
    } else {
      if (isIdentifier(segment)) {
        out += `.${segment}`;
      } else {
        out += `['${(segment as string).replace(/'/g, "\\'")}']`;
      }
    }
  });

  return out;
}

// Collect all JSON paths from a jsonc-parser node tree.
// node: the parseTree node; currentPath: accumulated path segments; out: array to append {path, offset, length}
function collectPaths(
  node: any,
  currentPath: Array<string | number>,
  out: Array<{
    path: string;
    pathArray: (string | number)[];
    offset: number;
    length: number;
  }>
) {
  if (!node) {
    return;
  }

  // object nodes have children which are property nodes
  if (node.type === "object" && Array.isArray(node.children)) {
    for (const prop of node.children) {
      // property node: children[0] is key node, children[1] is value node
      const keyNode = prop.children && prop.children[0];
      const valueNode = prop.children && prop.children[1];
      const key = keyNode && keyNode.value !== undefined ? keyNode.value : null;
      if (key === null) {
        continue;
      }
      const newPath = [...currentPath, key];
      const target = valueNode || prop;
      out.push({
        path: pathToString(newPath),
        pathArray: newPath,
        offset: target.offset || 0,
        length: target.length || 0,
      });
      collectPaths(valueNode, newPath, out);
    }
    return;
  }

  // array nodes have children which are value nodes
  if (node.type === "array" && Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const newPath = [...currentPath, i];
      out.push({
        path: pathToString(newPath),
        pathArray: newPath,
        offset: child.offset || 0,
        length: child.length || 0,
      });
      collectPaths(child, newPath, out);
    }
    return;
  }

  // property nodes (safety) — handle similarly to object child
  if (
    node.type === "property" &&
    Array.isArray(node.children) &&
    node.children.length >= 2
  ) {
    const keyNode = node.children[0];
    const valueNode = node.children[1];
    const key = keyNode && keyNode.value !== undefined ? keyNode.value : null;
    if (key === null) {
      return;
    }
    const newPath = [...currentPath, key];
    const target = valueNode || node;
    out.push({
      path: pathToString(newPath),
      pathArray: newPath,
      offset: target.offset || 0,
      length: target.length || 0,
    });
    collectPaths(valueNode, newPath, out);
    return;
  }

  // literal nodes: nothing further to traverse
}
