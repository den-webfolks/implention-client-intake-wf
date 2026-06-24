// Block 6: customer-facing Report Card (Page 4)
  // ===== Report Card (the CLIENT version of the shared customer experience) =====
  // RC_GROUPS / RC_FILES are the analysis + file data source that
  // buildDraftPackage() (in report-workflow.js) folds into the shared package.
  const RC_GROUPS = [
    { label: 'File structure & compatibility — Can we use the files?', items: [
      { name: 'Invoice Type', q: 'What billing structure do you use?', score: 92,
        expl: 'Your invoices were read cleanly — weekly billing on a single combined invoice. No action needed.' },
      { name: 'Record Matching', q: 'Can invoice and support records be matched?', score: 77,
        expl: 'Most records matched, but about a quarter of invoice rows had no shared identifier with the support file. A common reference such as a tracking number would let us match everything.' },
      { name: 'Field Mapping', q: 'Are the required fields present?', score: 80,
        expl: 'Nearly all required fields were found. The service-level field is missing and is needed to match each charge to the correct rate.' },
    ]},
    { label: 'Coverage — Do we have enough information?', items: [
      { name: 'Invoice Coverage', q: 'Do invoices cover the full period?', score: 71,
        expl: 'Invoices cover almost the entire 90-day window. One DHL billing week (Apr 13) is missing.' },
      { name: 'Rate Card Coverage', q: 'Is pricing available for the whole period?', score: 68,
        expl: 'Pricing is in place for most of the period, but there are date gaps for DHL and FedEx. Charges during those gaps cannot be validated yet.' },
      { name: 'Pricing Completeness', q: 'Is there pricing for every service billed?', score: 74,
        expl: 'Most billed services have matching pricing. A DHL service and a FedEx variant appear on invoices without a corresponding rate card.' },
    ]},
    { label: 'Data quality — Can we trust the data?', items: [
      { name: 'Data Quality', q: 'Are the data values reliable?', score: 62,
        expl: 'Some required values are missing (about 1 in 10 rows lack a carrier) and many tracking numbers were exported in scientific notation. A clean re-export would resolve this.' },
      { name: 'Rate Card Quality', q: 'Is the pricing data complete?', score: 52,
        expl: 'Several rate cards are missing zones, weight ranges, or a stated unit of measure, so some charges cannot be validated until they are completed.' },
    ]},
  ];
  const RC_FILES = [
    { file: 'UPS Rate Card', cat: 'Pricing', status: 'received' },
    { file: 'FedEx Rate Card', cat: 'Pricing', status: 'received' },
    { file: 'USPS Rate Card', cat: 'Pricing', status: 'received' },
    { file: 'Invoice Export (January)', cat: 'Billing', status: 'received' },
    { file: 'Support File', cat: 'Supplemental', status: 'received' },
    { file: 'Carrier List', cat: 'Reference', status: 'received' },
    { file: 'DHL Rate Card', cat: 'Pricing', status: 'missing' },
    { file: 'Accessorial Charges Schedule', cat: 'Pricing', status: 'optional' },
    { file: 'Product / SKU Master', cat: 'Reference', status: 'optional' },
  ];

  // The client Report Card is the SAME customer experience as the manager's
  // Customer Package / preview — rendered read-only from the shared package.
  function renderReportCard() {
    const root = document.getElementById('rc-doc'); if (!root) return;
    if (typeof customerExperienceHTML !== 'function' || typeof buildDraftPackage !== 'function') return;
    // Prefer the official sent snapshot; fall back to the live draft so the demo
    // page stays populated before anything has been sent.
    const sent = (typeof sentPackage !== 'undefined') ? sentPackage : null;
    const pkg = sent || buildDraftPackage();
    root.innerHTML = customerExperienceHTML(pkg, { audience: 'client', editable: false, live: !!sent });
  }

  document.addEventListener('DOMContentLoaded', renderReportCard);
  document.querySelectorAll('.step-btn[data-step="4"]').forEach(b => b.addEventListener('click', () => setTimeout(renderReportCard, 0)));
