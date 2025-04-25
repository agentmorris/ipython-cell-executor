# IPython Cell Executor

A VS Code extension that allows you to execute Python cells in an IPython terminal with shared namespace between cells.

## Features

- Execute Python cells (delimited by `#%%`) in an IPython terminal
- Shared namespace between cells and the IPython terminal (variables and imports persist)
- Line-by-line execution for selections (perfect for debugging sessions)
- Automatically creates an IPython terminal if none exists
- Returns focus to the editor after execution
- Supports both regular development and debugging workflows

## Requirements

- VS Code 1.74.0 or higher
- IPython must be installed in your Python environment

## Installation

### From VSIX File

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu at the top of the Extensions view
5. Select "Install from VSIX..."
6. Navigate to and select the `.vsix` file

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Package the extension: `vsce package --allow-missing-repository`
5. Install the resulting `.vsix` file in VS Code using "Install from VSIX..."

## Usage

### Key Bindings

- `Ctrl+Alt+Enter`: Execute the current cell in the IPython terminal
- `Ctrl+Shift+Enter`: Execute the current selection in the IPython terminal (line-by-line)

### Commands

You can also use the Command Palette (`Ctrl+Shift+P`) to run the following commands:

- `IPython: Execute Current Cell in Terminal`
- `IPython: Execute Current Selection in Terminal`

## How It Works

### Cell Execution

When you execute a cell:

1. The extension identifies the cell containing your cursor (delimited by `#%%`)
2. It removes the cell delimiter line if present
3. It copies the code to the clipboard
4. It uses IPython's `%paste -q` magic to execute the code in the active namespace
5. Focus returns to the editor

### Selection Execution

When you execute a selection (useful during debugging):

1. The extension sends each line of your selected code individually to the IPython terminal
2. This works even when you're at a PDB or IPDB prompt
3. Focus returns to the editor after execution

## PDB Mode Support

When debugging with PDB or IPDB, you can toggle "PDB Mode" to improve how code is executed:

- Use `Ctrl+Alt+,` to toggle between regular IPython mode and PDB mode
- In PDB mode, the extension uses specialized line-by-line execution that preserves variable scope and state
- A status bar indicator shows whether you're in "IPython Mode" or "PDB Mode"

### Selection Execution in PDB Mode

When in PDB mode, selection execution (`Ctrl+Shift+Enter`) has smart behavior:

- For single-line expressions (e.g., variable names), it sends the expression directly to the terminal
  - This allows you to see the values of variables by simply selecting and executing them
- For multi-line code or statements with control structures, it uses a specialized line-by-line execution
  - This preserves your PDB session state and allows complex code blocks to execute properly
  - Variables defined in executed code blocks will be available in your PDB session

### Indentation Handling

The extension automatically handles indented code blocks:

- When executing code in PDB mode, the extension normalizes indentation before sending it line-by-line
- This means you can select and execute code that's indented within functions or classes
- The extension also handles line continuations (backslash at the end of a line)
- These formatting improvements ensure your code executes correctly within the PDB session

### Debugging Workflow:

1. Execute cells with `Ctrl+Alt+Enter` during normal development
2. When you hit a breakpoint (using `pdb.set_trace()`, `breakpoint()`, etc.), switch to PDB mode with `Ctrl+Alt+,`
3. Use the selection execution method that fits your current need:
   - Select a variable name and press `Ctrl+Shift+Enter` to see its value
   - Select a multi-line code block and press `Ctrl+Shift+Enter` to execute it with proper indentation
4. When you exit PDB, switch back to regular mode with `Ctrl+Alt+,`
5. All variables defined during PDB mode execution will be available in your debugging session


## Customization

You can customize the extension's keyboard shortcuts through VS Code's keyboard shortcuts editor:
1. Open VS Code's keyboard shortcuts (File > Preferences > Keyboard Shortcuts)
2. Search for "ipython" to find and modify the extension's commands

## Troubleshooting

### Terminal Not Found

If the extension can't find your IPython terminal:

1. Open a new terminal in VS Code
2. Run `ipython`
3. Try executing your cell again

### Execution Not Working

Make sure:

1. Your cursor is inside a Python cell
2. IPython is properly installed in your environment
3. Your code doesn't contain syntax errors
