# Package Checker CLI

An AI-powered CLI tool for intelligent dependency analysis, code assistance, and automated project management.

## 🚀 Features

- 🤖 **AI-Powered Help** - Ask questions in natural language and get intelligent solutions
- 🔍 **Smart Dependency Analysis** - Detect missing, unused, and uninstalled dependencies
- 🛠️ **Automated File Operations** - AI can create, modify, and delete files with your permission
- 📊 **Multi-Language Support** - Works with npm, yarn, composer, pip, and more
- ⚡ **One-Command Fixes** - Install, uninstall, and fix dependencies automatically
- 📍 **File Location Tracking** - See exactly where unused dependencies are imported
- 🔒 **Security Audits** - AI-powered security vulnerability detection
- 📈 **Performance Tips** - Get suggestions to optimize your project

## 📦 Installation

### Global Installation
```bash
npm install -g package-checker-cli
```

### Local Usage
```bash
npx package-checker-cli
```

## 🎯 Quick Start

1. Navigate to your project directory
2. Run dependency analysis: `checker check`
3. Get AI help: `checker help "describe your problem"`
4. Fix issues automatically: `checker fix`

## 🤖 AI-Powered Help

The standout feature - ask for help in natural language:

```bash
# Get help with any coding problem
checker help "my file is not running"
checker help "npm install fails with permission errors"
checker help "how do I optimize my webpack config"

# Auto-apply suggested fixes (skips confirmation)
checker help "fix my package.json dependencies" --auto
```

The AI can:
- ✅ Analyze your problem and suggest solutions
- ✅ Create new files with proper code
- ✅ Modify existing files to fix issues
- ✅ Delete problematic files
- ✅ Provide code examples and resources
- ✅ Always asks for your permission before making changes

## 📋 Commands

### Core Commands

#### `checker help <query>`
Ask AI for help with any coding problem or project issue.
```bash
checker help "my tests are failing"
checker help "how to setup eslint" --auto
```
**Options:**
- `--auto` - Automatically apply suggested file operations without confirmation

#### `checker check [options]`
Analyze project dependencies for issues.
```bash
checker check                    # Basic analysis
checker check --ai              # AI-powered analysis with insights
checker check --json            # Output in JSON format
checker check --path ./src      # Scan specific path
```

#### `checker fix [options]`
Automatically fix dependency issues.
```bash
checker fix                      # Fix all issues
checker fix --dry-run           # Preview what would be fixed
checker fix --path ./project    # Fix specific path
```

#### `checker doctor [options]`
Comprehensive project health check.
```bash
checker doctor                   # Basic health check
checker doctor --ai             # AI-powered health analysis
checker doctor --path ./src     # Check specific path
```

### Package Management

#### `checker install <module>`
Install a specific missing dependency.
```bash
checker install lodash
checker install express --path ./backend
```

#### `checker uninstall <module>`
Remove unused dependencies.
```bash
checker uninstall unused-package
checker uninstall old-lib --path ./frontend
```

#### `checker list [options]`
List all dependencies by status.
```bash
checker list                     # Show all dependencies
checker list --json            # JSON output
checker list --path ./src      # List for specific path
```

### Project Maintenance

#### `checker scan <path>`
Scan specific directory or file.
```bash
checker scan ./src              # Scan source directory
checker scan ./package.json --ai # AI analysis of package.json
checker scan . --json          # JSON output for entire project
```

#### `checker sync [options]`
Reinstall all dependencies (like `npm ci`).
```bash
checker sync                     # Sync current directory
checker sync --path ./project   # Sync specific project
```

#### `checker clean [options]`
Remove unused dependencies from package.json.
```bash
checker clean                    # Remove unused deps
checker clean --dry-run        # Preview what would be removed
checker clean --path ./app     # Clean specific path
```

### Configuration

#### `checker config [options]`
Manage CLI configuration.
```bash
checker config --set ignored="test,build"
checker config --get ignored
checker config --list
```

#### `checker update`
Update the CLI tool to latest version.
```bash
checker update
```

## 🌍 Supported Languages & Package Managers

- **JavaScript/TypeScript**: npm, yarn, pnpm
- **PHP**: Composer
- **Python**: pip, pipenv, poetry
- **Ruby**: Bundler
- **Go**: Go modules
- **Rust**: Cargo
- **Java**: Maven, Gradle
- **.NET**: NuGet
- **Dart/Flutter**: pub

## 🧠 AI Features

Powered by Google's Gemini AI, providing:

- **Natural Language Processing**: Understand your problems in plain English
- **Intelligent Code Analysis**: Analyze your codebase for issues
- **Automated Solutions**: Generate and apply fixes automatically
- **Package Insights**: Smart recommendations for updates and alternatives
- **Security Analysis**: Vulnerability detection and remediation
- **Performance Optimization**: Code and dependency optimization tips

## 🔧 Advanced Usage

### Batch Operations
```bash
# Check multiple projects
for dir in */; do checker check --path "$dir"; done

# Fix all projects in workspace
find . -name "package.json" -execdir checker fix \;
```

### CI/CD Integration
```bash
# In your CI pipeline
checker check --json > dependency-report.json
checker doctor --ai || exit 1
```

### Configuration File
Create `.checkerrc` in your project:
```json
{
  "ignored": ["test", "build", "docs"],
  "autoFix": false,
  "aiEnabled": true
}
```

## 📖 Examples

### Common Workflows

**New Project Setup:**
```bash
checker help "setup a new React project with TypeScript"
```

**Dependency Issues:**
```bash
checker check --ai
checker fix
```

**Performance Optimization:**
```bash
checker help "my app is slow, how to optimize"
```

**Security Audit:**
```bash
checker doctor --ai
```

## 🛠️ Requirements

- Node.js 16.0.0 or higher
- npm, yarn, or pnpm (for Node.js projects)
- Internet connection for AI features

## 🐛 Troubleshooting

**Common Issues:**

1. **Permission Errors**: Run with `sudo` on macOS/Linux if needed
2. **API Failures**: Check internet connection for AI features
3. **Large Projects**: May take longer to analyze (>1000 files)

**Get Help:**
```bash
checker help "I'm having trouble with [describe your issue]"
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

---

**Made with ❤️ by King Jethro**

*Transform your development workflow with AI-powered assistance!*
