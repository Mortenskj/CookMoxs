export const RECIPE_PRINT_STYLES = `
  @media print {
    @page { size: A4 portrait; margin: 1.2cm 1.2cm 0.8cm 1.2cm; }

    /* Hide everything except recipe */
    body * { visibility: hidden; }
    .recipe-print-root,
    .recipe-print-root * { visibility: visible; }

    html, body {
      background: white !important;
      color: black !important;
      font-family: Georgia, "Times New Roman", serif !important;
      font-size: 8.5pt !important;
      line-height: 1.35 !important;
    }

    .recipe-print-root {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: black !important;
      display: grid !important;
      grid-template-columns: 1fr 1.5fr !important;
      grid-template-rows: auto 1fr !important;
      grid-template-areas:
        "title title"
        "ingredients steps" !important;
      gap: 0 0.8cm !important;
      align-content: start !important;
    }

    /* Hide UI chrome */
    .recipe-print-root .recipe-print-header,
    .recipe-print-root .print\\:hidden,
    .recipe-print-root button,
    .recipe-print-root select,
    .recipe-print-root input,
    .recipe-print-root textarea,
    .recipe-print-root .fixed,
    .recipe-print-root .animate-pulse,
    .recipe-print-root .cm-recipe-sticky-clearance,
    .recipe-print-root nav,
    .recipe-print-root .print-guides {
      display: none !important;
    }

    /* Strip decorative styles */
    .recipe-print-root .glass-brushed,
    .recipe-print-root .glass-brushed::before,
    .recipe-print-root .herbal-pattern,
    .recipe-print-root .bg-noise {
      background: transparent !important;
      background-image: none !important;
      backdrop-filter: none !important;
    }
    .recipe-print-root .text-engraved {
      text-shadow: none !important;
    }

    /* Reset containers */
    .recipe-print-root section,
    .recipe-print-root .glass-brushed {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Force black text */
    .recipe-print-root h1,
    .recipe-print-root h2,
    .recipe-print-root h3,
    .recipe-print-root h4,
    .recipe-print-root p,
    .recipe-print-root li,
    .recipe-print-root span {
      color: black !important;
      opacity: 1 !important;
    }

    /* Hide icons */
    .recipe-print-root svg {
      display: none !important;
    }

    /* === TITLE AREA (spans both columns, compact) === */
    .recipe-print-root .print-meta {
      grid-area: title !important;
      margin: 0 0 0.2cm 0 !important;
      padding: 0 0 0.15cm 0 !important;
      border-bottom: 1.5pt solid black !important;
    }
    .recipe-print-root .print-meta .glass-brushed {
      padding: 0 !important;
    }
    .recipe-print-root .print-meta h1 {
      font-size: 18pt !important;
      line-height: 1.1 !important;
      margin-bottom: 0 !important;
      font-style: italic !important;
    }
    /* Show CookMoxs byline in print */
    .recipe-print-root .print-byline {
      display: inline !important;
      visibility: visible !important;
      font-size: 7pt !important;
      font-style: italic !important;
      color: #999 !important;
      margin: 0 !important;
    }
    .recipe-print-root .print-byline::before {
      content: '\\00A9 ' !important;
    }
    /* Summary */
    .recipe-print-root .print-summary {
      font-size: 8pt !important;
      font-style: italic !important;
      color: #555 !important;
      margin: 0.05cm 0 0 0 !important;
    }
    .recipe-print-root .print-meta p:not(.print-byline):not(.print-summary) {
      display: none !important;
    }
    .recipe-print-root .print-meta .space-y-6 > * + * {
      margin-top: 0 !important;
    }
    .recipe-print-root .print-meta .mb-8 {
      margin-bottom: 0 !important;
    }
    /* Hide chips, ownership, utility, notes, status messages in title area */
    .recipe-print-root .print-meta .cm-recipe-chip-row,
    .recipe-print-root .print-meta .cm-recipe-meta-block,
    .recipe-print-root .print-meta .cm-recipe-private-row,
    .recipe-print-root .print-meta .cm-recipe-utility-row,
    .recipe-print-root .print-meta .cm-recipe-ai-shell,
    .recipe-print-root .print-meta .cm-recipe-inline-status,
    .recipe-print-root .print-meta .cm-surface-secondary,
    .recipe-print-root .print-meta span[class*="bg-heath-mid"] {
      display: none !important;
    }

    /* === INGREDIENTS (left column) === */
    .recipe-print-root .print-ingredients {
      grid-area: ingredients !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .recipe-print-root .print-ingredients h2 {
      font-size: 9pt !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 0.15cm !important;
      padding-bottom: 0.08cm !important;
      border-bottom: 0.5pt solid #ccc !important;
    }
    .recipe-print-root .print-ingredients h3 {
      font-size: 7.5pt !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      margin-top: 0.15cm !important;
      margin-bottom: 0.05cm !important;
      color: #555 !important;
    }
    /* Ingredient rows */
    .recipe-print-root .cm-recipe-ingredient-row {
      display: block !important;
      padding: 0.02cm 0 !important;
      line-height: 1.3 !important;
    }
    .recipe-print-root .cm-recipe-ingredient-amount {
      font-weight: normal !important;
      font-size: 8.5pt !important;
      display: inline !important;
      text-align: left !important;
    }
    .recipe-print-root .cm-recipe-ingredient-name {
      font-size: 8.5pt !important;
      display: inline !important;
    }
    .recipe-print-root .cm-recipe-ingredient-amount::after {
      content: ' ' !important;
    }
    /* Unmeasured ingredients */
    .recipe-print-root .print-ingredients ul {
      list-style: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .recipe-print-root .print-ingredients .space-y-0 > * + * {
      margin-top: 0 !important;
    }
    .recipe-print-root .print-ingredients .space-y-2 > * + * {
      margin-top: 0.08cm !important;
    }
    .recipe-print-root .print-ingredients .space-y-8 > * + * {
      margin-top: 0.1cm !important;
    }
    /* Hide scaler, add button etc */
    .recipe-print-root .print-ingredients .cm-surface-utility {
      display: none !important;
    }
    .recipe-print-root .print-ingredients .flex-col.gap-4 {
      display: block !important;
    }
    /* Divider line in group headers */
    .recipe-print-root .print-ingredients .h-px {
      display: none !important;
    }

    /* === STEPS (right column) === */
    .recipe-print-root .print-steps {
      grid-area: steps !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .recipe-print-root .print-steps h2 {
      font-size: 9pt !important;
      font-weight: bold !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 0.15cm !important;
      padding-bottom: 0.08cm !important;
      border-bottom: 0.5pt solid #ccc !important;
    }
    .recipe-print-root .print-steps p.text-sm {
      display: none !important;
    }
    /* Step layout — compact inline */
    .recipe-print-root .print-steps .space-y-10 > * + * {
      margin-top: 0.12cm !important;
    }
    .recipe-print-root .print-steps .flex.gap-6.group {
      display: block !important;
      margin-bottom: 0.1cm !important;
    }
    .recipe-print-root .print-steps .w-10.h-10.rounded-full {
      display: inline !important;
      width: auto !important;
      height: auto !important;
      background: transparent !important;
      color: black !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      font-size: 8.5pt !important;
      font-weight: bold !important;
      padding: 0 !important;
      margin: 0 0.1cm 0 0 !important;
      min-width: 0 !important;
    }
    /* Step number separator */
    .recipe-print-root .print-steps .w-10.h-10.rounded-full::after {
      content: '.' !important;
    }
    /* Step text */
    .recipe-print-root .print-steps .flex-1.space-y-3 {
      display: inline !important;
    }
    .recipe-print-root .print-steps .flex-1.space-y-3 > * + * {
      margin-top: 0.03cm !important;
    }
    .recipe-print-root .print-steps .flex-1.space-y-3 p {
      display: inline !important;
      font-size: 8.5pt !important;
    }
    /* Heat/timer chips */
    .recipe-print-root .print-steps .flex.flex-wrap.gap-2 {
      display: none !important;
    }
    /* Reminders — compact inline */
    .recipe-print-root .print-steps [class*="bg-\\[\\#E5A93B"] {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      display: inline !important;
    }
    .recipe-print-root .print-steps [class*="bg-\\[\\#E5A93B"] p {
      display: inline !important;
      font-style: italic !important;
    }
    .recipe-print-root .print-steps [class*="bg-\\[\\#E5A93B"] p::before {
      content: ' — ' !important;
      font-style: normal !important;
    }
    .recipe-print-root .print-steps [class*="bg-\\[\\#E5A93B"] span {
      display: none !important;
    }
    .recipe-print-root .print-steps [class*="bg-\\[\\#E5A93B"] div[class*="rounded-full"] {
      display: none !important;
    }
    .recipe-print-root .print-steps .space-y-8 > * + * {
      margin-top: 0.06cm !important;
    }

    /* Hide everything else in print */
    .recipe-print-root > *:not(.print-meta):not(.print-ingredients):not(.print-steps) {
      display: none !important;
    }

    /* Avoid page break between title and content */
    .recipe-print-root .print-meta {
      page-break-after: avoid !important;
    }

    /* Allow page breaks within columns but avoid orphans */
    .recipe-print-root p {
      orphans: 2 !important;
      widows: 2 !important;
    }
  }
`;
