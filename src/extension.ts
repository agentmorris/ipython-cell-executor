// extension.ts - file-based cell execution approach
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Add output channel for debugging
const outputChannel = vscode.window.createOutputChannel('IPython Cell Executor');

// Utility function to find Python cells in a document
function findPythonCells(document: vscode.TextDocument): vscode.Range[] {
    const cellDelimiter = '#%%';
    const lineCount = document.lineCount;
    const cells: vscode.Range[] = [];
    
    let cellStart = 0;
    
    for (let i = 0; i < lineCount; i++) {
        const line = document.lineAt(i);
        if (line.text.trim().startsWith(cellDelimiter)) {
            if (i > cellStart) {
                cells.push(new vscode.Range(cellStart, 0, i, 0));
            }
            cellStart = i;
        }
    }
    
    // Add the last cell if there is one
    if (cellStart < lineCount) {
        cells.push(new vscode.Range(cellStart, 0, lineCount, 0));
    }
    
    return cells;
}

// Function to find the current cell based on cursor position
function getCurrentCell(editor: vscode.TextEditor): vscode.Range | undefined {
    const document = editor.document;
    const cursorPosition = editor.selection.active;
    const cells = findPythonCells(document);
    
    for (const cell of cells) {
        if (cell.contains(cursorPosition)) {
            return cell;
        }
    }
    
    return undefined;
}

// Generate a temporary file path for the code
function getTempFilePath(): string {
    const tempDir = os.tmpdir();
    const fileName = `ipython_cell_${Date.now()}.py`;
    return path.join(tempDir, fileName);
}

// Function to execute code in IPython via a temp file
async function executeViaFile(code: string, terminal: vscode.Terminal): Promise<void> {
    try {
        // Create a temporary file with the code
        const filePath = getTempFilePath();
        
        outputChannel.appendLine(`Writing code to temporary file: ${filePath}`);
        await fs.promises.writeFile(filePath, code, 'utf8');
        
        // Normalize path for Windows (convert backslashes to forward slashes)
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        // Execute the file in IPython
        outputChannel.appendLine('Executing file in IPython');
        terminal.sendText(`%run "${normalizedPath}"`);
        
        // Clean up the file after a delay
        setTimeout(async () => {
            try {
                await fs.promises.unlink(filePath);
                outputChannel.appendLine(`Temporary file removed: ${filePath}`);
            } catch (error) {
                outputChannel.appendLine(`Error removing temporary file: ${error}`);
            }
        }, 2000);
        
        // Return focus to editor after a short delay
        setTimeout(() => {
            // Focus the active text editor
            if (vscode.window.activeTextEditor) {
                vscode.window.showTextDocument(
                    vscode.window.activeTextEditor.document, 
                    vscode.window.activeTextEditor.viewColumn
                );
            }
        }, 300); // Short delay to allow terminal to show output first
    } catch (error) {
        outputChannel.appendLine(`Error executing via file: ${error}`);
        vscode.window.showErrorMessage(`Error executing code: ${error}`);
    }
}

// Function to get or create IPython terminal
function getOrCreateIPythonTerminal(): vscode.Terminal {
    const terminals = vscode.window.terminals;
    
    // Look for existing IPython terminal
    for (const terminal of terminals) {
        if (terminal.name.includes('IPython')) {
            return terminal;
        }
    }
    
    // Create a new IPython terminal if none exists
    const newTerminal = vscode.window.createTerminal('IPython');
    newTerminal.sendText('ipython');
    return newTerminal;
}

// Function to execute current cell with file-based approach
async function executeCurrentCell() {
    outputChannel.appendLine('==== executeCurrentCell called ====');
    
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
        vscode.window.showErrorMessage('No active Python editor found');
        return;
    }
    
    const currentCell = getCurrentCell(editor);
    if (!currentCell) {
        vscode.window.showErrorMessage('No Python cell found at cursor position');
        return;
    }
    
    // Get the entire cell text
    const cellText = editor.document.getText(currentCell);
    
    // Split into lines for processing
    const cellLines = cellText.split('\n');
    
    // Skip the cell delimiter line if present
    let codeLines = cellLines;
    if (cellLines.length > 0 && cellLines[0].trim().startsWith('#%%')) {
        codeLines = cellLines.slice(1);
    }
    
    // Join the remaining lines back together for execution
    const codeToExecute = codeLines.join('\n');
    
    outputChannel.appendLine(`Code to execute (${codeToExecute.length} chars):`);
    outputChannel.appendLine('---CODE START---');
    outputChannel.appendLine(codeToExecute);
    outputChannel.appendLine('---CODE END---');
    
    // Get/create terminal and execute the code
    const terminal = getOrCreateIPythonTerminal();
    terminal.show();
    
    // Execute via file instead of direct paste
    await executeViaFile(codeToExecute, terminal);
    
    outputChannel.appendLine('==== executeCurrentCell completed ====');
}

// Function to send code to IPython terminal line by line
function sendToIPythonTerminalLineByLine(code: string, terminal: vscode.Terminal) {
    // Split the code into lines
    const lines = code.split('\n');
    
    // Send each line individually
    for (const line of lines) {
        if (line.trim()) {  // Only send non-empty lines
            terminal.sendText(line);
        }
    }
    
    // Add a newline at the end to ensure execution
    terminal.sendText('');
    
    // Return focus to editor after a short delay
    setTimeout(() => {
        // Focus the active text editor
        if (vscode.window.activeTextEditor) {
            vscode.window.showTextDocument(
                vscode.window.activeTextEditor.document, 
                vscode.window.activeTextEditor.viewColumn
            );
        }
    }, 300); // Short delay to allow terminal to show output first
}

// Function to execute current selection directly
async function executeCurrentSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'python') {
        vscode.window.showErrorMessage('No active Python editor found');
        return;
    }
    
    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('No text selected');
        return;
    }
    
    const selectedText = editor.document.getText(selection);
    const terminal = getOrCreateIPythonTerminal();
    terminal.show();
    
    // For selections, use line-by-line execution
    sendToIPythonTerminalLineByLine(selectedText, terminal);
}

// Activate extension
export function activate(context: vscode.ExtensionContext) {
    // Register commands
    const cellCommand = vscode.commands.registerCommand(
        'ipython-cell-executor.executeCell', 
        executeCurrentCell
    );
    
    const selectionCommand = vscode.commands.registerCommand(
        'ipython-cell-executor.executeSelection', 
        executeCurrentSelection
    );
    
    context.subscriptions.push(cellCommand, selectionCommand);
}

// Deactivate extension
export function deactivate() {}