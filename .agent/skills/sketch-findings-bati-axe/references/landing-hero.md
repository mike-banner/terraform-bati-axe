# Landing Hero

## Design Decisions
- **Chosen Variant:** Bento Grid Hero (Variant C)
- **Why it won:** Provides a highly visual, structured, and dense information layout that remains airy and premium. It immediately showcases key metrics, tools, and the interface context without forcing the user to scroll down.
- **Key Visual Properties:**
  - **Colors:** Industrial Grey (#64748B) and Safety Orange (#F97316) against a Slate-50 background.
  - **Typography:** Massive typography for the main headline, high contrast between titles and body text.
  - **Spacing:** Large paddings (`p-8` to `p-10` in Tailwind) inside cards.
  - **Border Radius:** Extra large (`rounded-3xl`) for the Bento cards to give a soft, modern Apple-like feel.

## CSS Patterns
```css
/* Card Hover Interactions */
.bento-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}
.bento-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px -15px rgba(0,0,0,0.1);
}
```

## HTML Structures
```html
<!-- Grid Structure for Bento -->
<div class="grid grid-cols-1 md:grid-cols-12 gap-6">
  <!-- Main Intro Card -->
  <div class="bento-card md:col-span-8 bg-white rounded-3xl p-10 border border-slate-200">...</div>
  <!-- Metric Card -->
  <div class="bento-card md:col-span-4 bg-industrial text-white rounded-3xl p-8">...</div>
</div>
```

## What to Avoid
- Full-width hero background images that make text unreadable.
- Generic 2D flat layouts.
- Purple/Pink AI gradients.

## Origin
Synthesized from sketch: 001-landing-hero
Source files available in: sources/001-landing-hero/
