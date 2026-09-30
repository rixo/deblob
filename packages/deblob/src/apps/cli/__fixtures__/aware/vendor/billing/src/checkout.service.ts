export const createCheckoutService = () => ({
  totalOf: (amounts: readonly number[]) =>
    amounts.reduce((sum, amount) => sum + amount, 0),
})
