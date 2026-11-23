import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function fillQuiz(page: Page) {
  await page.getByRole('button', { name: 'Create setup', exact: true }).click()
  await page.getByLabel('Circuit').selectOption('japan')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Responsive/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Handling concern').selectOption('Understeer')
  await page.getByLabel('Where do you feel the understeer?').selectOption('Corner exit')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Understeer · Corner exit')).toBeVisible()
  await page.getByLabel('Look up public community settings').uncheck()
  await page.getByRole('button', { name: 'Confirm and generate' }).click()
  await expect(page.getByRole('heading', { name: 'Japan · Dry race' })).toBeVisible()
}

test('project-path home, navigation and validated garage workflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /find your line/i })).toBeVisible()
  const hero = await page.locator('.hero-visual').evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(hero).toContain('/Hellafast-setups/hero-car.webp')
  const image = await page.request.get(new URL('./hero-car.webp', page.url()).href)
  expect(image.ok()).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await fillQuiz(page)
  await expect(page.getByText('Front wing', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Research', exact: true }).click()
  await expect(page.getByText(/public lookup is off/i)).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Open engineer' }).click()
  await page.getByRole('button', { name: 'More rear stability' }).click()
  await page.getByRole('button', { name: 'Apply as new version' }).click()
  await expect(page.getByText('Engineer adjustment saved as a new version.')).toBeVisible()
  await page.getByRole('button', { name: 'Open setup' }).click()
  await page.getByRole('button', { name: 'Versions', exact: true }).click()
  await expect(page.getByText('V2 · Rear stability', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restore as new version' }).click()
  await expect(page.getByText('V3 · Restored Initial setup')).toBeVisible()
  await page.getByLabel('Handling area').selectOption('Braking')
  await page.getByLabel('Corner or test note').fill('Locks on entry.')
  await page.getByRole('button', { name: 'Save feedback', exact: true }).click()
  await page.getByRole('button', { name: 'Review an adjustment' }).click()
  await page.getByRole('button', { name: 'Save feedback adjustment as a new version' }).click()
  await expect(page.getByText('V4 · Braking stability')).toBeVisible()
  expect(errors).toEqual([])
})

test('offline reload, local garage and offline generation', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /find your line/i })).toBeVisible()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText(/Offline · Local engineering/)).toBeVisible()
  await fillQuiz(page)
  await page.getByRole('link', { name: /^(My )?Garage$/ }).click()
  await expect(page.getByRole('button', { name: /Japan · Dry race/ })).toBeVisible()
})

test('quiz recovery, folder assignment, autosave and duplicate-safe backup', async ({ page }) => {
  await page.goto('./#create')
  await page.getByLabel('Circuit').selectOption('bahrain')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: /Stable/ }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /Stable/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: /^(My )?Garage$/ }).click()
  await page.getByRole('button', { name: 'New folder' }).click()
  await page.getByLabel('Folder name').fill('Test runs')
  await page.getByRole('button', { name: 'Save folder' }).click()
  await expect(page.getByLabel('Filter by folder').getByRole('option', { name: 'Test runs' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Create setup' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Look up public community settings').uncheck()
  await page.getByRole('button', { name: 'Confirm and generate' }).click()
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await page.getByRole('combobox', { name: 'Folder', exact: true }).selectOption({ label: 'Test runs' })
  await page.getByLabel('Test notes').fill('Brake stability improved')
  await page.getByLabel('Test notes').blur()
  await page.reload()
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(page.getByLabel('Test notes')).toHaveValue('Brake stability improved')
  await expect(page.getByRole('combobox', { name: 'Folder', exact: true }).locator('option:checked')).toHaveText('Test runs')
  await page.getByRole('link', { name: 'Profile' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'ZIP', exact: true }).click()
  const path = await (await download).path()
  await page.locator('input[type="file"]').setInputFiles(path!)
  await expect(page.getByText(/1 duplicate ID/)).toBeVisible()
})

test('public evidence reaches the worker without transmitting private context', async ({ page, context }) => {
  let requestCount = 0
  await context.route('https://raw.githubusercontent.com/gborges0727/f1-setups/**', async (route) => {
    requestCount += 1
    expect(route.request().method()).toBe('GET')
    expect(route.request().postData()).toBeNull()
    expect(new URL(route.request().url()).search).toBe('')
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      json: { game: 'f1-25', tracks: [{ id: 'bahrain', dry: { 'Front Wing': '35' } }] },
    })
  })
  await page.goto('./#create')
  for (const step of ['Conditions', 'Balance', 'Handling']) {
    await expect(page.locator('.steps li').filter({ hasText: step })).toHaveAttribute('aria-current', 'step')
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  await page.getByRole('button', { name: 'Confirm and generate' }).click()
  await page.getByRole('button', { name: 'Research', exact: true }).click()
  await expect(page.getByText(/one public community aggregate matched/i)).toBeVisible()
  await page.getByText('F1Laps community aggregate via gborges0727', { exact: false }).click()
  await expect(page.getByText('35', { exact: true })).toBeVisible()
  expect(requestCount).toBe(1)
})

test('model download requires consent and rejects a partial file', async ({ page, context }) => {
  let transfers = 0
  await context.route('https://huggingface.co/lmstudio-community/SmolLM2-135M-Instruct-GGUF/**', async (route) => {
    transfers += 1
    expect(route.request().postData()).toBeNull()
    await route.fulfill({ body: 'incomplete', headers: { 'access-control-allow-origin': '*' } })
  })
  await page.goto('./#profile')
  const download = page.getByRole('button', { name: 'Download model', exact: true })
  await expect(download).toBeDisabled()
  expect(transfers).toBe(0)
  await page.getByLabel('Download this model to this device').check()
  await download.click()
  await expect(page.getByText(/model download is incomplete/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove model' })).toHaveCount(0)
  expect(transfers).toBe(1)
})
