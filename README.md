# Hermes Projects Plugin

A project-centric overview and launcher plugin for the Hermes Desktop app.

## Overview

The **Hermes Projects Plugin** adds a dedicated Projects view to Hermes Desktop, allowing you to organize, browse, and jump directly into sessions grouped by project directories and Git repositories.

### Key Features
- **Project-first browsing**: View your local repositories and projects in a structured grid or list.
- **Direct session launch**: Create new chat sessions scoped immediately to a project's working directory (`cwd`).
- **Session history per project**: See recent sessions, timestamps, and quick previews tied directly to each project workspace.
- **Profile & route preservation**: Keeps active profile context and connection routes aligned when switching sessions.
- **Native folder picker integration**: Pick project folders effortlessly using the native macOS/system dialog.

---

## Installation

### Option 1: Git Clone (Recommended)

Run the following command in your terminal to clone the plugin directly into your Hermes desktop plugins directory:

```bash
mkdir -p ~/.hermes/desktop-plugins
git clone https://github.com/maavangent/hermes-projects-plugin.git ~/.hermes/desktop-plugins/projects
```

*Note: If you are using a named profile, install it to `~/.hermes/profiles/<profile>/desktop-plugins/projects` instead.*

### Option 2: Symlink an Existing Clone

If you already cloned the repository elsewhere:

```bash
mkdir -p ~/.hermes/desktop-plugins
ln -s "/path/to/hermes-projects-plugin" ~/.hermes/desktop-plugins/projects
```

---

## How to Use

1. Open (or focus) the **Hermes Desktop app**.
2. If the plugin does not appear automatically in the sidebar:
   - Press `⌘K` (or `Ctrl+K` on Windows/Linux) to open the Command Palette.
   - Run **"Reload desktop plugins"**.
3. You can also verify that the plugin is enabled under **Settings → Plugins**.
4. Click **Projects** in the navigation bar to start organizing your workspaces.

---

## License

MIT
