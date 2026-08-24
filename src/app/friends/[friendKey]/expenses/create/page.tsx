import { DirectFriendExpenseClient } from './direct-friend-expense-client'

export const metadata = {
  title: 'Add Friend Expense',
}

export default async function DirectFriendExpensePage({
  params,
}: {
  params: Promise<{ friendKey: string }>
}) {
  const { friendKey } = await params
  return <DirectFriendExpenseClient friendKey={decodeURIComponent(friendKey)} />
}
