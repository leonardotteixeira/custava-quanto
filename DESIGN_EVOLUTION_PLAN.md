# 🎯 Plano de Evolução de Design - CUSTAVA QUANTO?

## Fase 1: AUDITORIA & ANÁLISE (Semana 1-2)

### 1.1 - Audit Completo com `@impeccable`
**Quando:** Agora
**Skill:** `@impeccable`
**Objetivo:** Identificar todos os gaps de design

```
@impeccable Audit the entire CUSTAVA QUANTO? dashboard for:
1. Visual hierarchy - are important data points visually prominent?
2. Color consistency - palette, contrast ratios, accessibility
3. Typography - font sizes, weights, line heights, consistency
4. Spacing & alignment - grid consistency, padding/margins
5. Components - buttons, cards, forms, inputs reusability
6. Responsive behavior - mobile, tablet, desktop
7. Accessibility - WCAG compliance, focus states, labels
8. Micro-interactions - feedback, animations, transitions
9. Information architecture - content organization
10. Edge cases - empty states, error states, loading states

Current sections to review:
- Header (title, subtitle, product selector)
- Market indicators (Dólar, Selic, Ibovespa, IPCA)
- Comparison section (ERA vs AGORA with bars)
- Timeline/context section
- News section
- Methodology accordion

Provide: scored findings (1-10), top 10 issues, recommendations
```

**Output esperado:**
- Scored report (color: red/yellow/green)
- Top issues prioritized
- Quick wins vs. deep refactors
- Accessibility gaps
- Mobile-specific issues

---

## Fase 2: DESIGN DIRECTION (Semana 2-3)

### 2.1 - Define Design Direction
**Quando:** Após audit
**Skills:** `@design-taste-frontend` + `@minimalist-ui`
**Objetivo:** Decidir o "look & feel" final

```
@design-taste-frontend Based on the audit findings, define the design 
direction for CUSTAVA QUANTO? dashboard. We need:

Current state: Functional but looks templated, inconsistent spacing
Target: Professional, data-driven, clear hierarchy, modern but not trendy

Consider:
- Minimalist approach (less is more) or rich with interactions?
- Color story - current is muted, should it be bolder?
- Data visualization - spark charts work but need refinement
- Typography - should we change fonts or better utilize existing ones?
- Animation - how much micro-interaction? smooth transitions?

Constraints:
- Already have daily market data (real-time update)
- Need to keep news/timeline section
- Mobile-first responsive
- Dark mode friendly

Provide: Design direction statement, color palette, typography scale, 
spacing grid, component design patterns
```

### 2.2 - Design System Foundation
**Quando:** Após direction
**Skill:** `@impeccable` (second pass)
**Objetivo:** Definir design tokens

```
@impeccable Create a design system foundation for CUSTAVA QUANTO?:

Design Tokens:
1. Color palette (primary, secondary, accent, grays, status colors)
2. Typography scale (h1-h6, body, labels, code)
3. Spacing scale (4px, 8px, 16px, 24px, 32px...)
4. Shadows (elevation system)
5. Border radius (buttons, cards, inputs)
6. Component variants (button sizes/states, card types)

Current components to define:
- Buttons (primary, secondary, ghost)
- Cards (comparison cards, indicator cards, news cards)
- Inputs & selectors
- Badges & tags
- Alerts & notifications
- Tables
- Charts/graphs

Output: JSON-like structure we can use in code
```

---

## Fase 3: COMPONENT REDESIGN (Semana 3-5)

### 3.1 - Header & Navigation
**Quando:** Week 3
**Skills:** `@impeccable` + `@21st-ui`
**Tarefas:**

```
Step 1: @impeccable Review current header
- Title/subtitle clarity
- Product selector navigation
- Spacing and alignment
- Mobile behavior

Step 2: @21st-ui Generate modern header alternatives
@21st-ui Create 2-3 modern header designs for a data dashboard 
showing economic indicators. Include:
- Clean title area
- Multi-category navigation (COMBUSTÍVEIS, ALIMENTOS, MERCADOS)
- Product selector that works on mobile
- Optional: breadcrumb or quick-access buttons

Output: Design mockups with code

Step 3: @design-taste-frontend Polish chosen design
- Remove templated feeling
- Add visual refinement
- Ensure brand consistency
```

### 3.2 - Market Indicators Section
**Quando:** Week 3-4
**Skills:** `@design-taste-frontend` + `@impeccable` + `@21st-ui`

```
Current state: 4 indicator cards (Dólar, Selic, Ibovespa, IPCA)
with live quotes shown separately

Problems to solve:
- Too many disparate UI elements
- Live quote positioning not integrated
- Mobile readability of numbers
- Indicator colors inconsistent

Step 1: @design-taste-frontend
What would make these indicators feel premium but data-focused?
- Should we use big numbers (like Bloomberg)?
- Trend indicators (up/down arrows)?
- Sparkline charts?
- Real-time pulse animation?

Step 2: @21st-ui Generate refined indicator designs
@21st-ui Design modern financial indicator cards showing:
- Large current value
- Change from period start
- Trend visualization (mini chart or arrow)
- "Updated X minutes ago" badge
- Works on mobile (stacked vs. grid)

Step 3: Implement with shadcn/ui if available
- Use Card component
- Custom number formatting
- Smooth transitions
```

### 3.3 - Comparison Section (ERA vs AGORA)
**Quando:** Week 4
**Skills:** `@impeccable` + `@improve-animations`

```
Current state: Side-by-side comparison with bars, percentages

Issues:
- Bars sometimes hard to compare visually
- Too much text/numbers on mobile
- Could use animation when switching products

Step 1: @impeccable
- What's the clearest way to show "before → after"?
- Should bars be horizontal or vertical?
- Color coding for up/down?
- Mobile layout strategy?

Step 2: @improve-animations
Add delightful interactions when:
- User switches products
- Bars animate to new values
- Text values transition with numbers
- Mobile tap reveals more detail

Step 3: Implement
- Smoother transitions
- Stagger animations for mobile
- Better color usage (green for up, red for down)
```

### 3.4 - News & Timeline Section
**Quando:** Week 4-5
**Skills:** `@impeccable` + `@design-taste-frontend`

```
Current state: News cards + timeline with event markers

Issues:
- News cards look template-y
- Timeline markers on small screens unclear
- Date formatting inconsistent

Step 1: @impeccable
- How to make news feel fresh, not dated?
- Timeline on mobile - what's the best UX?
- Metadata (source, date) hierarchy?

Step 2: @design-taste-frontend
Make news section feel like premium journalism:
- Better typography for headlines
- Source/date treatment
- Card depth and spacing
- Hover states

Step 3: Implement refinements
- Better visual hierarchy
- Consistent spacing
- Improved mobile layout
```

### 3.5 - Typography & Spacing Refresh
**Quando:** Week 5
**Skills:** `@impeccable` + `@design-taste-frontend`

```
Step 1: @impeccable - Type audit
- Font sizes: are they sufficient?
- Line heights: readable?
- Font weights: hierarchy clear?
- Spacing between elements: consistent grid?

Step 2: @design-taste-frontend
Polish typography:
- Upgrade font if needed (current good?)
- Better type scale (heading sizes)
- Improved line spacing
- Better use of weights for hierarchy

Step 3: Implement
- Update CSS variables
- Test all text on mobile
- Verify contrast ratios
```

---

## Fase 4: POLISH & INTERACTIONS (Semana 5-6)

### 4.1 - Micro-interactions
**Quando:** Week 5
**Skill:** `@improve-animations` + `@review-animations`

```
Where to add motion:
1. Product selector - smooth transitions
2. Comparison bar animations - value changes
3. Number counters - animate from old to new value
4. Hover states - buttons, links, cards
5. Loading states - skeleton screens with pulse
6. Transitions between sections - smooth fade/slide

Step 1: @improve-animations
Where would motion enhance without overwhelming?
- Keep it subtle (150-300ms)
- Consistent easing
- Mobile: reduce motion for performance

Step 2: @review-animations
Review all animations for:
- Consistency
- Performance (60fps)
- Accessibility (respect prefers-reduced-motion)
- Mobile impact
```

### 4.2 - Accessibility Deep Dive
**Quando:** Week 6
**Skill:** `@impeccable` (accessibility focus)

```
@impeccable Run accessibility audit:
1. WCAG AA compliance
2. Color contrast ratios
3. Focus indicators visibility
4. Form labels and error messages
5. Keyboard navigation
6. Screen reader friendliness
7. Mobile touch targets (44x44px minimum)
8. Reduced motion preferences respected

Create checklist of fixes needed
```

### 4.3 - Mobile-First Refinement
**Quando:** Week 6
**Skill:** `@mobile-native` + `@impeccable`

```
@mobile-native Optimize for mobile users:
- Touch-friendly sizes
- Readable at mobile sizes
- Gesture interactions where appropriate
- Bottom navigation for primary actions?
- Tap-to-reveal for more details

Test all interactions on actual devices
```

---

## Fase 5: IMPLEMENTATION (Semana 6-8)

### 5.1 - Convert to shadcn/ui Components
**Quando:** Week 6-7
**Skill:** `@pick-ui-library` (confirm shadcn/ui is right)

```
Step 1: @pick-ui-library
For CUSTAVA QUANTO?, should we use shadcn/ui or keep custom?
- Pros: consistency, accessibility built-in, faster dev
- Cons: need to customize heavily for data viz
- Recommendation?

Step 2: Component-by-component conversion
- Card component
- Button variants
- Badge/tag for indicators
- Accordion for methodology
- Responsive grid system

Step 3: Test with real data
- Ensure responsive at all sizes
- Performance impact?
```

### 5.2 - Code Implementation
**Quando:** Week 7-8

Tasks:
- [ ] Update CSS with new color palette
- [ ] Update typography scales
- [ ] Update spacing/grid system
- [ ] Add transitions/animations
- [ ] Implement new component designs
- [ ] Update responsive breakpoints
- [ ] Test on mobile/tablet/desktop
- [ ] Accessibility testing

---

## Fase 6: REVIEW & REFINEMENT (Semana 8-9)

### 6.1 - Final Visual Review
**Quando:** Week 8
**Skills:** `@impeccable` + `@design-taste-frontend`

```
@impeccable Final design review:
1. Everything feels cohesive?
2. No visual jarring
3. Consistent spacing/sizing
4. Good use of hierarchy
5. Accessibility still 100%?

@design-taste-frontend Make final polish passes
- Any bland spots to enliven?
- Should we be bolder anywhere?
- Final color/contrast check
```

### 6.2 - Performance & Interaction Review
**Quando:** Week 8
**Skills:** `@review-animations`

```
@review-animations Final QA:
- All animations smooth (60fps)?
- Transitions consistent?
- Respects prefers-reduced-motion?
- Mobile performance good?
```

### 6.3 - Cross-browser & Device Testing
**Quando:** Week 9

Test:
- [ ] Chrome, Firefox, Safari, Edge
- [ ] iPhone SE, iPhone 14, iPad, Android
- [ ] Tablet landscape/portrait
- [ ] Desktop (1920px, 1440px)
- [ ] Dark mode (if added)

---

## Skills Usage Matrix

| Skill | Purpose | When | Output |
|-------|---------|------|--------|
| `@impeccable` | Comprehensive audit, design review, accessibility | 1.1, 2.2, 3.x, 6.1 | Scored findings, recommendations |
| `@design-taste-frontend` | Polish, refinement, premium feel | 2.1, 3.x, 6.1 | Design direction, visual polish |
| `@21st-ui` | Rapid prototyping, component generation | 3.1, 3.2 | Design mockups with code |
| `@improve-animations` | Add micro-interactions, motion design | 4.1 | Animation specs, code |
| `@review-animations` | QA animations, performance | 4.1, 6.2 | Animation audit report |
| `@mobile-native` | Mobile UX optimization | 4.3 | Mobile-specific recommendations |
| `@pick-ui-library` | Component library decision | 5.1 | Library recommendation |
| `@minimalist-ui` | Simpler design approach | 2.1 (optional) | Minimalist design direction |

---

## Timeline Overview

```
Week 1-2:   📊 AUDIT
            └─ @impeccable comprehensive review

Week 2-3:   🎨 DIRECTION
            ├─ @design-taste-frontend direction
            └─ @impeccable design tokens

Week 3-5:   🔧 COMPONENTS
            ├─ Header & Navigation
            ├─ Market Indicators
            ├─ Comparison Section
            ├─ News & Timeline
            └─ Typography & Spacing

Week 5-6:   ✨ POLISH
            ├─ @improve-animations micro-interactions
            ├─ @impeccable accessibility
            └─ @mobile-native mobile optimization

Week 6-8:   💻 IMPLEMENTATION
            ├─ Convert to shadcn/ui
            ├─ CSS updates
            ├─ Component development
            └─ Testing

Week 8-9:   🎯 REVIEW
            ├─ Final visual review
            ├─ Animation QA
            └─ Cross-browser testing

┌──────────────────────────────────────┐
│ Total: ~8-9 weeks for full redesign  │
│ Or: Incremental 2-week sprints       │
└──────────────────────────────────────┘
```

---

## Sprint-Based Alternative (Incremental)

If full redesign is too much, do 2-week sprints:

### Sprint 1: Header & Navigation
- Audit header only
- Design new header
- Implement
- Test

### Sprint 2: Market Indicators
- Polish indicator cards
- Add animations
- Responsive refinement

### Sprint 3: Comparison Section
- Redesign comparison view
- Add animations
- Mobile optimization

### Sprint 4: News & Timeline
- Refresh news cards
- Timeline UX improvement
- Accessibility pass

### Sprint 5: Typography & Polish
- System-wide refinements
- Final accessibility
- Cross-browser testing

---

## Success Criteria

✅ **Visual**
- No templated feeling
- Clear visual hierarchy
- Consistent spacing/colors
- Professional appearance

✅ **Functional**
- All existing features work
- Faster perceived performance
- Better mobile experience

✅ **Accessibility**
- WCAG AA compliant
- 100% keyboard navigable
- Screen reader friendly

✅ **Performance**
- 60fps animations
- Mobile-optimized
- Fast load times

---

## Starting Points by Interest

**If you want fast results:** Start with Sprint 1 (Header)
**If you want comprehensive:** Do full 8-week plan
**If you want incremental:** Follow sprint-based approach
**If you want specific area:** Jump to that phase

---

**Next step:** Schedule Week 1 audit with `@impeccable`

Ready to start? Just tag the appropriate skill with the specific task! 🚀
