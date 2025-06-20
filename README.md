# 🚀 Kratix Promises Explorer ✨

![Kratix Logo](icon.png)

> **Your Favorite Platform Engineering Orchestrator in VS Code!**

---

## 🎉 Features

- 🌱 **Browse all Kratix Promises** in your cluster
- 📦 **See all instances** for each promise, with namespace info
- 🔍 **View detailed status/spec/events** for each instance (collapsible tree)
- 📝 **Edit promises and instances** directly in VS Code
- ⚡ **Apply changes** to your cluster with a click
- 🗑️ **Delete promises/instances** with confirmation and output logging
- 🧠 **Context-aware menus** you can change the k8s context
- 🛠️ **Robust, modular codebase** for easy maintenance
- 🤖 **CI/CD with GitHub Actions**

---

## 🖥️ Extension UI & Usage Guide

### 🌟 Promises Section

- **What you see:**
  - A tree view listing all Kratix Promises in your current Kubernetes context.
  - Each promise may have an icon next to it:
    - ⬜️ (default): Promise is present, no special status.
    - ⚠️: There is a warning or error with the promise (e.g., failed status or missing resources).
    - 🟢: Promise is healthy and ready.
  - **Buttons/Context Menu:**
    - **Edit...**: Opens the promise YAML in an editor tab for direct editing.
    - **Create Instance**: Add a new instance for this promise.
    - **Delete**: Remove the promise from the cluster (with confirmation).
    - **Refresh**: Reload the list of promises from the cluster.
    - **Apply changes to cluster**: After editing, this button applies your changes using `kubectl apply -f` and shows output in the Kratix output channel.

### 📦 Instances Section

- **What you see:**
  - When you expand a promise, you see all its instances (across all namespaces).
  - Each instance shows its name and namespace.
  - **Buttons/Context Menu:**
    - **Edit...**: Edit the instance YAML directly.
    - **Delete**: Remove the instance from the cluster (with confirmation).
    - **Refresh**: Reload the list of instances for the selected promise.
  - **Selecting an instance:**
    - When you click an instance, the **Instance Details** section updates to show detailed information for that instance.

### 🧾 Instance Details Section

- **What you see:**
  - A collapsible tree showing:
    - **spec**: The spec section of the instance YAML.
    - **status**: The current status (including arrays, events, and nested fields).
    - **events**: Any Kubernetes events related to the instance.
  - You can expand/collapse nodes to explore deeply nested data.

### 🔄 Changing the kubectl Context

- **How to switch context:**
  - Click the CTRL+SHIFT+P (via the command palette: `Kratix Promises: Select kubectl Context`).
  - Choose from the list of available contexts detected by `kubectl config get-contexts`.
  - The extension will reload all promises and instances for the new context.

---

## 🚦 Requirements

- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) installed & configured
- Access to a Kubernetes cluster with [Kratix](https://kratix.io/) installed
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/)

---

## 🏁 Getting Started

1. **Clone the repo:**

   ```sh
   git clone https://github.com/johnfawzy84/kratix-vs-code-plugin.git
   cd kratix_plugin
   ```

2. **Install dependencies:**

   ```sh
   npm ci
   ```

3. **Build the extension:**

   ```sh
   npm run compile
   ```

4. **Run in VS Code:**
   - Open the folder in VS Code: `code .`
   - Press `F5` to launch a new Extension Development Host
5. **Run tests (pure logic!):**

   ```sh
   npm test
   ```

6. **Package for Marketplace:**

   ```sh
   npm install -g @vscode/vsce
   vsce package
   ```

---

## 🧪 Testing & Quality

- Pure logic is extracted to `kratixInstancesLogic.ts` and tested in `src/test/kratixInstancesLogic.test.ts` (no VS Code required!)
- Linting: `npm run lint`
- CI/CD: Automated build, lint, test, and package via GitHub Actions

---

## 📝 Changelog (Recent Highlights)

- Refactored into modular files for maintainability
- Enhanced context menus and command handling
- Collapsible tree for status/spec/events (with array support)
- Namespace-aware instance display and commands
- Delete with confirmation and output logging
- Pure logic extracted and tested (no VS Code dependency)
- Cleaned up test runner and output
- Improved docs, contributing, and licensing

See [CHANGELOG.md](CHANGELOG.md) for full details.

---

## 🤝 Contributing

We 💙 contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

---

## 📦 License

MIT — see [LICENSE](LICENSE) for details.

---

## 🎵 Soundtrack

> "Shipping code, one promise at a time!" 🎶

---

**Happy exploring! 🌟**
