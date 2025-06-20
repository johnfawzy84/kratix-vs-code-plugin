# Kratix Promises Explorer

This VS Code extension provides a side panel to list all available Kratix promises in the current Kubernetes cluster context (using kubectl). When a promise is selected, it displays the created instances of that promise.

## Features

- Side panel listing all available Kratix promises from the current kubectl context
- View created instances for a selected promise

## Requirements

- `kubectl` must be installed and configured to access your Kubernetes cluster
- Kratix must be installed in your cluster

## Usage

1. Open the Kratix Promises Explorer side panel from the VS Code activity bar.
2. View all available promises in your cluster.
3. Click a promise to see its created instances.

## Extension Settings

No custom settings yet.

## Known Issues

- Only works if `kubectl` is configured and accessible from your environment

## Release Notes

### 0.0.1

- Initial release with side panel and promise/instance listing

# Kratix Promises Explorer VS Code Extension

A Visual Studio Code extension that provides a side panel to list Kratix promises in the current kubectl context and show their instances and status.

## Features

- View all Kratix Promises in your cluster
- See all instances for each promise
- View detailed status/spec/events for each instance
- Edit promises and instances directly in VS Code
- Apply changes to your cluster
- Context-aware commands and menus

## Requirements

- [Node.js](https://nodejs.org/) (v20 recommended)
- [npm](https://www.npmjs.com/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed and configured
- Access to a Kubernetes cluster with Kratix installed

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/<your-org-or-username>/kratix_plugin.git
cd kratix_plugin
```

### 2. Install dependencies

```sh
npm ci
```

### 3. Build the extension

```sh
npm run compile
```

### 4. Run the extension in VS Code

- Open the folder in VS Code: `code .`
- Press `F5` to launch a new Extension Development Host window

### 5. Run tests

```sh
npm test
```

Or use the Testing view in VS Code (see below).

### 6. Package the extension

```sh
npm install -g @vscode/vsce
vsce package
```

The `.vsix` file will be generated in the project root.

## Test Discovery in VS Code

1. Install the [VS Code Extension Test Runner](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-extension-test-runner) extension.
2. Run the `watch-tests` task from the Command Palette (`Tasks: Run Task`).
3. Open the Testing view (beaker icon) to discover and run tests.

## Continuous Integration

- The GitHub Actions workflow will:
  - Build and lint the extension
  - Run all tests
  - Package the extension as a `.vsix` artifact

## Publishing

To publish to the VS Code Marketplace:

1. [Create a publisher](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions)
2. Run:

   ```sh
   vsce login <publisher>
   vsce publish
   ```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software for personal or commercial purposes, without any request or attribution to the author.
