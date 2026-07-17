interface FinalAmountInput {
  amount: string | number
  maintenance: string | number
  tax: string | number
  wtaxApplicable: boolean
  wtax: string | number
}

export function computeFinalAmount({ amount, maintenance, tax, wtaxApplicable, wtax }: FinalAmountInput): string {
  const rentM = (Number(amount) || 0) + (Number(maintenance) || 0)
  const taxAmt = rentM * (Number(tax) || 0) / 100
  let total = rentM + taxAmt
  if (wtaxApplicable) {
    const wtaxAmt = rentM * (Number(wtax) || 0) / 100
    total -= wtaxAmt
  }
  return total.toFixed(2)
}
