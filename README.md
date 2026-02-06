# rail-data-validator

A cross-platform data validation desktop application built with Tauri 2.x, featuring a validation engine and intuitive user interface.

## Tech Stack

- **Frontend Framework**: Umi (`@umijs/max`) + Ant Design Pro
- **Desktop Runtime**: Tauri 2.x
- **Backend Language**: Rust
- **Package Manager**: pnpm
- **Validation Engine**: Custom rule-based system (supports column-level and row-level validation)
- **Database**: SQLite (via Tauri SQL plugin)

## Key Features

- 🔍 **Flexible Validation Rules**: Range checks, required fields, uniqueness, sum validation, triangle depression detection, and more
- 📊 **Batch Data Processing**: Efficiently process large datasets with detailed error statistics
- 💾 **Local Persistence**: SQLite storage for data and validation records
- 🖥️ **Cross-platform**: Supports Windows, macOS, Linux, and Android
- 🎨 **Modern UI**: Professional interface based on Ant Design

## Prerequisites

### System Requirements

- Node.js >= 16.x
- Rust >= 1.70
- pnpm >= 8.x

### Install Dependencies

```bash
pnpm install
```

### Tauri Development Environment

Please refer to the [Tauri Prerequisites Guide](https://tauri.app/v2/guides/getting-started/prerequisites/) to configure the development environment for your platform.

## Development Commands

### Frontend Development (Web Only)

```bash
# Start development server
pnpm start

# Start with mock disabled
pnpm start:dev
```

Default port: `http://localhost:8000`

### Tauri Desktop Development

```bash
# Start Tauri development mode (frontend + desktop window)
pnpm tauri dev
```

### Build

```bash
# Build frontend
pnpm build

# Build desktop application
pnpm tauri build
```

## Code Quality

### Linting

```bash
# Run Biome and TypeScript checks
pnpm lint

# Auto-fix code style issues
pnpm biome:lint
```

### Testing

```bash
# Run tests
pnpm test

# View test coverage
pnpm test:coverage
```

## Project Structure

```
├── config/              # Configuration files (routes, proxy, settings)
├── src/                 # Frontend source code
│   ├── components/      # Shared components
│   │   └── Validation/  # Data validation core components
│   ├── pages/           # Page components
│   ├── locales/         # Internationalization files
│   ├── services/        # API services
│   └── models/          # Data models
├── src-tauri/           # Tauri Rust backend
│   ├── src/
│   │   ├── lib.rs       # Main application builder
│   │   └── main.rs      # Entry point
│   └── tauri.conf.json  # Tauri configuration
├── mock/                # Mock data
└── public/              # Static assets
```

## Validation Rule System

The project provides a flexible validation rule system located in `src/components/Validation/`:

- **Column-level Rules**: Validation for individual columns (range, required, uniqueness)
- **Row-level Rules**: Cross-column validation (sum checks, triangle depression detection)
- **Extensibility**: Implement the `ValidationRule` interface to add custom rules

Example:

```typescript
// Add column-level rule
validator.addColumnRule('temperature', new RangeRule(0, 100));

// Add row-level rule
validator.addRowRule(new SumValidationRule(['col1', 'col2'], 'total'));
```

## OpenAPI Integration

```bash
# Regenerate service code and mock data from OpenAPI schema
pnpm openapi
```

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT License](LICENSE)

## Resources

- [Ant Design Pro Documentation](https://pro.ant.design)
- [Umi Documentation](https://umijs.org)
- [Tauri Documentation](https://tauri.app)
- [Project Architecture](ARCHITECTURE.md)
