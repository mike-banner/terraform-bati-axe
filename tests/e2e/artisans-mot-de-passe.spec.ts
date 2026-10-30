import { test, expect } from '@playwright/test'

// Page intermédiaire « Je suis artisan » + flux mot de passe oublié (06.4).
// Supabase Auth est mocké : on vérifie le comportement de l'UI, pas l'envoi réel du mail.

test('accueil « Je suis artisan » → /pro/artisans → création de compte', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Je suis artisan' }).click()
  await expect(page).toHaveURL(/\/pro\/artisans$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('sans démarchage')

  await page.getByRole('link', { name: 'Créer mon compte artisan' }).first().click()
  await expect(page).toHaveURL(/\/pro\/claim\?mode=inscription/)
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeVisible()
})

test('mot de passe oublié : message neutre quel que soit le résultat, puis cooldown', async ({ page }) => {
  // Même une erreur serveur ne doit pas changer le message (pas d'énumération de comptes)
  await page.route('**/auth/v1/recover**', route => route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"user_not_found"}' }))
  await page.goto('/pro/claim', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click()
  await page.locator('#forgot-email').fill('inconnu@exemple.fr')
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()

  await expect(page.getByRole('status')).toContainText('Si un compte existe pour cette adresse')
  await expect(page.getByRole('button', { name: /Réessayer dans \d+ s/ })).toBeDisabled()
})

test('lien de réinitialisation expiré → message explicite', async ({ page }) => {
  await page.goto('/pro/reinitialiser-mot-de-passe?error_code=otp_expired', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: "Ce lien n'est plus valide" })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Retour à la connexion' })).toHaveAttribute('href', '/pro/claim')
})
