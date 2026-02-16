# EFCore.Visualizer Agent Guide

This repository contains the source code for the **EF Core Query Plan Visualizer** Visual Studio extension.

## 1. Project Overview

- **Type**: Visual Studio Extension (VSIX).
- **Goal**: Visualize Entity Framework Core query plans directly within Visual Studio.
- **Components**:
  - **Extension (VSIX)**: `EFCore.Visualizer` (C#, .NET Framework 4.8).
  - **Core Logic**: `IQueryableObjectSource` (C#, .NET Standard/Core compatible).
  - **UI/Webview**: `src/MySql` (Vue 3, TypeScript, Vite, Bun, Vuetify).

## 2. Build & Test Commands

### 2.1. Prerequisites
- **.NET SDK**: Compatible with .NET Framework 4.8 and .NET 6+.
- **Node.js / Bun**: The UI project uses `bun` for package management and building.

### 2.2. Build Commands

To build the entire solution (including the Vue app via MSBuild targets):
```bash
dotnet build
```

To build *only* the Vue.js UI (located in `src/MySql`):
```bash
cd src/MySql
bun install
bun run build
```
*Note: The `EFCore.Visualizer.csproj` has a `BeforeTargets="Build"` task that automatically runs `bun run build`.*

### 2.3. Test Commands

**C# Tests**:
- Currently, there are no automated C# unit tests detected in the solution.
- Testing relies on manual verification within the Visual Studio Experimental Instance.

**UI Tests (Vue/TypeScript)**:
- The UI project (`src/MySql`) uses **Vitest**.
```bash
cd src/MySql
bun run vitest
```
- **Run a single test file**:
```bash
cd src/MySql
bun run vitest src/visualizer/services/__tests__/plan-parser.spec.ts
```

### 2.4. Linting & Formatting

**Vue/TypeScript**:
- Type checking is performed during build via `vue-tsc`.
```bash
cd src/MySql
bun run vue-tsc -b
```

## 3. Code Style & Conventions

### 3.1. C# (Extension & Core)

- **Framework**: .NET Framework 4.8 (VSIX), .NET 6 (Core Lib).
- **Language Version**: Latest.
- **Nullable Reference Types**: Enabled (`<Nullable>enable</Nullable>`).
- **Implicit Usings**: Enabled (`<ImplicitUsings>enable</ImplicitUsings>`).
- **Formatting**: Follow standard Visual Studio C# formatting conventions (K&R braces, 4-space indentation).
- **Naming**: PascalCase for public members/types, camelCase for local variables/parameters.
- **Async/Await**: Use `async` and `await` for I/O-bound operations. Avoid `.Result` or `.Wait()`.
- **Error Handling**: Use `try-catch` blocks where exceptions are expected, especially when interacting with VS Shell or Debugger.

### 3.2. TypeScript & Vue (UI)

- **Framework**: Vue 3 + Vite.
- **UI Library**: Vuetify.
- **Style**: **Composition API** with `<script setup lang="ts">`.
- **State Management**: Use `ref`, `computed`, and `watch` directly.
- **Styling**:
  - **Scoped CSS**: Use `<style scoped>`.
  - **VS Code Theming**: **CRITICAL**: Use VS Code CSS variables for colors to match the user's theme.
    - Background: `var(--vscode-editor-background)`
    - Foreground: `var(--vscode-editor-foreground)`
    - Borders: `var(--vscode-widget-border)`
    - Hover: `var(--vscode-list-hoverBackground)`
  - **Transparency**: Often required for components to blend with VS Code (e.g., `background: transparent !important`).
- **Components**:
  - Use PascalCase for component filenames (e.g., `QueryResults.vue`).
  - Explicitly import Vue functions: `import { ref, computed } from 'vue'`.

### 3.3. Project Structure

- `src/EFCore.Visualizer`: Main VSIX project. Contains the debugger visualizer logic and VS integration.
- `src/IQueryableObjectSource`: Object source for the visualizer.
- `src/MySql`: The webview UI. Despite the name, it seems to handle visualization logic for multiple databases (check `src/visualizer` inside it).
  - `src/MySql/src/components`: Vue components.
  - `src/MySql/src/visualizer`: Core visualization logic and parsers.

## 4. Workflow for Agents

1.  **Analyze**: Before making changes, check the `EFCore.Visualizer.csproj` dependencies and `package.json` in `src/MySql`.
2.  **Edit**:
    - If modifying C#, ensure changes are compatible with .NET Framework 4.8.
    - If modifying UI, use `bun run dev` (if possible) or `bun run build` to verify compilation.
3.  **Verify**:
    - Run `dotnet build` to ensure the integration holds.
    - Run `bun run vitest` in `src/MySql` if touching UI logic.
4.  **Conventions**:
    - **Do not** introduce new heavy dependencies without checking `package.json` or `.csproj`.
    - **Do not** hardcode colors in the UI; always use VS Code theme variables.

## 5. Known Issues / Gotchas

- **Building**: The `bun run build` step in the csproj might fail if `bun` is not in the system PATH. Ensure the environment is set up correctly.
- **VS Integration**: The UI is hosted in a WebView2 environment within VS. Communication happens via `vscode.postMessage` and `window.addEventListener('message', ...)`.
