export interface Budget {
  id: string
  month: number // 1-12
  year: number
  category_budgets: Record<string, number> // category_id -> allocated amount
  created_at: string
}
