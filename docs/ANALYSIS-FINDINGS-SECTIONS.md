# Analysis Findings Sections — Data & Visualizations

This document describes each of the **9 analysis cards** on the Internal Report workspace
(`#page-3`), focused on the **Findings section** of each card: the data it presents and the
visualization (`.viz`) used to present it.

Every card's **Visualization** has been updated to the chosen variant (explored separately in a
standalone prototype). Every card now reads from **one shared source of data** (see below) instead of
independent per-card demo values.

## Card anatomy (common to all 9)

Every analysis card (`.acard[data-weight]`) has the same scaffold:

- **Header** — score `%` + severity label, analysis title, and meta chips (`Findings` count,
  `Requests` count).
- **Business Impact & Overview** (`.ablock`) — executive summary, business impact, risks, and an
  opportunity gain (`+N%`).
- **Findings** (`.ablock.primary`) — **this document's focus**: one or more **visualizations**
  (`.viz`) followed by the individual `.finding` rows, then the section-level "Create client request".
- **AI Insights** (collapsible) — recommendations separate from the findings.
- **Source Data** — collapsible table of the files the analysis read.

A `.viz` block always opens with a header: `<span class="tag">Viz</span>` + a one-line caption.
The `data-weight` attribute is the card's contribution to the overall intake score.

---

## Shared source data (the one source every card reads)

**Scenario.** A parcel shipper on **UPS / FedEx / USPS / DHL eCom**. **90-day lookback**
(Feb 19 – May 20). **Weekly** invoices (13 billing weeks). One shipment = one invoice row —
**14,892 invoice rows**.

**Carrier × service level** — shipment volume + rate-card status:

| Carrier · service | Shipments | Rate card |
|---|---|---|
| UPS · Ground | 4,812 | ✓ Current |
| UPS · 2nd Day Air | 1,041 | ✓ Current |
| UPS · Next Day Air Saver | 218 | ✓ Current |
| UPS · SurePost | 3,341 | ✗ **Missing** |
| FedEx · Ground | 1,920 | ✓ Current |
| FedEx · Home Delivery | 1,008 | ✓ Current |
| FedEx · SmartPost | 200 | ⚠ **Stale (expired 12/31/25)** |
| USPS · Priority Mail | 1,488 | ✓ Current (effective-date gap) |
| USPS · Ground Advantage | 523 | ✓ Current |
| DHL eCom · SmartMail | 341 | ✗ **Missing** |
| *OnTrac · Zone Jump · GLS* | — | on master list, **not billed** |

**Effective-date coverage (90 days).** UPS · Ground full · USPS · Priority Mail mid-window gap
(~15 days) · FedEx · SmartPost covered early then expired · UPS · SurePost none · DHL eCom · SmartMail none.

**Rate cards on file (for quality).** UPS Ground 2026 (Z2–8, clean) · UPS 2nd Day Air 2026 (clean) ·
**FedEx Ground 2026 (Z2–8, weight-break gap 41–45 lb)** · **USPS Priority Mail 2026 (Z1–9, UOM ambiguous)** ·
USPS Ground Advantage 2026 (clean).

**Join.** Invoice rows 14,892 · support rows 14,758 · key **`tracking_number`** · matched **14,386** ·
invoice-only 506 · support-only 372 · **96.6% joined**. Candidate keys: `tracking_number` 99.1% unique
(chosen) · `order_id` 92.8% (split ships) · `invoice_line_id` (invoice-only).

**Billing weeks.** UPS · Ground 13/13 · FedEx · Ground 13/13 · USPS · Priority Mail 13/13 ·
**DHL eCom · SmartMail 12/13 (missing week of Apr 13).**

**Invoice profile.** Frequency Weekly · Billing type Separate invoice per carrier · Invoice type
Parcel only · Charge type Standard (full detail) · **Carrier structure VCN (labels vary in
capitalization)** · Layout Wide.

**Field schema (Implentio → customer).** Required (10): `tracking_number`, `carrier`, `service_level`,
`ship_date`, `zone`, `billed_weight`, `base_rate`, `fuel_surcharge`, `net_charge` **mapped**;
`destination_zip` **missing**. Strongly preferred (4): `origin_zip`, `accessorial_charges` mapped;
`dim_weight`, `package_dims` **missing**. Optional: `customer_ref` mapped; `residential_flag` **missing**.
Unmapped customer columns available to capture: `entry_facility`, `sort_code`, `manifest_id`,
`pickup_date`, `ref_2`.

**Data-quality issues (of 14,892 rows).**

| Issue | Field | Affected | Severity |
|---|---|---|---|
| Missing billed weight | `billed_weight` | 147 (1.0%) | med |
| Zone `"—"` / null | `zone` | 32 (0.2%) | med |
| Negative net charge (credits un-matched) | `net_charge` | 211 (1.4%) | high |
| Duplicate tracking number | `tracking_number` | 18 (0.1%) | med |
| Service level not in standard list ("GRD") | `service_level` | 312 (2.1%) | high |
| VCN inconsistency (varied capitalization) | `carrier` | 1,840 (12.4%) | med |

Identifier health: rows with tracking **99.1%** · split-ship rate **7.2%** · dup tracking **18** ·
credit lines **211**.

> All values below are these same numbers. **Static demo values** — none are computed at runtime.

---

## 1. Rate Card Effective Date Analysis — `#ax-eff` (weight 18)

**Question:** Do we have pricing *in effect* for every carrier/service on every day of the lookback?

**Visualization — Split day-cells + linked gap table (variant: *Split cells*).** One single-line
strip per carrier/service across the 90-day window (no wrap), each day drawn as a **discrete cell** —
green covered, red gap — under a day scale (`Feb 19 · Mar · Apr · May 20`), with **% covered** at the
right of each strip and an **overall %** in the header. Below the strips, a **Gap list** table
(Carrier · service / Uncovered range / Days / Shipments at risk); combos with several gaps share one
carrier cell (rowspan). Clicking a strip — or a gap row — cross-highlights the match.

| Row | Coverage | Gap |
|-----|----------|-----|
| UPS · Ground | full | — |
| USPS · Priority Mail | covered with a mid-window gap | ~15 days |
| FedEx · SmartPost | early only, then expired | from 12/31/25 |
| UPS · SurePost | none | whole window (no card) |
| DHL eCom · SmartMail | none | whole window (no card) |

**Findings (3):** UPS SurePost & DHL eCom have **no effective card** (3,341 + 341 shipments, critical,
file attach) · FedEx SmartPost card **expired 12/31/25** (200 shipments, −4%, medium) · USPS Priority
Mail effective-date gap mid-window (1,488 shipments exposed, medium).

---

## 2. Rate Card Comprehensiveness Analysis — `#ax-comp` (weight 16)

**Question:** Does a rate card exist for everything that actually appears on the invoices?

**Visualization — Volume roll-up on top + grouped recon table (variant: *Rollup on top*).** Leads with
a **shipment-volume-by-status** stacked bar (OK / Stale / Missing), so the headline risk is read first.
Below it, the reconciliation table with the **carrier merged via rowspan** (no repeats): Service level /
In invoices? (volume) / Rate card? / Status pill. A divider row lists master-list carriers that have
no card and were never billed.

Volume by status: **OK** ≈ 11,010 shipments · **Stale** 200 · **Missing** 3,682 (UPS SurePost 3,341 +
DHL SmartMail 341).

**Findings (2):** UPS SurePost & DHL eCom SmartMail are **invoiced but have no rate card**
(3,341 + 341 shipments, critical, file attach) · FedEx SmartPost is on a **stale 2023 card**
(200 shipments, medium, upload).

---

## 3. Rate Card Quality Analysis — `#ax-qual` (weight 14)

**Question:** Are the rate cards we *do* have complete and unambiguous (zones, weight breaks, units)?

**Visualization — Per-card summary table + switchable zone×weight detail (variant: *Per-card scan*).**
A **summary table** scans every rate card on file — Rate card / Zones present / Weight breaks /
UOM stated? / **Verdict** pill (Clean / Weight gap / UOM unclear), with the driving cell bolded and a
warm tint on flagged rows. Below it, a **switchable Zone×Weight detail matrix** for one card at a time
(pick via the selector buttons or by clicking a summary row), with a coverage / UOM strip above the grid.

| Rate card | Zones | Weight breaks | UOM | Verdict |
|---|---|---|---|---|
| UPS Ground 2026 | 2–8 ✓ | 1–70 lb continuous | Yes (lb) | Clean |
| UPS 2nd Day Air 2026 | 2–8 ✓ | 1–70 lb continuous | Yes (lb) | Clean |
| FedEx Ground 2026 | 2–8 ✓ | **Gap 41–45 lb** | Yes (lb) | **Weight gap** |
| USPS Priority Mail 2026 | 1–9 ✓ | Flat-rate + per-lb | **Ambiguous** | **UOM unclear** |
| USPS Ground Advantage 2026 | 1–9 ✓ | oz <1lb, lb above | Mixed (labeled) | Clean |

**Findings (3):** FedEx Ground card has a **weight-break gap at 41–45 lb** (high) · USPS Priority Mail
card has an **ambiguous unit of measure** (medium, clarify) · zone 1 not present on the UPS/FedEx 2–8
cards — confirm it is never billed (low).

---

## 4. Invoice & Support File Join Analysis — `#ax-join` (weight 12)

**Question:** Can invoice rows be joined to the support file on a shared key?

**Visualization — Verdict block (variant: *Verdict*).** A large **96.6% match rate** on
`tracking_number`, a segmented **fallout bar** (14,386 matched / 506 invoice-only / 372 support-only),
and a **candidate-key table** showing why the key was chosen:

| Candidate key | Uniqueness | Match rate | Verdict |
|---|---|---|---|
| `tracking_number` | 99.1% | 96.6% | chosen |
| `order_id` | 92.8% | 89.4% | split ships |
| `invoice_line_id` | 100% | — | invoice-only |

**Findings (2):** **506 invoice rows** can't be matched to the support file (~3.4%, medium) ·
`order_id` is only 92.8% unique due to split shipments — `tracking_number` chosen as the join key
(low, clarify).

---

## 5. Invoice Time-Period Analysis — `#ax-time` (weight 14)

**Question:** Is invoice coverage complete across every billing week of the lookback?

**Visualization — Carrier × billing-week heatmap (variant: *Heatmap*).** A grid with carrier billing
cadence as rows and the 13 billing weeks as columns; each cell is present (✓) or missing (✗). The single
missing cell surfaces the partial gap that a "13/13 overall" total would hide.

| | …Apr 13… |
|--|--|
| UPS · Ground | ✓ (13/13) |
| FedEx · Ground | ✓ (13/13) |
| USPS · Priority Mail | ✓ (13/13) |
| DHL eCom · SmartMail | **✗** (12/13) |

**Findings (2):** Missing **DHL eCom invoice — week of Apr 13** (high, upload) · Confirm weekly billing
cadence (low, clarify).

---

## 6. Invoice Type Analysis — `#ax-type` (weight 8)

**Question:** What is the structure/shape of the invoice we received?

**Visualization — Spec panel (variant: *Spec panel*).** A labeled key/value list of detected
structural attributes, each with a **confidence pill** (no chart — inferred metadata):

| Attribute | Detected | Confidence |
|-----------|----------|-----------|
| Frequency | Weekly | high |
| Billing type | Separate invoice per carrier | high |
| Invoice type | Parcel only | med |
| Charge type | Standard (full detail) | high |
| Carrier structure | **VCN (virtual carrier network)** | med |
| Layout | Wide (Promix-style) | low |

**Findings (1):** Invoice uses a **VCN whose carrier labels vary in capitalization** — confirm the
canonical carrier names (medium, clarify). *(This drives the 1,840-row VCN issue in card 8.)*

---

## 7. Invoice Field Analysis — `#ax-field` (weight 12)

**Question:** Are the required/preferred invoice fields present and mapped?

**Visualization — Field mapping table (variant: *Field Mapping*).** An onboarding-style table —
**Implentio field → Customer field → Status → Mapping action** — grouped by tier. Mapped fields show
the customer column + an Available pill + a `↻ Remap` link; missing fields show *"— not in invoice"*,
a Missing pill, a warm row tint, and a `+ Map` button.

- **Required · 9 of 10 mapped** — `tracking_number`…`net_charge` mapped; **`destination_zip` missing**.
- **Strongly preferred · 2 of 4 mapped** — `origin_zip`, `accessorial_charges` mapped;
  **`dim_weight`, `package_dims` missing**.
- **Optional** — `customer_ref` mapped; `residential_flag` missing. Unmapped customer columns available
  to capture: `entry_facility`, `sort_code`, `manifest_id`, `pickup_date`, `ref_2`.

**Findings (2):** Required field **`destination_zip` not in invoice** — also `dim_weight`,
`package_dims`, `residential_flag` missing, which blocks DAS/EAS, dim-weight and residential audits
(high) · 5 unmapped customer columns available to capture (low, opportunity).

---

## 8. Invoice Data Quality Analysis — `#ax-dq` (weight 16)

**Question:** How clean is the invoice data (blanks, formatting, duplicates)?

**Visualization — Quality scan (variant: *Quality scan*).** A flat issue list — Issue / Affected rows
(count + %) / a **good-vs-affected bar** (green good, red affected of all 14,892 rows) / Severity —
sorted by affected rows, with HIGH rows tinted. Below it, **unique-identifier & split-ship tiles** and a
split-ship footnote.

| Issue | Affected | Severity |
|---|---|---|
| VCN inconsistency (varied capitalization) | 1,840 (12.4%) | med |
| `service_level` not in standard list ("GRD") | 312 (2.1%) | high |
| Negative `net_charge` (credits un-matched) | 211 (1.4%) | high |
| Missing `billed_weight` | 147 (1.0%) | med |
| Zone `"—"` / null | 32 (0.2%) | med |
| Duplicate `tracking_number` | 18 (0.1%) | med |

Tiles: Rows with tracking **99.1%** · Split-ship rate **7.2%** · Dup tracking **18** · Credit lines **211**.

**Findings (4):** **Negative `net_charge` / un-matched credits** — 211 rows (high) · **`service_level`
not in standard list** — 312 rows (high) · **VCN capitalization inconsistency** — 1,840 rows (medium) ·
Missing `billed_weight` (147), null `zone` (32) and duplicate tracking (18) (low).

---

## 9. AI / Claude Analysis — `#ax-ai` (weight 0)

**Question:** What do the eight structured analyses look like *together*? (cross-analysis synthesis)

**Visualization — Unstructured cross-analysis review (`.viz` → `.ai-narrative`, tagged `AI` not
`Viz`).** A prose narrative rather than a chart: identifies **two root causes** that cascade across
multiple analyses — (1) the two **missing rate cards** (UPS SurePost 3,341 + DHL SmartMail 341) plus the
**Apr-13 DHL invoice week**; (2) the **VCN capitalization inconsistency** (1,840 rows) plus the
**non-standard `service_level` values** (312 rows) — and projects the overall intake lifting from
**73% → ~88%** once resolved.

**Findings (3), all cross-analysis:** Missing rate cards are the dominant blocker — span Effective Date
(1), Comprehensiveness (2) and Time-Period (5); bundle into one request set · VCN + `service_level`
naming cascades into Type (6) and Data Quality (8) — one standardized re-export clears both · Projected
**+15%** from the two consolidated fixes (low, internal note).

> Weight 0 — this card synthesizes the others and does not contribute its own points to the score.

---

## Visualization type reference

| Viz pattern (variant) | Reference hooks | Used by |
|-------------|----------|---------|
| Split day-cells + linked gap table (*Split cells*) | `.dayrow` / `.daycells i.have`·`.gap` + gap `<table>` | Effective Date (1) |
| Volume roll-up + grouped recon table (*Rollup on top*) | `.statusbar` + grouped `<table>` (`.grp-cell` rowspan) | Comprehensiveness (2) |
| Summary table + switchable zone×weight matrix (*Per-card scan*) | `.scan-row` / `.scan-sel` / `.zgrid` | Quality (3) |
| Verdict: match-rate + fallout bar + key table (*Verdict*) | `.join-dial` / `.join-stack` / candidate-key `<table>` | Join (4) |
| Carrier × week coverage heatmap (*Heatmap*) | `.hm` / `.y`·`.n` | Time-Period (5) |
| Key/value spec panel + confidence (*Spec panel*) | `.spec` + confidence pills | Type (6) |
| Field-mapping table (*Field Mapping*) | `.map-grp` / `.mono` / `.map-btn`·`.remap` | Field (7) |
| Flat issue scan + good/affected bar + tiles (*Quality scan*) | issue `<table>` / `.qbar` / `.qs-tiles` | Data Quality (8) |
| Prose narrative | `.ai-narrative` | AI (9) |

All visualization markup lives in [index.html](../index.html); the new patterns are styled in
[assets/styles.css](../assets/styles.css) and the two interactive ones (Effective Date strips, Quality
per-card scan) are driven by [assets/js/analysis-viz.js](../assets/js/analysis-viz.js). These are
**static demo values** — none of the numbers are computed at runtime.
