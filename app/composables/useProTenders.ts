// Appels d'offres partenaires côté pro : données, signature de la convention cadre / de l'avenant,
// positionnement, signalement et décision sur le devis. Partagé par « Appels d'offres » et « Projets en cours ».
export type SignFlow = {
  kind: 'framework' | 'amendment'
  lotId?: string
  title: string
  html: string
  emailHint: string
  codeSent: boolean
}

// Synchrone : les composables Nuxt (useState, watch…) doivent s'exécuter avant tout await.
// Les pages attendent `t.ready` pour que le SSR embarque les données.
export function useProTenders() {
  const requestFetch = useRequestFetch()

  // useRequestFetch transmet le cookie d'auth au SSR (sinon 401 au rechargement).
  const tendersReq = useAsyncData('pro-tenders', () =>
    requestFetch<{ tenders: any[]; zones: any[]; canClaim: boolean; frameworkSigned: boolean }>('/api/v1/tenders'))
  const contractsReq = useAsyncData('pro-contracts', () =>
    requestFetch<{ engagements: any[] }>('/api/v1/engagements/pro').catch(() => ({ engagements: [] })))
  const { data: tendersData, pending, error, refresh: refreshTenders } = tendersReq
  const { data: contractsData, refresh: refreshContracts } = contractsReq
  const ready = Promise.all([tendersReq, contractsReq]).then(() => undefined)

  const tenders = computed(() => tendersData.value?.tenders || [])
  const contracts = computed(() => contractsData.value?.engagements || [])
  const canClaim = computed(() => tendersData.value?.canClaim ?? false)
  const frameworkSigned = computed(() => tendersData.value?.frameworkSigned ?? false)
  const frameworkContract = computed(() => contracts.value.find((c: any) => c.type === 'framework_pro') ?? null)
  // Lu par le menu (pastille « convention à signer »).
  const frameworkState = useState<boolean | null>('proFrameworkSigned', () => null)
  watch(frameworkSigned, v => { frameworkState.value = v }, { immediate: true })

  // Appels d'offres gagnés ou perdus : ils quittent « Appels d'offres » pour « Projets en cours ».
  const openTenders = computed(() => tenders.value.filter(isOpenTender))
  const projects = computed(() => splitProjects(tenders.value))
  const projectsCount = computed(() => projects.value.pending.length + projects.value.won.length + projects.value.lost.length)

  const claimTarget = ref<any | null>(null)
  const reportTarget = ref<any | null>(null)
  const claimSubmitting = ref(false)
  const reportSubmitting = ref(false)
  const message = ref<string | null>(null)

  // ─── Signature convention cadre / avenant (05.21) ─────────────────────────────
  const signFlow = ref<SignFlow | null>(null)
  const signSubmitting = ref(false)
  const signError = ref<string | null>(null)

  async function startFramework() {
    try {
      const res: any = await $fetch('/api/v1/engagements/pro/framework', { method: 'POST', body: { preview: true } })
      if (res.status === 'ALREADY_SIGNED') return await Promise.all([refreshTenders(), refreshContracts()])
      signError.value = null
      signFlow.value = { kind: 'framework', title: 'Convention cadre BÂTI-AXE', html: res.contract.html, emailHint: res.email_hint, codeSent: false }
    } catch (err: any) {
      message.value = err?.data?.statusMessage || 'Impossible de démarrer la signature.'
    }
  }

  // Avenant d'un positionnement sans avenant signé : ouvre directement la signature.
  async function startAmendment(lotId: string) {
    try {
      const res: any = await $fetch(`/api/v1/tenders/${lotId}/claim`, { method: 'POST', body: { preview: true } })
      if (res.status === 'AMENDMENT_REQUIRED') {
        signError.value = null
        signFlow.value = { kind: 'amendment', lotId, title: 'Avenant de mise en relation', html: res.contract.html, emailHint: res.email_hint, codeSent: false }
        return
      }
      await refreshTenders()
    } catch (err: any) {
      message.value = err?.data?.data?.code === 'FRAMEWORK_REQUIRED'
        ? 'Signez d\'abord la convention cadre BÂTI-AXE.'
        : err?.data?.statusMessage || 'Impossible de démarrer la signature.'
    }
  }

  async function confirmClaim() {
    if (!claimTarget.value) return
    claimSubmitting.value = true
    try {
      const res: any = await $fetch(`/api/v1/tenders/${claimTarget.value.lot_id}/claim`, { method: 'POST', body: { preview: true } })
      if (res.status === 'AMENDMENT_REQUIRED') {
        signError.value = null
        signFlow.value = { kind: 'amendment', lotId: claimTarget.value.lot_id, title: 'Avenant de mise en relation', html: res.contract.html, emailHint: res.email_hint, codeSent: false }
        claimTarget.value = null
        return
      }
      claimTarget.value = null
      await refreshTenders()
      message.value = 'Vous êtes positionné. Les coordonnées du partenaire sont maintenant visibles.'
    } catch (err: any) {
      claimTarget.value = null
      message.value = err?.data?.data?.code === 'FRAMEWORK_REQUIRED'
        ? 'Signez d\'abord la convention cadre BÂTI-AXE.'
        : err?.data?.statusMessage || "Impossible de vous positionner sur cet appel d'offres."
    } finally {
      claimSubmitting.value = false
    }
  }

  async function signWithCode(code?: string) {
    const flow = signFlow.value
    if (!flow) return
    signSubmitting.value = true
    signError.value = null
    const url = flow.kind === 'framework' ? '/api/v1/engagements/pro/framework' : `/api/v1/tenders/${flow.lotId}/claim`
    try {
      await $fetch(url, { method: 'POST', body: code ? { code } : {} })
      if (!code) { flow.codeSent = true; return } // envoi / renvoi de code à la demande du pro
      signFlow.value = null
      await Promise.all([refreshTenders(), refreshContracts()])
      message.value = flow.kind === 'framework'
        ? 'Convention signée. Vous pouvez vous positionner sur les appels d\'offres.'
        : 'Avenant signé. Les coordonnées du partenaire sont maintenant visibles.'
    } catch (err: any) {
      signError.value = err?.data?.statusMessage || 'Signature impossible.'
    } finally {
      signSubmitting.value = false
    }
  }
  const resendCode = () => signWithCode()

  // 05.23 : le pro confirme ou conteste le devis déposé par le partenaire (aucun montant saisi).
  async function postQuoteDecision(engagementId: string, body: Record<string, string>, okMessage: string) {
    try {
      await $fetch(`/api/v1/engagements/${engagementId}/confirm-quote`, { method: 'POST', body })
      await refreshTenders()
      message.value = okMessage
    } catch (err: any) {
      message.value = err?.data?.statusMessage || 'Décision impossible.'
    }
  }
  const confirmQuote = ({ engagementId, submissionId }: { engagementId: string; submissionId: string }) =>
    postQuoteDecision(engagementId, { decision: 'confirm', submission_id: submissionId }, 'Montant confirmé.')
  const contestQuote = ({ engagementId, submissionId, reason }: { engagementId: string; submissionId: string; reason: string }) =>
    postQuoteDecision(engagementId, { decision: 'contest', submission_id: submissionId, reason }, 'Contestation transmise : BÂTI-AXE arbitre.')

  async function submitReport(payload: { reason: string; details: string }) {
    if (!reportTarget.value) return
    reportSubmitting.value = true
    try {
      await $fetch(`/api/v1/tenders/${reportTarget.value.lot_id}/report`, { method: 'POST', body: payload })
      reportTarget.value = null
      message.value = "Signalement transmis à l'équipe BÂTI-AXE."
    } catch (err: any) {
      message.value = err?.data?.statusMessage || 'Impossible d\'envoyer le signalement.'
    } finally {
      reportSubmitting.value = false
    }
  }

  return reactive({
    ready, tenders, openTenders, projects, projectsCount, contracts, pending, error, refreshTenders,
    canClaim, frameworkSigned, frameworkContract,
    claimTarget, reportTarget, claimSubmitting, reportSubmitting, message,
    signFlow, signSubmitting, signError,
    startFramework, startAmendment, confirmClaim, signWithCode, resendCode,
    confirmQuote, contestQuote, submitReport,
  })
}
