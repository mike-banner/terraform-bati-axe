// Cloudflare Pages/Workers : les variables et secrets du dashboard ne sont lisibles que via
// event.context.cloudflare.env (pas process.env). Les utilitaires sans accès à la requête
// (sendEmail appelé depuis notifyAdmin, etc.) les lisent via globalThis.__env__ : on l'alimente
// ici à chaque requête. L'environnement d'un isolate est identique d'une requête à l'autre.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const env = (event.context as any)?.cloudflare?.env
    if (env) (globalThis as any).__env__ = env
  })
})
