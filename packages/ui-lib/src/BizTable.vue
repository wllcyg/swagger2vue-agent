<script setup lang="ts">
import { ElPagination, ElTable, ElTableColumn, vLoading } from 'element-plus'
import type { BizColumn, BizPagination } from './types'

withDefaults(
  defineProps<{
    /** 列定义 */
    columns: BizColumn[]
    /** 行唯一标识字段名，必传 */
    rowKey: string
    data?: Record<string, unknown>[]
    loading?: boolean
    pagination?: BizPagination
  }>(),
  { data: () => [], loading: false },
)

const emit = defineEmits<{
  (e: 'page-change', payload: { page: number, pageSize: number }): void
}>()

defineSlots<{
  /** 行操作区，每行渲染一次 */
  actions?: (props: { row: Record<string, unknown> }) => unknown
}>()
</script>

<template>
  <div class="biz-table">
    <ElTable v-loading="loading" :data="data" :row-key="rowKey" border>
      <ElTableColumn
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :formatter="col.formatter ? (row: Record<string, unknown>) => col.formatter!(row) : undefined"
      />
      <ElTableColumn v-if="$slots.actions" label="操作" fixed="right">
        <template #default="{ row }">
          <slot name="actions" :row="row" />
        </template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      v-if="pagination"
      class="biz-table__pagination"
      layout="total, prev, pager, next, sizes"
      :current-page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      @current-change="(page: number) => emit('page-change', { page, pageSize: pagination!.pageSize })"
      @size-change="(pageSize: number) => emit('page-change', { page: 1, pageSize })"
    />
  </div>
</template>

<style scoped>
.biz-table__pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
