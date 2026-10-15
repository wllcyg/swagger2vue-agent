<script setup lang="ts">
import {
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import type { BizField } from './types'

defineProps<{
  /** 筛选项定义 */
  fields: BizField[]
  /** 筛选条件，由调用方持有 */

  model: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()
</script>

<template>
  <ElForm class="biz-search-bar" inline :model="model" @submit.prevent="emit('search')">
    <ElFormItem v-for="field in fields" :key="field.prop" :label="field.label">
      <ElSelect v-if="field.type === 'select'" v-model="model[field.prop]" clearable :placeholder="field.placeholder">
        <ElOption v-for="opt in field.options" :key="String(opt.value)" :label="opt.label" :value="opt.value" />
      </ElSelect>
      <ElDatePicker v-else-if="field.type === 'date'" v-model="model[field.prop]" type="date" value-format="YYYY-MM-DD" />
      <ElDatePicker
        v-else-if="field.type === 'daterange'"
        v-model="model[field.prop]"
        type="daterange"
        value-format="YYYY-MM-DD"
      />
      <ElInputNumber v-else-if="field.type === 'number'" v-model="model[field.prop]" />
      <ElSwitch v-else-if="field.type === 'switch'" v-model="model[field.prop]" />
      <ElInput v-else v-model="model[field.prop]" clearable :placeholder="field.placeholder" />
    </ElFormItem>
    <ElFormItem>
      <ElButton type="primary" native-type="submit">查询</ElButton>
      <ElButton @click="emit('reset')">重置</ElButton>
    </ElFormItem>
  </ElForm>
</template>
