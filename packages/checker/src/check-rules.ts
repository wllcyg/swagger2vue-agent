import { NodeTypes } from '@vue/compiler-dom'
import type { ElementNode, TemplateChildNode } from '@vue/compiler-dom'
import { parse } from '@vue/compiler-sfc'
import type { CheckResult, ComponentRules, Violation } from './types'

function camelize(name: string): string {
  return name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
}

/** `biz-table` 与 `BizTable` 规范化为同一个名字。 */
export function normalizeTag(tag: string): string {
  const camel = camelize(tag)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

interface ElementProps {
  props: Set<string>
  events: Set<string>
  /** 存在 `v-bind="obj"` 或动态参数，无法静态判断具体传了哪些 props */
  hasOpaqueBind: boolean
  /** 存在 `v-on="obj"` 或动态事件名，无法静态判断具体监听了哪些事件 */
  hasOpaqueOn: boolean
}

function collectProps(el: ElementNode): ElementProps {
  const info: ElementProps = {
    props: new Set(),
    events: new Set(),
    hasOpaqueBind: false,
    hasOpaqueOn: false,
  }

  for (const prop of el.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      info.props.add(camelize(prop.name))
      continue
    }

    const arg = prop.arg
    const staticArg = arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && arg.isStatic
      ? camelize(arg.content)
      : undefined

    if (prop.name === 'bind') {
      if (staticArg)
        info.props.add(staticArg)
      else
        info.hasOpaqueBind = true
    }
    else if (prop.name === 'model') {
      if (!arg)
        info.props.add('modelValue')
      else if (staticArg)
        info.props.add(staticArg)
      else
        info.hasOpaqueBind = true
    }
    else if (prop.name === 'on') {
      if (staticArg)
        info.events.add(staticArg)
      else
        info.hasOpaqueOn = true
    }
  }

  return info
}

function walk(
  nodes: TemplateChildNode[],
  ancestors: string[],
  visit: (el: ElementNode, ancestors: string[]) => void,
): void {
  for (const node of nodes) {
    if (node.type !== NodeTypes.ELEMENT)
      continue
    visit(node, ancestors)
    walk(node.children, [...ancestors, normalizeTag(node.tag)], visit)
  }
}

function emptyResult(parseErrors: string[] = []): CheckResult {
  return {
    violations: [],
    componentInstances: 0,
    violatingInstances: 0,
    usedComponents: {},
    parseErrors,
  }
}

/**
 * 按组件规则检查一份 `.vue` 源码的模板。
 * 只检查 `check: "ast"` 的规则，`hint` 规则仅用于提示模型，不参与检查。
 */
export function checkComponentRules(source: string, componentRules: ComponentRules[]): CheckResult {
  const { descriptor, errors } = parse(source)
  if (errors.length > 0)
    return emptyResult(errors.map(error => error.message))

  const root = descriptor.template?.ast
  if (!root)
    return emptyResult()

  const bizComponents = new Set(componentRules.map(cr => normalizeTag(cr.component)))
  const forbiddenTags = new Set<string>()
  for (const cr of componentRules) {
    for (const rule of cr.rules) {
      if (rule.type === 'forbidden-tag')
        rule.tags.forEach(tag => forbiddenTags.add(normalizeTag(tag)))
    }
  }

  const result = emptyResult()
  const violatingNodes = new Set<ElementNode>()

  const report = (el: ElementNode, tag: string, cr: ComponentRules, violation: Pick<Violation, 'ruleId' | 'level' | 'type' | 'message'>) => {
    result.violations.push({
      ...violation,
      component: cr.component,
      tag,
      line: el.loc.start.line,
      column: el.loc.start.column,
    })
    if (violation.level === 'error')
      violatingNodes.add(el)
  }

  walk(root.children, [], (el, ancestors) => {
    const tag = normalizeTag(el.tag)

    if (bizComponents.has(tag) || forbiddenTags.has(tag))
      result.componentInstances++
    if (bizComponents.has(tag))
      result.usedComponents[tag] = (result.usedComponents[tag] ?? 0) + 1

    const elementProps = collectProps(el)

    for (const cr of componentRules) {
      for (const rule of cr.rules) {
        switch (rule.type) {
          case 'required-prop': {
            if (tag !== normalizeTag(cr.component) || elementProps.hasOpaqueBind)
              break
            const missing = rule.props.filter(name => !elementProps.props.has(camelize(name)))
            if (missing.length > 0)
              report(el, tag, cr, { ruleId: rule.id, level: rule.level, type: rule.type, message: `<${tag}> 缺少必传属性：${missing.join('、')}` })
            break
          }
          case 'required-event': {
            if (tag !== normalizeTag(cr.component) || elementProps.hasOpaqueOn)
              break
            const missing = rule.events.filter(name => !elementProps.events.has(camelize(name)))
            if (missing.length > 0)
              report(el, tag, cr, { ruleId: rule.id, level: rule.level, type: rule.type, message: `<${tag}> 未监听事件：${missing.join('、')}` })
            break
          }
          case 'forbidden-tag': {
            if (rule.tags.some(name => normalizeTag(name) === tag))
              report(el, tag, cr, { ruleId: rule.id, level: rule.level, type: rule.type, message: `禁止使用 <${tag}>：${rule.reason}` })
            break
          }
          case 'forbidden-nesting': {
            if (tag === normalizeTag(rule.child) && ancestors.includes(normalizeTag(rule.parent)))
              report(el, tag, cr, { ruleId: rule.id, level: rule.level, type: rule.type, message: `<${tag}> 不能嵌套在 <${normalizeTag(rule.parent)}> 内：${rule.reason}` })
            break
          }
          case 'hint':
            break
        }
      }
    }
  })

  result.violatingInstances = violatingNodes.size
  return result
}
