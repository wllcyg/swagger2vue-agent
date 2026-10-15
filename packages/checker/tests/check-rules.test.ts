import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkComponentRules, loadRulesFromDir } from '../src'

const rules = loadRulesFromDir(resolve(import.meta.dirname, '../../ui-lib/rules'))

function page(template: string): string {
  return `<script setup lang="ts">\nconst x = 1\n</script>\n\n<template>\n${template}\n</template>\n`
}

function ruleIds(source: string): string[] {
  return checkComponentRules(source, rules).violations.map(v => v.ruleId)
}

const goodPage = page(`
  <div>
    <BizSearchBar :fields="searchFields" :model="query" @search="load" @reset="reset" />
    <BizTable :columns="columns" row-key="id" :data="rows">
      <template #actions="{ row }">
        <el-button @click="edit(row)">编辑</el-button>
      </template>
    </BizTable>
    <el-dialog v-model="visible">
      <BizForm :fields="formFields" :model="form" @submit="save" />
    </el-dialog>
  </div>
`)

describe('loadRulesFromDir', () => {
  it('加载并校验 ui-lib 下全部规则文件', () => {
    expect(rules.map(r => r.component)).toEqual(['BizForm', 'BizSearchBar', 'BizTable'])
  })

  it('规则文件格式不合法时抛出带文件名的错误', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'rules-'))
    writeFileSync(join(dir, 'Broken.json'), JSON.stringify({ component: 'X', summary: 's', rules: [{ id: 'a', type: 'unknown' }] }))
    expect(() => loadRulesFromDir(dir)).toThrow('Broken.json')
  })
})

describe('checkComponentRules', () => {
  it('规范的列表页没有违规', () => {
    const result = checkComponentRules(goodPage, rules)
    expect(result.violations).toEqual([])
    expect(result.violatingInstances).toBe(0)
    expect(result.usedComponents).toEqual({ BizSearchBar: 1, BizTable: 1, BizForm: 1 })
  })

  it('BizTable 缺少 rowKey', () => {
    const source = page('<BizTable :columns="columns" :data="rows" />')
    expect(ruleIds(source)).toEqual(['BizTable/required-props'])
    const [violation] = checkComponentRules(source, rules).violations
    expect(violation.message).toContain('rowKey')
    expect(violation.line).toBeGreaterThan(0)
  })

  it('一次列出缺失的全部必传属性', () => {
    const [violation] = checkComponentRules(page('<BizTable />'), rules).violations
    expect(violation.message).toContain('rowKey')
    expect(violation.message).toContain('columns')
  })

  it('使用原生 el-table 替代 BizTable', () => {
    const source = page('<el-table :data="rows"><el-table-column prop="id" /></el-table>')
    expect(ruleIds(source)).toEqual(['BizTable/no-native-el-table'])
  })

  it('PascalCase 的 ElTable 同样被识别', () => {
    expect(ruleIds(page('<ElTable :data="rows" />'))).toEqual(['BizTable/no-native-el-table'])
  })

  it('BizSearchBar 未监听 search 事件', () => {
    const source = page('<BizSearchBar :fields="f" :model="q" />')
    expect(ruleIds(source)).toEqual(['BizSearchBar/required-search-handler'])
  })

  it('BizForm 未监听 submit 事件', () => {
    const source = page('<BizForm :fields="f" :model="m" @cancel="close" />')
    expect(ruleIds(source)).toEqual(['BizForm/required-submit-handler'])
  })

  it('BizForm 嵌套 BizForm', () => {
    const source = page(`
      <BizForm :fields="f" :model="m" @submit="save">
        <div><BizForm :fields="f" :model="m" @submit="save" /></div>
      </BizForm>
    `)
    expect(ruleIds(source)).toEqual(['BizForm/no-nested-form'])
  })

  it('页面手写 el-form 替代 BizSearchBar', () => {
    expect(ruleIds(page('<el-form inline />'))).toEqual(['BizSearchBar/no-native-inline-form'])
  })

  it('kebab-case 标签与属性等价于 PascalCase 与 camelCase', () => {
    const source = page('<biz-table :columns="columns" :row-key="key" />')
    expect(ruleIds(source)).toEqual([])
  })

  it('支持 v-bind:prop 与 v-on:event 写法', () => {
    const source = page('<BizSearchBar v-bind:fields="f" v-bind:model="q" v-on:search="load" />')
    expect(ruleIds(source)).toEqual([])
  })

  it('v-bind 对象展开时无法判断，不误报缺少属性', () => {
    expect(ruleIds(page('<BizTable v-bind="tableProps" />'))).toEqual([])
  })

  it('v-on 对象展开时无法判断，不误报缺少事件', () => {
    const source = page('<BizSearchBar :fields="f" :model="q" v-on="handlers" />')
    expect(ruleIds(source)).toEqual([])
  })

  it('统计组件实例数与违规实例数', () => {
    const source = page(`
      <BizSearchBar :fields="f" :model="q" @search="load" />
      <BizTable :columns="columns" />
      <el-table :data="rows" />
    `)
    const result = checkComponentRules(source, rules)
    expect(result.componentInstances).toBe(3)
    expect(result.violatingInstances).toBe(2)
  })

  it('同一实例触发多条违规只算一个违规实例', () => {
    const result = checkComponentRules(page('<BizTable />'), rules)
    expect(result.violations).toHaveLength(1)
    expect(result.violatingInstances).toBe(1)
  })

  it('warn 级违规不计入违规实例', () => {
    const warnRules = [{
      component: 'BizTable',
      summary: 'test',
      rules: [{
        id: 'BizTable/warn-only',
        level: 'warn' as const,
        check: 'ast' as const,
        type: 'required-prop' as const,
        props: ['loading'],
        reason: 'test',
      }],
    }]
    const result = checkComponentRules(page('<BizTable />'), warnRules)
    expect(result.violations).toHaveLength(1)
    expect(result.violatingInstances).toBe(0)
  })

  it('没有 template 时返回空结果', () => {
    const result = checkComponentRules('<script setup lang="ts">const x = 1</script>', rules)
    expect(result.violations).toEqual([])
    expect(result.componentInstances).toBe(0)
  })

  it('SFC 解析失败时返回解析错误，不做规则检查', () => {
    const result = checkComponentRules('<template><div></template>', rules)
    expect(result.parseErrors.length).toBeGreaterThan(0)
    expect(result.violations).toEqual([])
  })
})
