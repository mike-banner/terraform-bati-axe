<script setup lang="ts">
// Modales partagées des appels d'offres : positionnement, signature (convention / avenant), signalement.
// `t` est le retour de useProTenders() (reactive) : les refs y sont déjà déballées.
defineProps<{ t: any }>()
</script>

<template>
  <div>
    <EspaceTenderClaimModal
      v-if="t.claimTarget"
      :tender="t.claimTarget"
      :submitting="t.claimSubmitting"
      @confirm="t.confirmClaim()"
      @cancel="t.claimTarget = null"
    />
    <EspaceEngagementSignModal
      v-if="t.signFlow"
      :title="t.signFlow.title"
      :contract-html="t.signFlow.html"
      :email-hint="t.signFlow.emailHint"
      :code-sent="t.signFlow.codeSent"
      :submitting="t.signSubmitting"
      :error="t.signError"
      @sign="t.signWithCode($event)"
      @resend="t.resendCode()"
      @cancel="t.signFlow = null"
    />
    <EspaceTenderReportModal
      v-if="t.reportTarget"
      :tender="t.reportTarget"
      :submitting="t.reportSubmitting"
      @submit="t.submitReport($event)"
      @cancel="t.reportTarget = null"
    />
  </div>
</template>
