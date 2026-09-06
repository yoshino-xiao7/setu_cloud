export type RecordTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
export interface RecordStatus { text: string, tone: RecordTone }
export interface RecordField { name: string, value: string, numeric?: boolean }
export type BentoSpan = 'small' | 'wide' | 'tall' | 'hero'
