// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RealisationCard from '../../app/components/RealisationCard.vue'

const project = {
  id: 'a1',
  title: 'Toiture',
  city: 'Poissy',
  image_urls: ['x.jpg'],
  likes: [{ count: 3 }]
}

describe('RealisationCard', () => {
  it('affiche alt="Toiture — Poissy" et le compteur de likes', () => {
    const wrapper = mount(RealisationCard, { props: { project } })
    expect(wrapper.find('img').attributes('alt')).toBe('Toiture — Poissy')
    expect(wrapper.text()).toContain('3')
  })

  it('le bouton like porte aria-label="Aimer cette réalisation"', () => {
    const wrapper = mount(RealisationCard, { props: { project } })
    expect(wrapper.find('button').attributes('aria-label')).toBe('Aimer cette réalisation')
  })

  it('utilise bg-white/90 et jamais bg-white/10 pour le chip', () => {
    const wrapper = mount(RealisationCard, { props: { project } })
    expect(wrapper.html()).toContain('bg-white/90')
    expect(wrapper.html()).not.toContain('bg-white/10')
  })
})
