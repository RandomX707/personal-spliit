import { CreateGroup } from '@/app/groups/create/create-group'
import { appConfig } from '@/config/app'
import { env } from '@/lib/env'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('Groups')

  return {
    title: t('createGroup'),
  }
}

export default function CreateGroupPage() {
  const defaultCurrencyCode =
    env.DEFAULT_CURRENCY_CODE ??
    env.NEXT_PUBLIC_DEFAULT_CURRENCY_CODE ??
    appConfig.defaultCurrency.code
  return <CreateGroup defaultCurrencyCode={defaultCurrencyCode} />
}
