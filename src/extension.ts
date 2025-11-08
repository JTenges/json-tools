// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { parseTree, findNodeAtLocation, getLocation } from "jsonc-parser";

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
      const jsonPath = await vscode.window.showInputBox({
        prompt: "Enter JSON path (e.g. user.name or items[0].id)",
        placeHolder: "user.name",
        value: "",
      });

			if (!jsonPath) {
        // log error
        console.error("No JSON path");
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor or file open");
        return;
      }

      // get the current file contents as a string
      const doc = editor.document;
      const content = doc.getText();

      const tree = parseTree(content);
      if (!tree) {
        // log error
        console.error("Failed to parse JSON");
        return;
      }
      const node = findNodeAtLocation(tree, jsonPath.split(".")); // or compute path array
      if (!node) {
        // log error
        console.error("Failed to find JSON node");
        return;
      }
      const range = new vscode.Range(
        doc.positionAt(node.offset),
        doc.positionAt(node.offset + node.length)
      );
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range);
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
