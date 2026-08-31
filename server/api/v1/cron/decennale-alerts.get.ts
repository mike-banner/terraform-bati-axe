import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { sendEmail } from '../../../utils/email'
import { renderEmail } from '../../../utils/emailLayout'

export interface DecennaleDoc {
  id: string
  professional_id: string
  expires_at: string
  alert_j30_sent_at: string | null
  alert_j7_sent_at: string | null
  professionals?: { email: string | null; company_name: string | null; full_name: string | null } | null
}

/** Pure : classe les documents en alertes J-30 / J-7 (testable sans Supabase). */
export function selectAlerts(docs: DecennaleDoc[], now: Date): { j30: DecennaleDoc[]; j7: DecennaleDoc[] } {
  const j30: DecennaleDoc[] = []
  const j7: DecennaleDoc[] = []
  for (const d of docs) {
    const days = (new Date(d.expires_at).getTime() - now.getTime()) / 86_400_000
    if (days < 0 || days > 30) continue
    if (days <= 7) {
      if (!d.alert_j7_sent_at) j7.push(d)
    } else if (!d.alert_j30_sent_at) {
      j30.push(d)
    }
  }
  return { j30, j7 }
}

export default defineEventHandler(async (event) => {
  // Secret partagé : sans lui l'endpoint est publiquement déclenchable.
  const secret = (useRuntimeConfig() as any).cronSecret
  const auth = getHeader(event, 'authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const now = new Date()
  const horizon = new Date(now.getTime() + 30 * 86_400_000).toISOString()

  const { data: docs, error } = await supabase
    .from('documents_artisan')
    .select('id, professional_id, expires_at, alert_j30_sent_at, alert_j7_sent_at, professionals(email, company_name, full_name)')
    .eq('doc_type', 'decennale')
    .eq('status', 'valid')
    .not('expires_at', 'is', null)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', horizon)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture documents.' })

  const { j30, j7 } = selectAlerts(docs || [], now)
  const siteUrl = useRuntimeConfig().public.siteUrl || 'https://bati-axe.com'
  let sent = 0

  for (const [bucket, docsList] of [['j30', j30], ['j7', j7]] as const) {
    for (const doc of docsList) {
      const email = doc.professionals?.email
      if (!email) continue
      const dateFr = new Date(doc.expires_at).toLocaleDateString('fr-FR')
      const urgent = bucket === 'j7'
      try {
        const res = await sendEmail({
          to: email,
          sender: 'notifications',
          subject: urgent
            ? `Votre attestation décennale expire le ${dateFr} — action requise`
            : `Votre attestation décennale expire dans 30 jours (${dateFr})`,
          html: renderEmail({
            title: urgent ? 'Votre décennale expire dans moins de 7 jours' : 'Votre décennale expire dans 30 jours',
            preheader: `Expiration le ${dateFr}.`,
            intro: `Bonjour ${doc.professionals?.full_name || doc.professionals?.company_name || ''}, votre attestation de responsabilité civile décennale enregistrée sur BÂTI-AXE expire le ${dateFr}.`,
            bodyHtml: `<p style="margin:0;padding:12px 16px;background:#F8FAFC;border-left:3px solid #EA580C;font-size:14px;color:#334155;">Sans attestation valide à cette date, votre profil est automatiquement suspendu : vous ne pourrez plus débloquer de nouveaux chantiers ni apparaître comme disponible en sous-traitance.</p>`,
            cta: { label: 'Envoyer ma nouvelle attestation', href: `${siteUrl}/espace/dashboard?doc=decennale` },
          }),
        })
        if (res.success) {
          await supabase
            .from('documents_artisan')
            .update(urgent ? { alert_j7_sent_at: now.toISOString() } : { alert_j30_sent_at: now.toISOString() })
            .eq('id', doc.id)
          sent++
        }
      } catch (err) {
        console.error('[06.3] alerte décennale échouée pour', doc.id, err)
      }
    }
  }

  return { status: 'SUCCESS', checked: docs?.length ?? 0, j30: j30.length, j7: j7.length, sent }
})
