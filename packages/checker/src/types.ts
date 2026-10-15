import { z } from 'zod'

const baseRule = {
  id: z.string().min(1),
  level: z.enum(['error', 'warn']),
  reason: z.string().min(1),
}

const requiredPropRule = z.object({
  ...baseRule,
  check: z.literal('ast'),
  type: z.literal('required-prop'),
  props: z.array(z.string().min(1)).min(1),
})

const requiredEventRule = z.object({
  ...baseRule,
  check: z.literal('ast'),
  type: z.literal('required-event'),
  events: z.array(z.string().min(1)).min(1),
})

const forbiddenTagRule = z.object({
  ...baseRule,
  check: z.literal('ast'),
  type: z.literal('forbidden-tag'),
  tags: z.array(z.string().min(1)).min(1),
})

const forbiddenNestingRule = z.object({
  ...baseRule,
  check: z.literal('ast'),
  type: z.literal('forbidden-nesting'),
  parent: z.string().min(1),
  child: z.string().min(1),
})

const hintRule = z.object({
  ...baseRule,
  check: z.literal('hint'),
  type: z.literal('hint'),
})

export const ruleSchema = z.discriminatedUnion('type', [
  requiredPropRule,
  requiredEventRule,
  forbiddenTagRule,
  forbiddenNestingRule,
  hintRule,
])

export const componentRulesSchema = z.object({
  component: z.string().min(1),
  summary: z.string().min(1),
  rules: z.array(ruleSchema),
})

export type Rule = z.infer<typeof ruleSchema>
export type ComponentRules = z.infer<typeof componentRulesSchema>

export interface Violation {
  ruleId: string
  /** 规则所属的组件 */
  component: string
  level: 'error' | 'warn'
  type: Exclude<Rule['type'], 'hint'>
  /** 触发违规的标签名（规范化为 PascalCase） */
  tag: string
  message: string
  line: number
  column: number
}

export interface CheckResult {
  violations: Violation[]
  /** 页面中被规则覆盖的组件实例总数：业务组件实例加被禁用的标签实例 */
  componentInstances: number
  /** 至少触发一条 error 级违规的实例数 */
  violatingInstances: number
  /** 各业务组件的使用次数，键为规范化后的组件名 */
  usedComponents: Record<string, number>
  /** SFC 解析失败时的错误信息，此时不做规则检查 */
  parseErrors: string[]
}
