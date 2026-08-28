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

  it('affiche fond vert (bg-emerald-100) quand vérifié (défaut)', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee)
    expect(wrapper.html()).toContain('bg-emerald-100')
  })

  it('affiche fond amber (bg-amber-50) quand pending', () => {
    const wrapper = mount(BadgeEntrepriseVerifiee, { props: { pending: true } })
    expect(wrapper.html()).toContain('bg-amber-50')
    expect(wrapper.text()).toContain('Vérification entreprise en cours')
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

  it('affiche fond vert (bg-emerald-100) quand certifié (défaut)', () => {
    const wrapper = mount(BadgeDecennaleCertifiee)
    expect(wrapper.html()).toContain('bg-emerald-100')
  })

  it('affiche fond amber (bg-amber-50) quand pending', () => {
    const wrapper = mount(BadgeDecennaleCertifiee, { props: { pending: true } })
    expect(wrapper.html()).toContain('bg-amber-50')
    expect(wrapper.text()).toContain('Décennale en cours de vérification')
  })
})
