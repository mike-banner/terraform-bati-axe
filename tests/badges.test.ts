// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BadgeEntrepriseVerifiee from '../app/components/BadgeEntrepriseVerifiee.vue'
import BadgeDecennaleCertifiee from '../app/components/BadgeDecennaleCertifiee.vue'

describe('BadgeEntrepriseVerifiee', () => {
  it('affiche le texte par défaut "Entreprise Vérifiée (API Gouv)"', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee)
    expect(wrapper.text()).toContain('Entreprise Vérifiée (API Gouv)')
  })

  it('contient la classe bg-[#F8FAFC] (palette Sketch 001)', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee)
    expect(wrapper.html()).toContain('bg-[#F8FAFC]')
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

  it('contient la classe bg-[#F8FAFC] (palette Sketch 001)', () => {
    const wrapper = mount(BadgeDecennaleCertifiee)
    expect(wrapper.html()).toContain('bg-[#F8FAFC]')
  })
})
