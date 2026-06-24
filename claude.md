# CLAUDE.md — Implentio "Customer Data Intake" Prototype

Context for continuing work on this prototype efficiently. Read this first.

## What this is

A self-contained, **static** HTML prototype of **Implentio's "Customer Data Intake"** onboarding
tool — the workspace an onboarding manager uses to review a customer's parcel/shipping data,
run analyses, raise requests to the customer, and track responses across intake versions.

There is **no backend and no build step**. It's a demo: all "customer responses", "new analyses",
and version creation are **front-end simulations** driven by demo buttons. Open `index.html` in a
browser (or serve the folder statically) and it runs.

## File layout (split for fast, token-cheap edits)

The project used to be one ~4,800-line `index.html`. It's now split so you only load/edit the file
relevant to a change:

- **`index.html`** (~1,690 lines) — markup only: the 5 pages, modals, and `<link>`/`<script>` tags.
- **`assets/styles.css`** (~1,900 lines) — all CSS (the `:root` design tokens live at the top).
- **`assets/js/`** — the JavaScript, split by concern. **Load order is set in `index.html` and matters**
  (see below). All are **classic scripts** (no `type="module"`).

| File | Was inline block | Responsibility |
|------|------------------|----------------|
| `assets/js/intake-setup.js` | 1 | `state`, navigation (`goTo`), link/password generation, file upload flow (Pages 0–2) |
| `assets/js/report-workflow.js` | 2 | Internal Report decision workflow, requests, versions, intake status (Page 3) — **the core** |
| `assets/js/template-view.js` | 3 | View Mode: real data ⇄ template/blueprint |
| `assets/js/findings-triage.js` | 4+5 | finding triage (ignore-with-reason), business impact toggle, section-level request |
| `assets/js/report-card.js` | 6 | customer-facing Report Card (Page 4) |
| `assets/js/init.js` | 7 | `biMore` + `DOMContentLoaded` init (`updateOverview()`) |

### Why the split is safe (don't break it)

The inline blocks shared **one global scope**. External **classic** scripts loaded in order share the
exact same global lexical environment, so cross-file references still work (e.g. `init.js` calls
`updateOverview()` defined in `report-workflow.js`). To preserve this:

- **Never add `type="module"`** to these tags — that would isolate each file's scope and break everything.
- **Keep the load order** in `index.html` (intake-setup → report-workflow → template-view →
  findings-triage → report-card → init). Functions are called at runtime (event handlers / `DOMContentLoaded`),
  so definition order rarely matters, but top-level executing code relies on the order above.
- A symbol defined at top level with `const`/`let` is global and **must be unique across all JS files**
  (re-declaring the same name in another file is a runtime error).

## How to make changes

Files are now small enough to edit directly with the Edit tool — no Python transform scripts needed.

1. Edit the relevant file (`assets/styles.css` for styling, the right `assets/js/*.js` for behavior,
   `index.html` for markup).
2. After editing any JS file, **syntax-check it**: `node --check assets/js/<file>.js`.
   To check all at once: `for f in assets/js/*.js; do node --check "$f" || echo "FAIL $f"; done`.
3. **Surgical edits.** When the user says "do not change anything else," touch nothing else.

### Unicode note

Some strings contain literal backslash-`u` text (e.g. `—`, `→`, `−`) that JS interprets
at runtime; others use the real characters (`—`, `→`, `−`). When matching strings to edit, match the
form actually in the file.

## Page / DOM architecture

- Pages are `.page#page-0 … #page-4`. **`#page-3` (`.container.wide`) is the focus** — the
  Internal Report workspace. `#page-4` is the customer-facing **Report Card** (separate surface,
  has its **own** received/missing file indicators — do not confuse with the intake file model).
- **Tabbed workspace** inside `#page-3`: tab bar `#vtabs` with `.vtab[data-vtab=review|response|customer]`,
  panels `#tab-review` / `#tab-response`(`#resp-root`) / `#tab-customer`(`#cust-root`).
  `switchVTab(name)` toggles them. The "response" tab is **labelled "Requests"** in the UI.
- **Combined dark header** `#ir-overview`: identity, version selector `#intake-version` (v4…v1, +v5
  after a new analysis), intake-status badge `#intake-status`, `#send-close-btn`, `#load-update-btn`
  ("Run new analysis"), request metrics `#req-metrics`, version timeline `#version-timeline`,
  and `#version-summary` (currently **hidden** on the Review tab).
- **Sticky review bar** `#arb-card`: progress + legend + `markAllReviewed()` demo button + collapse/jump.
- **9 analysis cards** `.acard[data-weight]` (`ax-type/join/field/time/eff/comp/dq/qual/ai`), each with
  `.acard-tools` (status badge), `.acard-foot` (rendered by `renderFoot`), and findings.
- **Findings** `.finding[data-source]` carry `data-title/desc/prio/source/eta` and sometimes
  `data-attach`. A subtle "Detected in &lt;file&gt;" line is injected by `annotateFindingSources()`
  using the `SRC_FILES` map (keyed by `data-source`).
- **Client Request Bucket** sidebar `.ir-side` / `#ca-list`, `requests[]` array, `.ca-add` button,
  `#send-client-btn`.

## Core JS model (mostly in `assets/js/report-workflow.js`)

- **Review status:** `reviewed` / `not` only (no ignore, no defer). `statusOf`, `initCards`,
  `renderFoot`, `refreshCard`, `refreshAll`, `markReviewed`, `reopenCard`, `markAllReviewed` (demo).
  "Waiting for customer" is a **counter**, not a status.
- **Intake status:** `computeIntakeStatus()` → `reviewing | ready | awaiting | onboarding` (`IS_META`).
- **Sending:** gated — `#send-close-btn` is disabled until **all 9 analyses reviewed** AND ≥1 request.
  `sendRequestsAndClose()` opens the **`#review-modal` confirmation**; confirm calls `doSend()` →
  sets `intakeSent`, marks requests sent, switches to Requests tab, enters read-only "awaiting" mode
  (`applyAwaiting()` toggles `.awaiting` on `.container.wide`; create-request actions disabled).
- **Requests model `requests[]`** fields: `name, desc, severity, fileRequired, reqType, targetFile,
  fileContext{mode,file}, note, source, analysis, status, sent, batch, sentDate, respStatus, respFile, lastUpdated`.
  - `reqType`: `upload` (Upload missing file) / `replace` (Replace existing file, uses `targetFile`) /
    `clarify` (Provide clarification, no file). Set via the request card's type select (`setReqType`).
  - Two "Create client request" entry points per analysis: per-finding (`createClientRequest`),
    section blank (`createSectionRequest`, in `findings-triage.js`), and **`createAllFindingRequests`**
    (one consolidated request bundling every finding in the block; highest severity, file flag if any
    finding attaches).
- **Customer responses** (`simulateResponses`) statuses: **Done / Acknowledged / Deflected / Pending**.
  - `Done` = file uploaded; `Acknowledged` = clarification confirmed (no file); `Deflected` = couldn't
    provide, with reason. **All customer uploads happen at once** (single submission date).
  - After a response is in, a CTA + header button offer **"Run new analysis"** → confirmation modal
    `#newanalysis-modal` → `doRunNewAnalysis()` → `loadCustomerUpdate()` (creates Version 5, applies
    file lifecycle, reopens analyses).
- **File lifecycle model `FILES[]`** (single source of truth for the Intake Files table):
  fields `name, type, cat, status, introduced, replacedBy?, replaces?`. Statuses: **`active` /
  `replaced`** only. `renderFiles()` builds the table (File name / Category / Status / Introduced /
  Relationship); `renderVersionSummary()` builds the (currently hidden) New / Replaced / Unchanged
  summary. Only **Active** files participate in analysis. On "Run new analysis", fulfilled
  `replace`/`upload` requests update `FILES` (old → replaced + new → active).

## Conventions & preferences (how the user likes to work)

- **Surgical edits.** When the user says "do not change anything else," touch nothing else.
- **Concise prose summaries** after each change — natural prose, minimal formatting, no heavy
  bullet/header walls. Lead with anything important (e.g. a bug found), then what changed.
- **Be honest about what's simulated/simplified** (customer responses, version creation, the fact
  that request sets aren't deeply separated per version).
- Dead/unused code left behind (e.g. `mergeRequest`, `missingFiles`, `toggleFileReq`) is fine and
  intentionally left to reduce churn; don't be alarmed by it.
- The user (Mike, Webfolks) is detail-oriented and iterates fast in distinct rounds. Each round is a
  short list of bullet-point change requests.
