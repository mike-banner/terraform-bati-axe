export interface QualifyInput {
  budget_range: string
  customer_phone: string
  description: string
  returning_count: number
}

export interface QualifyResult {
  qualify_budget: boolean
  qualify_phone: boolean
  qualify_description: boolean
  qualify_returning: boolean
  qualify_score: number
}

export function computeQualifyScore(input: QualifyInput): QualifyResult {
  const qualify_budget = input.budget_range.length > 0
  const qualify_phone = input.customer_phone.length > 0
  const qualify_description = input.description.length > 50
  const qualify_returning = input.returning_count > 0
  const qualify_score = [qualify_budget, qualify_phone, qualify_description, qualify_returning].filter(Boolean).length

  return { qualify_budget, qualify_phone, qualify_description, qualify_returning, qualify_score }
}
