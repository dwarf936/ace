# Environment File Generator

This tool generates environment files (.env) from a template, supporting different environments and secure input for sensitive variables.

## Features

1. **Template-based generation**: Define your environment variables in a template file with descriptions, default values, and sensitivity flags.
2. **Multi-environment support**: Generate different .env files for development, testing, production, etc.
3. **Command-line interface**: Easy to use with options to specify environment and override variables.
4. **Validation**: Ensures required variables are provided.
5. **Secure input**: Hides sensitive variables (like passwords) while typing.
6. **Example generation**: Creates a .env.example file with all variables and example values.

## Usage

### Basic Usage

```bash
# Generate .env file for development environment
 ts-node env_generator.ts
```

### Specify Environment

```bash
# Generate .env file for production environment
 ts-node env_generator.ts -e production
```

### Override Variables

```bash
# Generate .env file with custom values
 ts-node env_generator.ts DB_NAME=mydb APP_PORT=3001
```

### Show Help

```bash
# Show help message
 ts-node env_generator.ts -h
```

## Template Format

The env.template file uses the following format:

```
# Comment line
variable_name default_value description required sensitive
```

- `variable_name`: Name of the environment variable
- `default_value`: Default value (can be empty string "")
- `description`: Human-readable description
- `required`: Whether the variable is required (true/false)
- `sensitive`: Whether the variable is sensitive (true/false)

### Example Template

```
# Database Configuration
DB_HOST localhost Database host true false
DB_PORT 5432 Database port true false
DB_NAME myapp Database name true false
DB_USER admin Database username true false
DB_PASSWORD "" Database password true true

# App Configuration
APP_PORT 3000 Application port true false
APP_ENV development Application environment true false
APP_DEBUG false Enable debug mode true false
APP_SECRET "" Application secret key true true
```

## Output Files

- `.env.<environment>`: Environment file with actual values
- `.env.example`: Example file with all variables and example values

## Security

- Sensitive variables (marked as `true` in the template) are hidden while typing
- The tool does not store or log sensitive information
- Generated .env files should be added to .gitignore

## Requirements

- Node.js 16+
- TypeScript
- ts-node
