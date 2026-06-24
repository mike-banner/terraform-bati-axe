// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BadgeEntrepriseVerifiee from '../app/components/ui/BadgeEntrepriseVerifiee.vue'
import BadgeDecennaleCertifiee from '../app/components/ui/BadgeDecennaleCertifiee.vue'

describe('BadgeEntrepriseVerifiee', () => {
  it('affiche le texte par défaut "Entreprise Vérifiée (API Gouv)"', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee)
    expect(wrapper.text()).toContain('Entreprise Vérifiée (API Gouv)')
  })

  it('contient la classe bg-cyan-100/80', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee)
    expect(wrapper.html()).toContain('bg-cyan-100/80')
  })

  it('accepte un slot personnalisé', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee, { slots: { default: 'Mon badge custom' } })
    expect(wrapper.text()).toBe('Mon badge custom')
  })
})

describe('BadgeDecennaleCertifiee', () => {
  it('affiche le texte par défaut "Décennale Certifiée BÂTI-AXE"', () => {
    const wrapper = mount(BadgeDecennaleCertifiee)
    expect(wrapper.text()).toContain('Décennale Certifiée BÂTI-AXE')
  })

  it('contient la classe bg-green-100/80', () => {
    const wrapper = mount(BadgeDecennaleCertifiee)
    expect(wrapper.html()).toContain('bg-green-100/80')
  })
})
