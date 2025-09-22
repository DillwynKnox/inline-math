import * as vscode from 'vscode';
import { getResult } from './evaluate';

let activeDecoration: vscode.TextEditorDecorationType | undefined = undefined;

const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    color: '#707070',
    margin: '0 0 0 20px'
  }
});

function setActiveDecoration() {
  activeDecoration = decorationType;
}

function setInActiveDecoration(activeEditor: vscode.TextEditor) {
  if (activeDecoration) {
    activeEditor.setDecorations(activeDecoration, []);
    activeDecoration = undefined;
  }
}

export function activateEqualsDecoration() {
  vscode.workspace.onDidChangeTextDocument(evnt => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;

    const currentPosition = activeEditor.selection.active;
    const line = activeEditor.document.lineAt(currentPosition.line);
    const lineText = line.text;

    // Only decorate if line ends with '='
    if (!lineText.trim().endsWith('=')) {
      setInActiveDecoration(activeEditor);
      return;
    }

    // Range for decoration (after '=')
    const rangeStart = new vscode.Position(currentPosition.line, lineText.length - 1);
    const rangeEnd = new vscode.Position(currentPosition.line, lineText.length);
    const range = new vscode.Range(rangeStart, rangeEnd);

    try {
      const expression = lineText.slice(0, -1);
      const { result } = getResult(expression); // Use cached evaluation

      setInActiveDecoration(activeEditor);
      setActiveDecoration();

      activeEditor.setDecorations(decorationType, [{
        range,
        renderOptions: {
          after: {
            contentText: ` ${result}`
          }
        }
      }]);

      // Apply value of result to line after pressing Enter
      if (evnt.contentChanges.some(change => change.text.includes('\n'))) {
        const editWorkspace = new vscode.WorkspaceEdit();
        const editRange = new vscode.Range(
          rangeStart.translate(0, 1),
          rangeEnd.translate(0, 1)
        );
        editWorkspace.insert(activeEditor.document.uri, editRange.start, ` ${result}`);
        vscode.workspace.applyEdit(editWorkspace);

        setInActiveDecoration(activeEditor);
      }
    } catch {
      setInActiveDecoration(activeEditor);
    }
  });
}