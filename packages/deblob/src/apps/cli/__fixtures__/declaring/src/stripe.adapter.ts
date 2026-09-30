export const createStripeAdapter = () => ({
  charge: (amount: number) => `charged ${amount}`,
})
