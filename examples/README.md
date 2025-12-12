# .env文件生成工具

这是一个基于AdonisJS Ace框架的.env文件生成工具，具有以下特点：

## 功能特点

1. **基于模板生成**：读取env.template文件，生成对应的.env文件
2. **支持多环境**：可以为开发、测试、生产等不同环境生成不同的.env文件
3. **命令行界面**：通过命令行运行，支持多种参数配置
4. **验证机制**：确保必填变量已填写
5. **安全输入**：敏感变量（如密码）输入时会隐藏
6. **示例文件生成**：可以生成.env.example文件作为参考

## 使用方法

### 基本用法

```bash
node examples/env_generator.ts env:generate dev
```

### 完整参数

```bash
node examples/env_generator.ts env:generate [env] [options]
```

#### 参数说明

- `env`：环境名称（如：dev, test, prod）

#### 选项

- `--template <path>`：模板文件路径，默认：env.template
- `--output <path>`：输出文件路径，默认：.env
- `--example`：是否生成.env.example文件，默认：false
- `--override <vars>`：覆盖特定变量，格式：VAR1=value1,VAR2=value2

### 示例

#### 生成开发环境配置

```bash
node examples/env_generator.ts env:generate dev
```

#### 生成生产环境配置并指定输出文件

```bash
node examples/env_generator.ts env:generate prod --output .env.prod
```

#### 生成.env.example文件

```bash
node examples/env_generator.ts env:generate dev --example
```

#### 覆盖特定变量

```bash
node examples/env_generator.ts env:generate dev --override DB_HOST=192.168.1.100,DB_PORT=3307
```

## 模板文件格式

模板文件使用以下格式：

```
# 环境配置
[env_name]
VAR_NAME=value # 变量描述
VAR_REQUIRED?=value # 可选变量
VAR_SENSITIVE*= # 敏感变量（必填）
```

### 示例模板

```
# 开发环境配置
[dev]
APP_NAME=MyApp # 应用名称
APP_ENV=development # 应用环境
APP_DEBUG=true # 是否开启调试
APP_URL=http://localhost:3333 # 应用URL
APP_KEY= # 应用密钥（必填）*
DB_CONNECTION=sqlite # 数据库连接
DB_HOST=127.0.0.1 # 数据库主机
DB_PORT=3306 # 数据库端口
DB_DATABASE=database.sqlite # 数据库名称
DB_USERNAME=root # 数据库用户名
DB_PASSWORD= # 数据库密码（必填）*

# 生产环境配置
[prod]
APP_NAME=MyApp # 应用名称
APP_ENV=production # 应用环境
APP_DEBUG=false # 是否开启调试
APP_URL=https://example.com # 应用URL
APP_KEY= # 应用密钥（必填）*
DB_CONNECTION=mysql # 数据库连接
DB_HOST=127.0.0.1 # 数据库主机
DB_PORT=3306 # 数据库端口
DB_DATABASE=myapp # 数据库名称
DB_USERNAME=root # 数据库用户名
DB_PASSWORD= # 数据库密码（必填）*
```

### 模板语法

- `[env_name]`：环境块定义
- `VAR_NAME=value`：变量定义，默认必填
- `VAR_NAME?=value`：可选变量
- `VAR_NAME*=value`：敏感变量（输入时会隐藏）
- `# 描述`：变量描述

## 安全注意事项

1. **敏感变量**：在模板中使用`*`标记敏感变量，输入时会自动隐藏
2. **文件权限**：生成的.env文件应该设置合适的权限，避免敏感信息泄露
3. **版本控制**：.env文件不应该提交到版本控制系统

## 测试工具

你可以使用以下命令测试工具：

```bash
# 测试开发环境生成
node examples/env_generator.ts env:generate dev

# 测试生产环境生成
node examples/env_generator.ts env:generate prod --output .env.prod

# 测试生成.env.example
node examples/env_generator.ts env:generate dev --example
```