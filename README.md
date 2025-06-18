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
