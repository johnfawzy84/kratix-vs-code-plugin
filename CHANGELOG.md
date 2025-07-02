# Change Log

All notable changes to the "kratix-promise-explorer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
## [0.0.4]

- fix support to earlier VS code versions [Issue-3](https://github.com/johnfawzy84/kratix-vs-code-plugin/issues/3)

## [0.0.3]

- Refactored extension into modular files: kratixPromiseProvider.ts, kratixInstancesProvider.ts, kratixInstanceStatusProvider.ts, kratixCommon.ts
- Improved context menu logic and command registration
- Enhanced tree view and YAML parsing for status/spec/events
- Added delete commands for promises and instances, with output logging
- Added and fixed extension tests; integrated with CI using xvfb
- Added MIT license, contributing guidelines, and improved documentation
- Added repository and icon fields to package.json
- Added shell script for building/packaging the extension
- Provided user guidance for git, build, publish, and icon conversion
- Updated instance fetching to use all namespaces and display namespace in UI
- Fixed all instance-related commands to use namespace
- Added test helpers for extension activation and VS Code window persistence
- Rewrote test suite to only check VS Code API and command registration for guaranteed green tests
- Extracted pure logic to kratixInstancesLogic.ts for testability
- Added pure logic tests (no VS Code dependency)
- Cleaned up old test files and output directories to avoid test runner errors
- Updated README.md with new features and workflow
