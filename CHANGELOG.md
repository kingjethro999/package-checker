# Change Log

All notable changes to the "package-checker" project will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.4.0] - 2024-01-XX - Major CLI Transformation

### 🚀 Breaking Changes
- **Complete transformation from VS Code extension to standalone CLI tool**
- Removed all VS Code extension dependencies and functionality
- Changed from OpenRouter to Google Gemini AI API
- Updated package.json structure for CLI-focused distribution

### ✨ Added
- **AI-Powered Natural Language Help** - `checker help "describe your problem"`
  - Ask questions in plain English and get intelligent solutions
  - AI can create, modify, and delete files with user confirmation
  - `--auto` flag to skip confirmations for automated workflows
  - Provides code examples and helpful resources

- **Enhanced CLI Commands**
  - `checker help <query>` - Natural language AI assistance
  - AI integration for existing commands with `--ai` flag
  - Improved help text and command descriptions
  - Better error handling and user feedback

- **Automated File Operations**
  - AI can create new files with suggested code
  - Modify existing files to fix detected issues
  - Delete problematic files when necessary
  - All operations require user confirmation (unless `--auto` is used)

- **Google Gemini Integration**
  - Switched from OpenRouter to Google Gemini API
  - Embedded API key for immediate functionality
  - Enhanced natural language processing capabilities
  - Better code analysis and suggestions

- **Improved Build System**
  - Updated esbuild configuration for CLI-only builds
  - Added proper shebang handling for cross-platform execution
  - Optimized bundle size by removing extension dependencies
  - Fixed executable permissions for Unix systems

### 🗑️ Removed
- All VS Code extension files and dependencies
- Extension-specific UI components (sidebar, webview, etc.)
- VS Code API integrations
- Extension marketplace metadata
- OpenRouter AI service integration

### 🔧 Changed
- **Project Structure**: Converted from extension to CLI-focused architecture
- **AI Service**: Migrated from OpenRouter to Google Gemini API
- **Package Configuration**: Updated for npm CLI distribution
- **Build Process**: Simplified for CLI-only output
- **Command Interface**: Enhanced existing commands with AI capabilities

### 🐛 Fixed
- Duplicate shebang issue in built CLI file
- Cross-platform executable permissions
- API key management and configuration
- Error handling for AI service failures

## [0.3.8] - Previous Extension Version

### Added
- VS Code extension functionality
- Sidebar dependency analysis
- Basic OpenRouter AI integration
- Multi-language package manager support

### Features
- Interactive sidebar with dependency tree
- Command palette integration
- File location tracking for unused dependencies
- Basic security audit capabilities

## [0.3.0] - Extension Release

### Added
- Initial VS Code extension implementation
- Basic dependency analysis for npm projects
- Command palette commands
- Simple dependency management

### Features
- Dependency scanning and analysis
- Missing/unused dependency detection
- Basic install/uninstall functionality

## [0.2.0] - Early Development

### Added
- Core dependency analysis logic
- Multi-package manager support
- File parsing capabilities

## [0.1.0] - Initial Release

### Added
- Basic project structure
- Core dependency checking functionality
- npm package.json parsing

---

**Migration Guide (0.3.8 → 0.4.0)**

If you were using the VS Code extension:

1. **Uninstall the VS Code extension** (if previously installed)
2. **Install the CLI globally**: `npm install -g package-checker-cli`
3. **Use new command syntax**: `checker help "your question"`
4. **Enjoy enhanced AI capabilities** with natural language processing

The CLI tool provides all previous functionality plus powerful AI assistance that can understand and solve problems described in natural language.