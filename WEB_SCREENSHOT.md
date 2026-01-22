# UI Interaction Directory Naming Convention

This document outlines a universal standard for naming directories and organizing UI assets (screenshots, test artifacts, or component states) based on user interactions. This convention ensures clarity, searchability, and consistency across development teams.

## Naming Format

Directories should follow this hyphen-separated structure:

```
<action>-<position>-<text>-<element>
```

### Components

1.  **Action**
    *   Describes the user interaction or state trigger.
    *   *Examples:* `click`, `hover`, `drag`, `focus`, `scroll`, `type`.

2.  **Position**
    *   Describes the general location of the element on the viewport or container.
    *   *Examples:* `topright`, `bottomleft`, `center`, `sidebar`, `header`, `footer`.

3.  **Text**
    *   The visible text label, placeholder, or unique identifier of the element.
    *   Keep it concise and lowercase. Replace spaces with hyphens if necessary, or keep it as a single continuous string if short.
    *   *Examples:* `create`, `submit`, `search`, `upload-video`.

4.  **Element**
    *   The type of UI component or HTML element.
    *   *Examples:* `button`, `input`, `link`, `modal`, `dropdown`, `card`.

## Examples

| Directory Name | Description |
| :--- | :--- |
| `click-topright-create-button` | Clicking the "Create" button located in the top-right corner. |
| `hover-sidebar-dashboard-link` | Hovering over the "Dashboard" link in the sidebar navigation. |
| `type-center-search-input` | Typing into the search bar located in the center of the page. |
| `drag-content-video-row` | Dragging a video row item within the content list. |
| `focus-modal-title-field` | Focusing on the "Title" input field inside a modal. |

## Directory Hierarchy

The directory structure should reflect the **User Journey** or **Interaction Flow**. This nested approach allows developers to trace the sequence of actions that lead to a specific UI state.

### Structure Levels

1.  **Root Level: Page or Feature Context**
    *   The top-level folder should identify the page, module, or feature being tested/documented.
    *   *Examples:* `dashboard`, `settings`, `video-editor`.

2.  **Nested Levels: Interaction Sequence**
    *   Subsequent folders represent the step-by-step user interactions, named using the `<action>-<position>-<text>-<element>` convention.
    *   Nesting indicates dependency: Folder B inside Folder A means Action B happens *after* Action A.

3.  **Assets at Any Level**
    *   Screenshots, logs, or metadata can reside in *any* folder to document the state immediately following that interaction.
    *   You don't need to reach a "leaf" folder to save an asset; intermediate states are valuable to capture.

### Example Structure

```text
imgs/
├── dashboard/                                      # 1. Page Context
│   ├── click-topright-create-button/               # 2. First Interaction
│   │   ├── create-menu-open.png                    # <--- Asset showing state after click
│   │   ├── click-dropdown-upload-video/            # 3. Second Interaction
│   │   │   ├── click-modal-select-files-button/    # 4. Third Interaction
│   │   │   │   └── upload-dialog-open.png          # 5. Asset
│   │   │   └── hover-modal-close-icon/
│   │   │       └── close-tooltip-visible.png
│   └── click-sidebar-analytics-link/
│       └── analytics-view-loaded.png
└── settings/
    └── type-center-channel-name-input/
        └── validation-error-state.png
```

## Best Practices

*   **Lowercase**: Always use lowercase letters to avoid case-sensitivity issues across different operating systems.
*   **Hyphens**: Use hyphens (`-`) as separators. Do not use spaces or underscores.
*   **Specificity**: If the `text` is too long, use a recognizable keyword (e.g., use `terms` instead of `terms-and-conditions`).
*   **Universality**: This convention is framework-agnostic and can be applied to automated testing (Selenium/Cypress screenshots), design systems, or documentation structures.
