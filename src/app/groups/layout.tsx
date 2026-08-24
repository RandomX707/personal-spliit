import { PropsWithChildren, Suspense } from 'react'

export default function GroupsLayout({ children }: PropsWithChildren<{}>) {
  return (
    <Suspense>
      <main className="flex w-full flex-1 flex-col gap-6">{children}</main>
    </Suspense>
  )
}
