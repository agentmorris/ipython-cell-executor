# IPython Cell Executor

A VS Code extension that allows you to execute Python cells in an IPython terminal with shared namespace between cells.

## Features

- Execute Python cells (delimited by `#%%`) in an IPython terminal
- Shared namespace between cells and the IPython terminal (variables and imports persist)
- Line-by-line execution for selections (perfect for debugging sessions)
- Three execution modes: IPython (clipboard), Run File (`%run -i`), and PDB
- Run File mode works over VS Code Remote SSH (no clipboard/display required)
- Automatically creates an IPython terminal if none exists
- Returns focus to the editor after execution
- Click the status bar mode indicator to cycle between modes

## Requirements

- VS Code 1.74.0 or higher
- IPython must be installed in your Python environment

## Installation

### From the VS Code marketplace (recommended)

This extension is available on the VS Code Marketplace [here](https://marketplace.visualstudio.com/items?itemName=agentmorris.ipython-cell-executor).

### From VSIX file

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu at the top of the Extensions view
5. Select "Install from VSIX..."
6. Navigate to and select the `.vsix` file

### From source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Package the extension: `vsce package --allow-missing-repository --skip-license`
5. Install the resulting `.vsix` file in VS Code using "Install from VSIX..."

## Usage

### Key bindings

- `Ctrl+Alt+Enter`: Execute the current cell in the IPython terminal
- `Ctrl+Shift+Enter`: Execute the current selection in the IPython terminal (line-by-line)
- `Ctrl+Alt+,`: Cycle execution mode (IPython → Run File → PDB)

### Commands

You can also use the Command Palette (`Ctrl+Shift+P`) to run the following commands:

- `IPython: Execute Current Cell in Terminal`
- `IPython: Execute Current Selection in Terminal`
- `IPython: Toggle PDB Mode` (cycles through all three execution modes)

## Execution modes

The extension supports three execution modes, cycled with `Ctrl+Alt+,` or by clicking the status bar indicator:

### IPython Mode (default)

Cell execution uses the clipboard and IPython's `%paste -q` magic for atomic execution:

1. The extension identifies the cell containing your cursor (delimited by `#%%`)
2. It removes the cell delimiter line if present
3. It copies the code to the clipboard
4. It uses IPython's `%paste -q` magic to execute the code in the active namespace
5. Focus returns to the editor

Selection execution sends each line individually via the terminal.

### Run File Mode

Cell execution writes the code to a temporary file and runs it with `%run -i`, which executes in the interactive namespace (variables persist between cells). This mode avoids the clipboard entirely, making it compatible with **VS Code Remote SSH** sessions where the remote machine has no display server (which causes `%paste` to fail with a `TclError`).

Selection execution sends each line individually via the terminal (same as IPython mode).

### PDB Mode

For use when stopped at a PDB or IPDB breakpoint. Both cell and selection execution use line-by-line sending with indentation normalization and line continuation handling.

Selection execution has smart behavior in PDB mode:

- For single-line expressions (e.g., variable names), it sends the expression directly to the terminal, allowing you to inspect variable values
- For multi-line code or statements with control structures, it uses line-by-line execution that preserves your PDB session state

### Debugging workflow

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

### Terminal not found

If the extension can't find your IPython terminal:

1. Open a new terminal in VS Code
2. Run `ipython`
3. Try executing your cell again

### Execution not working

Make sure:

1. Your cursor is inside a Python cell
2. IPython is properly installed in your environment
3. Your code doesn't contain syntax errors

## Development

### Publishing updates to the VS Code Marketplace

To publish a new version of this extension:

1. **Update the version** in `package.json`:
   ```json
   "version": "0.2.10"
   ```
   Follow semantic versioning: MAJOR.MINOR.PATCH

2. **Publish to the marketplace** (this compiles and packages automatically):
   ```bash
   vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN
   ```

**About the Personal Access Token (PAT)**

- The PAT is required for every publish operation (not just the initial one)
- Get your PAT from Azure DevOps: https://dev.azure.com
- The PAT must have **Marketplace (Manage)** scope

**Publisher account**

- Publisher: `agentmorris`
- Manage extensions at: https://marketplace.visualstudio.com/manage/publishers/agentmorris
