export const RECIPE_PRINT_STYLES = `
  @media print {
    @page { size: A4; margin: 1.2cm !important; }
    html, body {
      background: white !important;
      color: black !important;
      font-family: Georgia, "Times New Roman", serif !important;
      font-size: 11pt !important;
    }
    body * {
      visibility: hidden !important;
    }
    .recipe-print-root,
    .recipe-print-root * {
      visibility: visible !important;
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
    }
    .recipe-print-root .herbal-pattern,
    .recipe-print-root.herbal-pattern {
      background: white !important;
      background-image: none !important;
    }
    .recipe-print-root .recipe-print-header,
    .recipe-print-root .print\\:hidden,
    .recipe-print-root button,
    .recipe-print-root select,
    .recipe-print-root input,
    .recipe-print-root textarea,
    .recipe-print-root .fixed,
    .recipe-print-root .animate-pulse {
      display: none !important;
    }
    .recipe-print-root .glass-brushed,
    .recipe-print-root section,
    .recipe-print-root .rounded-\\[2\\.5rem\\],
    .recipe-print-root .rounded-3xl,
    .recipe-print-root .rounded-2xl {
      background: transparent !important;
      border: 1px solid #d1d5db !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    .recipe-print-root .text-engraved {
      text-shadow: none !important;
    }
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
    .recipe-print-root h1 {
      font-size: 20pt !important;
      line-height: 1.2 !important;
      margin-bottom: 0.4cm !important;
    }
    .recipe-print-root h2 {
      font-size: 14pt !important;
      margin-top: 0 !important;
      margin-bottom: 0.25cm !important;
      padding-bottom: 0.1cm !important;
      border-bottom: 1px solid #111827 !important;
    }
    .recipe-print-root h3,
    .recipe-print-root h4 {
      font-size: 11pt !important;
      margin-bottom: 0.15cm !important;
    }
    .recipe-print-root p,
    .recipe-print-root li,
    .recipe-print-root span {
      font-size: 10pt !important;
      line-height: 1.45 !important;
    }
    .recipe-print-root .flex,
    .recipe-print-root .grid {
      display: block !important;
    }
    .recipe-print-root .space-y-4 > * + *,
    .recipe-print-root .space-y-6 > * + *,
    .recipe-print-root .space-y-8 > * + *,
    .recipe-print-root .space-y-10 > * + * {
      margin-top: 0.25cm !important;
    }
    .recipe-print-root .mb-10,
    .recipe-print-root .mb-8,
    .recipe-print-root .mb-6,
    .recipe-print-root .mb-4 {
      margin-bottom: 0.3cm !important;
    }
    .recipe-print-root .p-8,
    .recipe-print-root .p-6,
    .recipe-print-root .p-5,
    .recipe-print-root .p-4 {
      padding: 0.3cm !important;
    }
    .recipe-print-root section,
    .recipe-print-root li,
    .recipe-print-root .group {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .recipe-print-root svg {
      display: none !important;
    }
    .recipe-print-root .pb-32 {
      padding-bottom: 0 !important;
    }
  }
`;
