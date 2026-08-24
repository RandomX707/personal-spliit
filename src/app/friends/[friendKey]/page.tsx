import { FriendDetailClient } from './friend-detail-client'

export const metadata = {
  title: 'Friend',
}

export default async function FriendDetailPage({
  params,
}: {
  params: Promise<{ friendKey: string }>
}) {
  const { friendKey } = await params
  return <FriendDetailClient friendKey={decodeURIComponent(friendKey)} />
}
