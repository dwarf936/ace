import fs from 'node:fs'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface EnvVariable {
  name: string
  defaultValue: string
  description: string
  required: boolean
  sensitive: boolean
}

class EnvGenerator {
  private templatePath: string
  private variables: EnvVariable[] = []

  constructor(templatePath: string) {
    this.templatePath = templatePath
  }

  // 读取模板文件
  async readTemplate(): Promise<void> {
    const content = fs.readFileSync(this.templatePath, 'utf8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      // 跳过注释和空行
      if (trimmedLine.startsWith('#') || trimmedLine === '') {
        continue
      }

      // 解析每行内容
      const parts = this.parseLine(trimmedLine)
      if (parts) {
        this.variables.push(parts)
      }
    }
  }

  // 解析单行模板
  private parseLine(line: string): EnvVariable | null {
    // 使用正则表达式解析，处理带引号的默认值
    const regex = /^([^\s]+)\s+("[^"]*"|'[^']*'|[^\s]+)\s+(.+?)\s+(true|false)\s+(true|false)$/
    const match = line.match(regex)

    if (match) {
      return {
        name: match[1],
        defaultValue: match[2].replace(/^["']|["']$/g, ''), // 去除引号
        description: match[3],
        required: match[4] === 'true',
        sensitive: match[5] === 'true'
      }
    }
    return null
  }

  // 生成.env文件
  async generateEnvFile(
    env: string,
    outputPath: string,
    overrides: Record<string, string> = {}
  ): Promise<void> {
    await this.readTemplate()

    let content = `# Environment file generated for ${env} environment\n`
    content += `# Generated on ${new Date().toISOString()}\n\n`

    for (const variable of this.variables) {
      // 检查是否有覆盖值
      let value = overrides[variable.name] || variable.defaultValue

      // 如果是必填且值为空，提示用户输入
      if (variable.required && value === '') {
        value = await this.promptForVariable(variable)
      }

      // 添加到文件内容
      content += `${variable.name}=${this.escapeValue(value)}\n`
    }

    // 写入文件
    fs.writeFileSync(outputPath, content)
    console.log(`✅ .env file generated at ${outputPath}`)
  }

  // 生成.env.example文件
  async generateExampleFile(outputPath: string): Promise<void> {
    await this.readTemplate()

    let content = `# Environment file example\n`
    content += `# Copy this file to .env and fill in your values\n\n`

    for (const variable of this.variables) {
      let exampleValue = variable.defaultValue
      if (variable.sensitive && exampleValue === '') {
        exampleValue = '***'
      }
      content += `${variable.name}=${this.escapeValue(exampleValue)} # ${variable.description}\n`
    }

    // 写入文件
    fs.writeFileSync(outputPath, content)
    console.log(`✅ .env.example file generated at ${outputPath}`)
  }

  // 提示用户输入变量值
  private async promptForVariable(variable: EnvVariable): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const promptMessage = `Please enter ${variable.name} (${variable.description}): `
      if (variable.sensitive) {
        // 隐藏敏感输入
        process.stdout.write(promptMessage)
        let input = ''
        process.stdin.setRawMode(true)
        process.stdin.on('data', (data) => {
          const char = data.toString()
          if (char === '\n' || char === '\r') {
            process.stdin.setRawMode(false)
            process.stdout.write('\n')
            rl.close()
            resolve(input)
          } else if (char === '\x7f') { // Backspace
            if (input.length > 0) {
              input = input.slice(0, -1)
              process.stdout.write('\b \b')
            }
          } else if (char.charCodeAt(0) === 3) { // Ctrl+C
            process.stdin.setRawMode(false)
            process.stdout.write('\n')
            rl.close()
            process.exit(1)
          } else {
            input += char
            process.stdout.write('*')
          }
        })
      } else {
        rl.question(promptMessage, (answer) => {
          rl.close()
          resolve(answer)
        })
      }
    })
  }

  // 转义值，处理特殊字符
  private escapeValue(value: string): string {
    if (value.includes(' ') || value.includes('=') || value.includes('"')) {
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return value
  }
}

// 命令行界面
async function main() {
  const args = process.argv.slice(2)
  let env = 'development'
  const overrides: Record<string, string> = {}
  let showHelp = false

  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      showHelp = true
      break
    } else if (arg === '--env' || arg === '-e') {
      env = args[i + 1] || env
      i++
    } else if (arg.includes('=')) {
      const [key, value] = arg.split('=')
      overrides[key] = value
    }
  }

  if (showHelp) {
    console.log('Environment File Generator')
    console.log('Usage: ts-node env_generator.ts [options]')
    console.log('')
    console.log('Options:')
    console.log('  --env, -e <env>       Specify the environment (default: development)')
    console.log('  --help, -h            Show this help message')
    console.log('  [key=value]...        Override specific environment variables')
    console.log('')
    console.log('Examples:')
    console.log('  ts-node env_generator.ts -e production')
    console.log('  ts-node env_generator.ts DB_NAME=mydb APP_PORT=3001')
    return
  }

  const generator = new EnvGenerator('./env.template')

  // 生成.env文件
  await generator.generateEnvFile(env, `.env.${env}`, overrides)

  // 生成.env.example文件
  await generator.generateExampleFile('.env.example')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error generating env files:', err)
    process.exit(1)
  })
}

export default EnvGenerator