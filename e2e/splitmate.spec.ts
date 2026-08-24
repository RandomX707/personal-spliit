import { addExpense, createGroup, setActiveUser, uniqueSuffix } from './app'
import { expect, test } from './fixtures'
import { cardByTitle, fieldByLabel, fillStable, selectRadixOption } from './ui'

async function expectNoHorizontalOverflow(page: {
  evaluate: <T>(fn: () => T) => Promise<T>
}) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true)
}

test('SplitMate dashboard and navigation render on desktop and mobile', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'You are owed' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Friends' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add expense' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'dark')
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('records a direct friend expense and only settles UPI after confirmation', async ({
  page,
}) => {
  const name = `SplitMate Friend ${uniqueSuffix()}`
  const groupId = await createGroup(page, {
    name,
    participants: ['Alice', 'Rahul'],
  })
  await setActiveUser(page, groupId, 'Alice')

  await addExpense(page, groupId, {
    title: 'Opening dinner',
    amount: '100',
    paidBy: 'Alice',
  })

  await page.goto('/friends')
  await expect(page.getByRole('heading', { name: 'Friends' })).toBeVisible()
  await page.getByRole('link', { name: /Rahul/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Rahul' })).toBeVisible()
  await expect(page.getByText(/Rahul owes you/)).toBeVisible()

  const paymentDetails = cardByTitle(page, 'Payment details')
  await fillStable(paymentDetails.getByLabel('UPI ID'), 'rahul@oksbi')
  await paymentDetails.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Friend details saved')).toBeVisible()

  await page.getByRole('link', { name: /Add Expense/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Add friend expense' }),
  ).toBeVisible({ timeout: 30_000 })
  await fillStable(page.locator('#direct-title'), 'Direct coffee')
  await fillStable(page.locator('#direct-amount'), '1200')
  await selectRadixOption(
    page,
    fieldByLabel(page, 'Paid by').getByRole('combobox'),
    'Rahul',
  )
  await page.getByRole('button', { name: 'Save expense' }).click()
  await page.waitForURL(/\/groups\/[^/]+\/expenses\/[^/]+\/edit/, {
    timeout: 30_000,
  })

  await page.goto('/friends')
  await page.getByRole('link', { name: /Rahul/ }).first().click()
  await expect(page.getByText(/You owe Rahul/)).toBeVisible()
  const upiSettlement = cardByTitle(page, 'UPI settlement')
  await expect(upiSettlement).toBeVisible()
  await expect(upiSettlement.locator('svg').first()).toBeVisible()

  await page.getByRole('button', { name: 'I have paid with UPI' }).click()
  await expect(page.getByText('Did you complete the payment?')).toBeVisible()
  await expect(page.getByText(/You owe Rahul/)).toBeVisible()

  await page.getByRole('button', { name: 'Mark as settled' }).click()
  await expect(page.getByText('Settlement recorded')).toBeVisible()
  await expect(page.getByText(/You owe Rahul/)).toHaveCount(0)
})
