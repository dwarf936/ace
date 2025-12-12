/*
 * @adonisjs/ace
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Kernel } from '../src/kernel.ts'
import { args } from '../src/decorators/args.ts'
import { flags } from '../src/decorators/flags.ts'
import { BaseCommand } from '../src/commands/base.ts'
import { ListLoader } from '../src/loaders/list_loader.ts'
import { HelpCommand } from '../src/commands/help.ts'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

// 定义环境变量模板结构
interface EnvVariable {
  name: string
  defaultValue?: string
  description?: string
  required: boolean
  sensitive: boolean
}

// 定义环境配置结构
interface EnvConfig {
  env: string
  variables: EnvVariable[]
}

class EnvGenerator extends BaseCommand {
  @args.string({ description: '环境名称（如：dev, test, prod）' })
  env!: string

  @flags.string({ description: '模板文件路径', default: 'env.template' })
  template!: string

  @flags.string({ description: '输出文件路径', default: '.env' })
  output!: string

  @flags.boolean({ description: '生成.env.example文件', default: false })
  example!: boolean

  @flags.string({ description: '覆盖特定变量（格式：VAR1=value1,VAR2=value2）' })
  override!: string

  static commandName: string = 'env:generate'
  static description: string = '基于模板生成.env文件'

  async run() {
    // 检查模板文件是否存在
    if (!existsSync(this.template)) {
      this.logger.error(`模板文件 ${this.template} 不存在`)
      this.exitCode = 1
      return
    }

    // 读取模板文件
    const templateContent = readFileSync(this.template, 'utf-8')
    const envConfig = this.parseTemplate(templateContent)

    // 验证环境是否存在
    const targetEnv = envConfig.find((env) => env.env === this.env)
    if (!targetEnv) {
      this.logger.error(`环境 ${this.env} 不存在于模板中`)
      this.logger.info(`可用环境：${envConfig.map((env) => env.env).join(', ')}`)
      this.exitCode = 1
      return
    }

    // 解析覆盖变量
    const overrides = this.parseOverrides()

    // 收集变量值
    const envVariables: Record<string, string> = {}

    for (const variable of targetEnv.variables) {
      // 检查是否有覆盖值
      if (overrides.hasOwnProperty(variable.name)) {
        envVariables[variable.name] = overrides[variable.name]
        continue
      }

      // 检查是否有默认值
      if (variable.defaultValue !== undefined) {
        envVariables[variable.name] = variable.defaultValue
        continue
      }

      // 必填变量且没有默认值，提示用户输入
      if (variable.required) {
        let value: string
        if (variable.sensitive) {
          value = await this.prompt.secure(
            `请输入 ${variable.name}${variable.description ? ` (${variable.description})` : ''}`
          )
        } else {
          value = await this.prompt.ask(
            `请输入 ${variable.name}${variable.description ? ` (${variable.description})` : ''}`
          )
        }
        if (value === undefined || value === '') {
          this.logger.error(`${variable.name} 为必填变量，不能为空`)
          this.exitCode = 1
          return
        }
        envVariables[variable.name] = value
      }
    }

    // 验证必填变量
    const missingVars = targetEnv.variables.filter((v) => v.required && !envVariables[v.name])
    if (missingVars.length > 0) {
      this.logger.error('缺少以下必填变量：')
      missingVars.forEach((v) => this.logger.error(`- ${v.name}`))
      this.exitCode = 1
      return
    }

    // 生成.env文件并确保文件写入成功
    try {
      this.generateEnvFile(envVariables)
    } catch (error) {
      this.logger.error(
        `生成.env文件失败: ${error instanceof Error ? error.message : String(error)}`
      )
      this.exitCode = 1
      return
    }

    // 生成.env.example文件
    if (this.example) {
      try {
        this.generateEnvExample(envConfig)
      } catch (error) {
        this.logger.error(
        `生成.env.example文件失败: ${error instanceof Error ? error.message : String(error)}`
      )
        this.exitCode = 1
        return
      }
    }

    this.logger.success(`.env 文件已生成：${this.output}`)
    if (this.example) {
      this.logger.success(`.env.example 文件已生成`)
    }
  }

  /**
   * 解析模板文件
   */
  parseTemplate(content: string): EnvConfig[] {
    const lines = content.split('\n')
    const envConfigs: EnvConfig[] = []
    let currentEnv: EnvConfig | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()

      // 跳过空行和注释
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue
      }

      // 检查是否是环境定义
      if (trimmedLine.startsWith('[')) {
        const envName = trimmedLine.replace(/\[|\]/g, '').trim()
        currentEnv = { env: envName, variables: [] }
        envConfigs.push(currentEnv)
        continue
      }

      // 检查是否是变量定义
      if (currentEnv && trimmedLine.includes('=')) {
        const [namePart, valuePart] = trimmedLine.split('=', 2)
        const name = namePart.trim()

        // 解析变量属性
        const required = !name.endsWith('?')
        const sensitive = name.endsWith('*')
        const cleanName = name.replace(/[?*]$/, '')

        // 解析默认值和描述
        const valueMatch =
          valuePart?.match(/^"([^"]*)"\s*(?:#\s*(.*))?$/) ||
          valuePart?.match(/^([^#]*?)\s*(?:#\s*(.*))?$/)
        const defaultValue = valueMatch ? valueMatch[1]?.trim() : undefined
        const description = valueMatch ? valueMatch[2]?.trim() : undefined

        currentEnv.variables.push({
          name: cleanName,
          defaultValue: defaultValue ? defaultValue : undefined,
          description: description ? description : undefined,
          required,
          sensitive,
        })
      }
    }

    return envConfigs
  }

  /**
   * 解析覆盖变量
   */
  parseOverrides(): Record<string, string> {
    const overrides: Record<string, string> = {}

    if (!this.override) {
      return overrides
    }

    const pairs = this.override.split(',')
    for (const pair of pairs) {
      const [name, value] = pair.split('=')
      if (name && value) {
        overrides[name.trim()] = value.trim()
      }
    }

    return overrides
  }

  /**
   * 生成.env文件
   */
  generateEnvFile(variables: Record<string, string>) {
    const content = Object.entries(variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    writeFileSync(this.output, content)
  }

  /**
   * 生成.env.example文件
   */
  generateEnvExample(envConfig: EnvConfig[]) {
    const exampleVariables: Record<string, string> = {}

    // 收集所有变量
    for (const env of envConfig) {
      for (const variable of env.variables) {
        if (!exampleVariables.hasOwnProperty(variable.name)) {
          exampleVariables[variable.name] = variable.defaultValue || 'example_value'
        }
      }
    }

    const content = Object.entries(exampleVariables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    writeFileSync('.env.example', content)
  }
}

// 测试命令
const kernel = Kernel.create()

kernel.addLoader(new ListLoader([HelpCommand, EnvGenerator]))

// 运行命令
kernel.handle(process.argv.slice(2))
