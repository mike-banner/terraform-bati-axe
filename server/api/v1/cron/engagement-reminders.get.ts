import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { sendEmail } from '../../../utils/email'
import { renderEmail } from '../../../utils/emailLayout'
import { notifyAdmin, adminDetailsTable } from '../../../utils/notifyAdmin'
import { escapeHtml } from '../../../utils/contracts'

export interface ReminderCandidate { id: string; status: string; signed_at: string; reminder_30_sent_at: string | null; reminder_60_sent_at: string | null }

/** Pure : avenants `signed` sans déclaration à relancer (J+30 puis J+60, une fois chacun). */
export function selectEngagementReminders(rows: ReminderCandidate[], now: Date): { j30: string[]; j60: string[] } {
  const j30: string[] = []
  const j60: string[] = []
  for (const r of rows) {
    if (r.status !== 'signed') continue
    const age = (now.getTime() - new Date(r.signed_at).getTime()) / 86_400_000
    if (age >= 60 && !r.reminder_60_sent_at) j60.push(r.id)
    else if (age >= 30 && age < 60 && !r.reminder_30_sent_at && !r.reminder_60_sent_at) j30.push(r.id)
  }
  return { j30, j60 }
}

export default defineEventHandler(async (event) => {
  const secret = (useRuntimeConfig() as any).cronSecret
  if (!secret || getHeader(event, 'authorization') !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Non autorisé.' })
  }

  const supabase = await serverSupabaseServiceRole(event) as any
  const { data: rows, error } = await supabase
    .from('b2b_engagements')
    .select('id, status, signed_at, reminder_30_sent_at, reminder_60_sent_at, request_id, professionals(email, company_name), b2b_tender_lots(category)')
    .eq('type', 'lot_amendment').eq('status', 'signed').limit(1000)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Erreur lecture des avenants.' })

  const now = new Date()
  const { j30, j60 } = selectEngagementReminders(rows || [], now)
  const byId = new Map<string, any>((rows || []).map((r: any) => [r.id, r]))
  const siteUrl = (useRuntimeConfig().public as any).siteUrl || 'https://bati-axe.com'
  let failed = 0
  const sent60: Array<[string, string]> = []

  const send = async (id: string, level: 30 | 60) => {
    const r = byId.get(id)
    try {
      if (!r.professionals?.email) throw new Error('email pro absent')
      const title = level === 30 ? 'Où en est votre devis ?' : 'Dernière relance : déclarez votre devis'
      await sendEmail({
        to: r.professionals.email, sender: 'notifications', subject: title,
        html: renderEmail({
          title,
          intro: `Vous vous êtes positionné sur un chantier (dossier réf. ${escapeHtml(String(r.request_id).slice(0, 8).toUpperCase())}) il y a ${level} jours. Votre avenant vous engage à déclarer le montant du devis signé, ou l'absence de chantier.`,
          cta: { label: 'Déclarer mon devis', href: `${siteUrl}/espace/leads?tab=ao` },
        }),
      })
      const stamp = now.toISOString()
      const patch = level === 30
        ? { reminder_30_sent_at: stamp }
        : { reminder_60_sent_at: stamp, reminder_30_sent_at: r.reminder_30_sent_at ?? stamp }
      const { error: upErr } = await supabase.from('b2b_engagements').update(patch).eq('id', id).select('id')
      if (upErr) throw upErr
      if (level === 60) sent60.push([r.professionals.company_name ?? r.professionals.email, `${r.b2b_tender_lots?.category ?? '-'} (signé le ${new Date(r.signed_at).toLocaleDateString('fr-FR')})`])
    } catch (err) {
      failed++
      console.error('[05.21] Échec relance avenant', id, err)
    }
  }
  for (const id of j30) await send(id, 30)
  for (const id of j60) await send(id, 60)

  if (j60.length > 0) {
    await notifyAdmin({
      subject: `${j60.length} avenant(s) sans déclaration à J+60`,
      title: 'Avenants sans déclaration à J+60',
      bodyHtml: adminDetailsTable(sent60.length ? sent60 : [['Avenants', String(j60.length)]]),
    })
  }

  return { status: 'SUCCESS', checked: rows?.length ?? 0, j30: j30.length, j60: j60.length, failed }
})
