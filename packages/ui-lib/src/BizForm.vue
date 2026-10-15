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
import type { FormInstance } from 'element-plus'
import { computed, ref } from 'vue'
import type { BizField } from './types'

const props = withDefaults(
  defineProps<{
    /** 表单项定义 */
    fields: BizField[]
    /** 表单数据，由调用方持有 */

    model: Record<string, any>
    labelWidth?: string
    submitting?: boolean
  }>(),
  { labelWidth: '100px', submitting: false },
)

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, any>): void
  (e: 'cancel'): void
}>()

const formRef = ref<FormInstance>()

const rules = computed(() =>
  Object.fromEntries(
    props.fields
      .filter(field => field.required)
      .map(field => [field.prop, [{ required: true, message: `请输入${field.label}`, trigger: 'blur' }]]),
  ),
)

async function handleSubmit() {
  if (!formRef.value)
    return
  const valid = await formRef.value.validate().catch(() => false)
  if (valid)
    emit('submit', props.model)
}

defineExpose({
  reset: () => formRef.value?.resetFields(),
})
</script>

<template>
  <ElForm ref="formRef" :model="model" :rules="rules" :label-width="labelWidth">
    <ElFormItem v-for="field in fields" :key="field.prop" :label="field.label" :prop="field.prop">
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
      <ElInput v-else-if="field.type === 'textarea'" v-model="model[field.prop]" type="textarea" :placeholder="field.placeholder" />
      <ElInput v-else v-model="model[field.prop]" :placeholder="field.placeholder" />
    </ElFormItem>
    <ElFormItem>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
      <ElButton @click="emit('cancel')">取消</ElButton>
    </ElFormItem>
  </ElForm>
</template>
