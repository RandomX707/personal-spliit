'use client'
import { ActiveUserBalance } from '@/app/groups/[groupId]/expenses/active-user-balance'
import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { DocumentsCount } from '@/app/groups/[groupId]/expenses/documents-count'
import { LedgerAmount } from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
import { Locale } from '@/i18n/request'
import { getGroupExpenses } from '@/lib/api'
import { Currency, getCurrency } from '@/lib/currency'
import { cn, formatCurrency, formatDateOnly } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { Fragment } from 'react'

type Expense = Awaited<ReturnType<typeof getGroupExpenses>>[number]

function Participants({
  expense,
  participantCount,
}: {
  expense: Expense
  participantCount: number
}) {
  const t = useTranslations('ExpenseCard')
  const key = expense.amount > 0 ? 'paidBy' : 'receivedBy'
  const paidFor =
    expense.paidFor.length == participantCount && participantCount >= 4 ? (
      <strong>{t('everyone')}</strong>
    ) : (
      expense.paidFor.map((paidFor, index) => (
        <Fragment key={index}>
          {index !== 0 && <>, </>}
          <strong>{paidFor.participant.name}</strong>
        </Fragment>
      ))
    )

  const participants = t.rich(key, {
    strong: (chunks) => <strong>{chunks}</strong>,
    paidBy: expense.paidBy.name,
    paidFor: () => paidFor,
    forCount: expense.paidFor.length,
  })
  return <>{participants}</>
}

type Props = {
  expense: Expense
  currency: Currency
  groupId: string
  participantCount: number
}

export function ExpenseCard({
  expense,
  currency,
  groupId,
  participantCount,
}: Props) {
  const locale = useLocale() as Locale

  const originalAmount =
    expense.originalAmount != null &&
    expense.originalCurrency &&
    expense.originalCurrency !== currency.code
      ? formatCurrency(
          getCurrency(expense.originalCurrency, locale),
          expense.originalAmount,
          locale,
        )
      : null

  return (
    <Link
      href={`/groups/${groupId}/expenses/${expense.id}/edit`}
      key={expense.id}
      data-testid="expense-card"
      data-expense-id={expense.id}
      className={cn(
        'ledger-list-row grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm',
        expense.isReimbursement && 'italic',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
        <CategoryIcon
          category={expense.category}
          className="h-4 w-4 text-primary"
        />
      </div>
      <div className="min-w-0">
        <div
          className={cn(
            'truncate font-black',
            expense.isReimbursement && 'italic',
          )}
        >
          {expense.title}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          <Participants expense={expense} participantCount={participantCount} />
        </div>
        <div className="mt-1 text-xs font-semibold text-muted-foreground">
          <ActiveUserBalance {...{ groupId, currency, expense }} />
        </div>
      </div>
      <div className="flex flex-col items-end justify-center">
        <div
          className={cn(
            'money-nums whitespace-nowrap',
            expense.isReimbursement ? 'italic' : 'font-bold',
          )}
        >
          <LedgerAmount
            amount={expense.amount}
            currency={currency}
            locale={locale}
          />
        </div>
        {originalAmount && (
          <div className="money-nums whitespace-nowrap text-xs text-muted-foreground">
            {originalAmount}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          <DocumentsCount count={expense._count.documents} />
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDateOnly(expense.expenseDate, locale, { dateStyle: 'medium' })}
        </div>
      </div>
      <Button
        size="icon"
        variant="link"
        className="self-center hidden sm:flex"
        asChild
        tabIndex={-1}
      >
        <span>
          <ChevronRight className="w-4 h-4" />
        </span>
      </Button>
    </Link>
  )
}
