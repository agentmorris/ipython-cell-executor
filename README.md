# IPython Cell Executor

A VS Code extension that allows you to execute Python cells in an IPython terminal with atomic execution and debugging support.

## Features

- Execute Python cells (delimited by `#%%`) in an IPython terminal
- Atomic execution for cells using IPython's file execution capabilities
- Line-by-line execution for selections (perfect for debugging sessions)
- Automatically creates an IPython terminal if none exists
- Returns focus to the editor after execution
- Supports both regular development and debugging workflows

## Requirements

- VS Code 1.74.0 or higher
- IPython must be installed in your Python environment

## Installation

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
3. It writes the code to a temporary file
4. It uses IPython's `%run` magic to execute the file
5. It cleans up the temporary file automatically
6. Focus returns to the editor

### Selection Execution

When you execute a selection (useful during debugging):

1. The extension sends each line of your selected code individually to the IPython terminal
2. This works even when you're at a PDB or IPDB prompt
3. Focus returns to the editor after execution

### Debugging Workflow

1. Execute cells with `Ctrl+Alt+Enter` during normal development
2. When you hit a breakpoint (using `pdb.set_trace()`, `breakpoint()`, etc.)
3. Use `Ctrl+Shift+Enter` with selected text to execute code line-by-line in the debugger context

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

### Debugging Issues

When at a PDB prompt:
1. Only use `Ctrl+Shift+Enter` with selections
2. The file-based `Ctrl+Alt+Enter` cell execution won't work in the debugger

## Known Issues

- Code execution while at a PDB prompt only works with selection execution (`Ctrl+Shift+Enter`)
- Some IPython magic commands may not work when sent line-by-line during selection execution

## Release Notes

### 0.1.0

- Initial release
- Support for cell execution with atomic execution
- Support for selection execution for debugging scenarios
- Automatic focus return to editor