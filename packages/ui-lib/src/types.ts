export type BizFieldType =
  | 'input'
  | 'textarea'
  | 'number'
  | 'select'
  | 'switch'
  | 'date'
  | 'daterange'

export interface BizOption {
  label: string
  value: string | number | boolean
}

export interface BizField {
  prop: string
  label: string
  type: BizFieldType
  options?: BizOption[]
  required?: boolean
  placeholder?: string
}

export interface BizColumn {
  prop: string
  label: string
  width?: number | string
  formatter?: (row: Record<string, unknown>) => string
}

export interface BizPagination {
  page: number
  pageSize: number
  total: number
}
