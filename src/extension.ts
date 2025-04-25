// extension.ts - clipboard-based cell execution approach using %paste
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Add output channel for debugging
const outputChannel = vscode.window.createOutputChannel('IPython Cell Executor');

// Track pdb mode state
let inPdbMode = false;

// Status bar item to show current mode
let statusBarItem: vscode.StatusBarItem;

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
    
    // Check if cursor is at a cell delimiter line
    const cursorLine = document.lineAt(cursorPosition.line);
    const isCursorAtCellMarker = cursorLine.text.trim().startsWith('#%%');
    
    // Find all cells in the document
    const cells = findPythonCells(document);
    
    // Special case: if cursor is at a cell marker, we want this cell, not the previous one
    if (isCursorAtCellMarker) {
        // Find the cell that starts at this line
        for (const cell of cells) {
            if (cell.start.line === cursorPosition.line) {
                return cell;
            }
        }
    }
    
    // Standard case: find which cell contains the cursor
    for (const cell of cells) {
        if (cell.contains(cursorPosition)) {
            return cell;
        }
    }
    
    return undefined;
}

// Function to execute code using the clipboard and %paste -q (quiet mode)
async function executeViaClipboard(code: string, terminal: vscode.Terminal): Promise<void> {
    try {
        // Write the code to the clipboard
        await vscode.env.clipboard.writeText(code);
        
        outputChannel.appendLine('Code copied to clipboard for execution');
        
        // Execute the clipboard contents using %paste -q (quiet mode)
        outputChannel.appendLine('Executing code with %paste -q in IPython');
        terminal.sendText('%paste -q', false);
        
        setTimeout(() => {
            terminal.sendText('', true); // Explicitly add line ending
        }, 100);

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
        outputChannel.appendLine(`Error executing via clipboard: ${error}`);
        vscode.window.showErrorMessage(`Error executing code: ${error}`);
    }
}

// Function to get or create IPython terminal
function getOrCreateIPythonTerminal(): vscode.Terminal {
    // First check if the active terminal is an IPython terminal
    const activeTerminal = vscode.window.activeTerminal;
    if (activeTerminal && activeTerminal.name.toLowerCase().includes('ipython')) {
        return activeTerminal;
    }
    
    // If active terminal is not an IPython terminal, look for any IPython terminal
    const terminals = vscode.window.terminals;
    for (const terminal of terminals) {
        if (terminal.name.toLowerCase().includes('ipython')) {
            // We found an IPython terminal, make it visible and return it
            terminal.show();
            return terminal;
        }
    }
    
    // Create a new IPython terminal if none exists
    const newTerminal = vscode.window.createTerminal('IPython');
    newTerminal.sendText('ipython');
    return newTerminal;
}

// Function to execute current cell with clipboard-based approach
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
    
    // Execute differently based on mode
    if (inPdbMode) {
        outputChannel.appendLine('Using PDB mode execution (temp file) for cell');
        // await executeThroughTempFileInPdb(codeToExecute, terminal);
		await executeLineByLineInPdb(codeToExecute, terminal);
    } else {
        // Regular execution via clipboard using %paste
        outputChannel.appendLine('Using standard IPython execution (clipboard) for cell');
        await executeViaClipboard(codeToExecute, terminal);
    }
    
    outputChannel.appendLine('==== executeCurrentCell completed ====');
}

// Function to send code to IPython terminal line by line
function sendToIPythonTerminalLineByLine(code: string, terminal: vscode.Terminal) {
    outputChannel.appendLine('==== sendToIPythonTerminalLineByLine called ====');
    
    // Split the code into lines
    const lines = code.split('\n');
    
    // Send each line individually
    for (const line of lines) {
        if (line.trim()) {  // Only send non-empty lines
            // Try sending without automatic line ending
            terminal.sendText(line, false);
            // Then explicitly send the line ending
            setTimeout(() => {
                terminal.sendText('', true);
            }, 10);
        }
    }
    
    // Add a newline at the end to ensure execution
    // terminal.sendText('');
    
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
    
    outputChannel.appendLine('==== sendToIPythonTerminalLineByLine completed ====');
}

// Function to execute selection in pdb via temporary file
async function executeThroughTempFileInPdb(code: string, terminal: vscode.Terminal): Promise<void> {
    outputChannel.appendLine('==== executeThroughTempFileInPdb called ====');
    
    // Normalize indentation before execution
    const normalizedCode = normalizeIndentation(code);
    outputChannel.appendLine('Normalized indentation for PDB execution');
    
    // Create a temp file with the normalized code
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `pdb_exec_${Date.now()}.py`);
    
    try {
        // Write the code to a temp file
        fs.writeFileSync(tmpFilePath, normalizedCode);
        outputChannel.appendLine(`Code written to temporary file: ${tmpFilePath}`);
        
        // In pdb, use the 'source' command instead of exec()
        // Use backslash escaping for Windows paths
        const escapedPath = tmpFilePath.replace(/\\/g, '\\\\');
        terminal.sendText(`source ${escapedPath}`);
        outputChannel.appendLine(`Sent source command to terminal for file: ${escapedPath}`);
        
        // Return focus to editor after execution
        setTimeout(() => {
            if (vscode.window.activeTextEditor) {
                vscode.window.showTextDocument(
                    vscode.window.activeTextEditor.document, 
                    vscode.window.activeTextEditor.viewColumn
                );
            }
        }, 300);
    } catch (error) {
        outputChannel.appendLine(`Error executing via temp file: ${error}`);
        vscode.window.showErrorMessage(`Error executing code: ${error}`);
    } finally {
        // Clean up the temp file after a delay
        setTimeout(() => {
            try {
                if (fs.existsSync(tmpFilePath)) {
                    fs.unlinkSync(tmpFilePath);
                    outputChannel.appendLine(`Removed temporary file: ${tmpFilePath}`);
                }
            } catch (err) {
                outputChannel.appendLine(`Error removing temp file: ${err}`);
            }
        }, 1000);
    }
    
    outputChannel.appendLine('==== executeThroughTempFileInPdb completed ====');
}

// Function to normalize indentation in code
function normalizeIndentation(code: string): string {
    // Split the code into lines
    const lines = code.split('\n');
    
    // Find the minimum indentation level (number of leading spaces or tabs)
    let minIndent = Number.MAX_SAFE_INTEGER;
    
    // Examine each non-empty line
    for (const line of lines) {
        // Skip empty lines
        if (line.trim().length === 0) {
            continue;
        }
        
        // Count leading whitespace
        const leadingWhitespace = line.length - line.trimLeft().length;
        
        // Update minimum indentation
        if (leadingWhitespace < minIndent) {
            minIndent = leadingWhitespace;
        }
    }
    
    // If all lines are empty or no common indentation was found
    if (minIndent === Number.MAX_SAFE_INTEGER) {
        minIndent = 0;
    }
    
    // Remove the common indentation from each line
    const normalizedLines = lines.map(line => {
        // Skip empty lines
        if (line.trim().length === 0) {
            return line;
        }
        
        // Remove exactly the minimum indentation
        return line.substring(minIndent);
    });
    
    // Join the normalized lines back together
    return normalizedLines.join('\n');
}

// Function to execute code line by line in PDB mode
async function executeLineByLineInPdb(code: string, terminal: vscode.Terminal): Promise<void> {
    outputChannel.appendLine('==== executeLineByLineInPdb called ====');
    
    // Normalize indentation before execution
    const normalizedCode = normalizeIndentation(code);
    outputChannel.appendLine('Normalized indentation for PDB execution');
    
    // Handle line continuation (backslash at end of line)
    const expandedCode = expandLineContinuations(normalizedCode);
    outputChannel.appendLine('Expanded line continuations for PDB execution');
    
    // Split the code into lines
    const lines = expandedCode.split('\n');
    
    // Send each line individually to maintain scope
    for (const line of lines) {
        if (line.trim()) {  // Only send non-empty lines
            outputChannel.appendLine(`Sending line to PDB: "${line}"`);
            
            // Send the line without automatic line ending
            terminal.sendText(line, false);
            
            // Then explicitly send the line ending
            await new Promise(resolve => setTimeout(resolve, 50));
            terminal.sendText('', true);
            
            // Allow more time for PDB to process the line
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Return focus to editor after execution
    setTimeout(() => {
        if (vscode.window.activeTextEditor) {
            vscode.window.showTextDocument(
                vscode.window.activeTextEditor.document, 
                vscode.window.activeTextEditor.viewColumn
            );
        }
    }, 300);
    
    outputChannel.appendLine('==== executeLineByLineInPdb completed ====');
}

// Function to expand line continuations (backslash at end of line)
function expandLineContinuations(code: string): string {
    const lines = code.split('\n');
    const expandedLines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if the line ends with a backslash (line continuation)
        if (line.trim().endsWith('\\')) {
            // Remove the backslash and append to the current line
            currentLine += line.slice(0, line.lastIndexOf('\\')).trimRight();
        } else if (currentLine) {
            // This is the last line of a continuation - append and reset
            currentLine += line;
            expandedLines.push(currentLine);
            currentLine = '';
        } else {
            // Normal line with no continuation
            expandedLines.push(line);
        }
    }
    
    // In case the last line had a continuation but there were no more lines
    if (currentLine) {
        expandedLines.push(currentLine);
    }
    
    return expandedLines.join('\n');
}
// Function to execute current selection with pdb awareness
async function executeCurrentSelection() {
    outputChannel.appendLine('==== executeCurrentSelection called ====');
    
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
    
    // Special case for single expressions in PDB mode
    const isSingleLine = !selectedText.includes('\n');
    const isExpression = !selectedText.includes('=') && 
                          !selectedText.includes(':') && 
                          !selectedText.trim().startsWith('def ') &&
                          !selectedText.trim().startsWith('class ') &&
                          !selectedText.trim().startsWith('if ') &&
                          !selectedText.trim().startsWith('for ') &&
                          !selectedText.trim().startsWith('while ');
    
    if (inPdbMode) {
        if (isSingleLine && isExpression) {
            // For single expressions in PDB mode, use direct line execution
            // This allows viewing variable values
            outputChannel.appendLine('Using direct execution for single expression in PDB mode');
            terminal.sendText(selectedText);
            
            // Return focus to editor after a short delay
            setTimeout(() => {
                if (vscode.window.activeTextEditor) {
                    vscode.window.showTextDocument(
                        vscode.window.activeTextEditor.document, 
                        vscode.window.activeTextEditor.viewColumn
                    );
                }
            }, 300);
        } else {
            // For multi-line code in PDB mode, use exec()
            outputChannel.appendLine('Using PDB mode execution (temp file)');
            // await executeThroughTempFileInPdb(selectedText, terminal);
			await executeLineByLineInPdb(selectedText, terminal);
        }
    } else {
        // In IPython mode, always use line-by-line
        outputChannel.appendLine('Using standard IPython execution (line-by-line)');
        sendToIPythonTerminalLineByLine(selectedText, terminal);
    }
    
    outputChannel.appendLine('==== executeCurrentSelection completed ====');
}

// Function to toggle pdb mode
function togglePdbMode() {
    inPdbMode = !inPdbMode;
    outputChannel.appendLine(`PDB mode ${inPdbMode ? 'enabled' : 'disabled'}`);
    // No pop-up message, only status bar indicator
    
    // Update status bar to indicate current mode
    updateStatusBar();
}

// Create and update status bar
function createStatusBar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    statusBarItem.show();
}

// Update status bar text based on mode
function updateStatusBar() {
    statusBarItem.text = inPdbMode ? "$(debug) PDB Mode" : "$(terminal) IPython Mode";
    statusBarItem.tooltip = inPdbMode ? 
        "Using file-based execution for PDB" : 
        "Using line-by-line execution for IPython";
}

// Activate extension
export function activate(context: vscode.ExtensionContext) {
    // Create status bar
    createStatusBar(context);
    
    // Register commands
    const cellCommand = vscode.commands.registerCommand(
        'ipython-cell-executor.executeCell', 
        executeCurrentCell
    );
    
    const selectionCommand = vscode.commands.registerCommand(
        'ipython-cell-executor.executeSelection', 
        executeCurrentSelection
    );
    
    const toggleCommand = vscode.commands.registerCommand(
        'ipython-cell-executor.togglePdbMode', 
        togglePdbMode
    );
    
    // Add all commands to subscriptions
    context.subscriptions.push(cellCommand, selectionCommand, toggleCommand);
    
    outputChannel.appendLine('IPython Cell Executor extension activated');
}

// Deactivate extension
export function deactivate() {
    outputChannel.appendLine('IPython Cell Executor extension deactivated');
}
