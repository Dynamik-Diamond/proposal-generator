# DESIGN.md — Proposal Generator

## Brief
- Purpose / primary action: owner → generate, edit and send a proposal. Client → read, sign, pay.
- Audience: freelancers/agency owners (dashboard); their prospective clients (public proposal page).
- Tone (3 adjectives): assured, warm, considered.
- Aesthetic direction: **editorial / print**, like a well-set consulting document on good paper.
- References: none supplied; this is an original default template.
- What makes this different from competitors: PandaDoc-style tools look like SaaS forms. This one reads like a
  printed letter. It uses a serif display face, hairline rules instead of cards, generous margins, and a single deep accent.

## Typography
- Display: Fraunces (variable, opsz), weights 300 and 600. Used for headings, the cover title and large figures.
- Body: Manrope, weights 400, 500 and 700.
- Mono: none.
- Scale (px): 13 / 15 / 18 / 22 / 28 / 40 / 56 / 88 (cover title uses `clamp(2.75rem, 7vw, 5.5rem)`).
- Proposal body text is 18px, line-height 1.7, with a max width of 65ch. The dashboard uses 15px body text.

## Color (CSS variables, in `app/globals.css`)
--paper: #F6F2EA (page background)
--surface: #FBF8F2 (raised areas: inputs, table header)
--ink: #1C1A17 (text)
--ink-muted: #5E574D (secondary text, 6.4:1 on paper)
--rule: #DDD5C7 (hairlines and borders)
--accent: #2F5D46 (forest, the default; profile can switch to oxblood #7A2E2A or ink-blue #24406B)
--accent-contrast: #F6F2EA

Status colours (dashboard badges only): draft = muted, sent = ink-blue, viewed = ochre #8A5A0B,
signed = forest, paid = solid forest, expired = oxblood.

Dark mode applies to the dashboard only, through prefers-color-scheme. The public proposal page is always "paper".

## Spacing, radius, shadow
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128.
- Radius: 4px everywhere (`--radius: 0.25rem`). The only exception is the celebration check mark, which is a circle.
- Shadow: none in the document. One soft shadow on the sticky mobile sign bar and on the success dialog.

## Motion
- 180ms ease-out (`cubic-bezier(.2,.7,.2,1)`) for UI feedback. Section reveals use 600ms with a stagger.
- Signature moment: after payment, confetti in the accent and paper colours fires from both sides, a check mark
  draws its stroke, and the headline rises in. With `prefers-reduced-motion`, this becomes a fade only with no confetti.

## Components & rules
- Buttons: solid accent for the primary action and a hairline outline for secondary actions. Both are 44px tall on the public page.
- Cards: none in the document. Sections are separated by full-width hairlines and a small section number in the margin.
- Pricing: a real table with tabular numerals, and the total in Fraunces at 40–56px.
- Never: gradients, emoji, pill badges above headings, three-up icon cards, invented testimonials or stats.
