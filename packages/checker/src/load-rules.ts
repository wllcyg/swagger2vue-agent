import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { componentRulesSchema } from './types'
import type { ComponentRules } from './types'

/** 读取目录下所有 `*.json` 规则文件，并按 schema 校验，格式错误时抛出带文件名的异常。 */
export function loadRulesFromDir(dir: string): ComponentRules[] {
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown
      const parsed = componentRulesSchema.safeParse(raw)
      if (!parsed.success)
        throw new Error(`规则文件 ${name} 格式不合法：${parsed.error.message}`)
      return parsed.data
    })
}
