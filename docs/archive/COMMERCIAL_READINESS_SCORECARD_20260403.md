# Commercial Readiness Scorecard - FleetPro Web

Date: 2026-04-03
Owner view: Project/Business decision layer
Scope: Current production and release pipeline evidence in repository

## 1) Executive Verdict
- Verdict for full commercial scale: SOFT GO (pilot thu phi co kiem soat)
- Verdict for unlimited scale-up: NO GO (chua du du lieu thuong mai va SLA van hanh 30 ngay)

Reasoning:
- Ky thuat va UX mobile da dat muc release-ready cho pilot.
- Van hanh 4 vai tro da co flow thuc chien va audit trail.
- Nhung chua co bo so lieu thuong mai thuc (CAC/LTV/churn/retention tra phi) de ket luan scale rong.

## 2) Evidence Snapshot (what is already proven)

### 2.1 Product/UX execution evidence
- Mobile UI audit: 4 PASS / 0 WARN / 0 FAIL
- Source: docs/QA_MOBILE_UI_AUDIT_20260403.md

- Mobile menu detailed audit: 45 PASS / 0 WARN / 0 FAIL
- Source: docs/QA_MOBILE_MENU_DETAILED_AUDIT_20260403.md

- 4-role practical operation pipeline documented
- Source: docs/WOA_REAL_WORLD_4_ROLE_PIPELINE.md

### 2.2 Operational controls implemented
- Unified timeline logs page (Audit + Ops + Alert + GPS): implemented
- Ops events persisted to Firestore and sent to Telegram: implemented
- Driver precheck checklist + media gate before start trip: implemented
- Driver draft-order flow with management + Telegram notify: implemented

### 2.3 Deployment/release hygiene
- Core features committed and pushed to main
- Release polish committed and pushed to main
- Production endpoint checks and QA scripts executed in recent run history

## 3) Readiness Scoring (0-100)

Scoring model:
- Technical reliability: 25
- Security and compliance baseline: 20
- Operations and support readiness: 20
- Commercial traction and unit economics: 25
- Product adoption and retention signals: 10

### 3.1 Technical reliability (20/25)
Pass:
- Build/lint/typecheck and QA automation are passing in current cycle
- Mobile UX and menu stability have strong evidence

Gap:
- Chua co uptime trend 30 ngay (99.9%) co dashboard/chung tu
- Chua thay stress/load validation artifacts

### 3.2 Security/compliance baseline (14/20)
Pass:
- RBAC and audit traces exist
- Sensitive helper file already ignored from git

Gap:
- Chua co checklist bao mat/pen-test report formal
- Secret rotation and incident drill evidence chua du tai lieu

### 3.3 Operations/support readiness (17/20)
Pass:
- 4-role SOP practical flow exists
- Telegram real-time operational channel integrated
- Logs centralized enough for day-to-day operations

Gap:
- Chua co SLA report va support response metric thuc 2-4 tuan

### 3.4 Commercial traction and unit economics (5/25)
Pass:
- Payment integration paths are present

Gap:
- Chua co so lieu khach hang tra phi that
- Chua co CAC/LTV/payback/churn thuong mai

### 3.5 Adoption and retention signals (4/10)
Pass:
- Role workflows and UX are clear

Gap:
- Chua co activation/retention cohort report (D7, D30)

## Total score: 60/100
Decision band:
- >= 75: GO scale
- 60-74: SOFT GO pilot thu phi co kiem soat
- < 60: NO GO

Current result: SOFT GO

## 4) Go/No-Go Gates

### Gate A - Must-pass before any paid pilot (status: PASS)
- No critical P0/P1 known open blockers
- Mobile workflow stability for key roles
- Basic audit logging and operational traceability

### Gate B - Must-pass before scale beyond pilot (status: FAIL for now)
- 3+ paying customers with real usage >= 30 days
- Retention and churn dashboard available
- Unit economics baseline available (CAC, LTV, payback)
- Support SLA measured with real tickets

## 5) 14-day Practical Plan to move from SOFT GO to GO

### Day 1-3: Instrumentation for business truth
- Add event tracking dashboard for:
  - signup -> activation
  - order created -> dispatched -> completed -> reconciled
  - payment success/fail and refund
- Export daily KPI sheet (free): Google Sheets + Looker Studio

### Day 4-7: Paid pilot with 3 design partners
- Onboard 3 paying pilot customers (small fee but real payment)
- Freeze scope, only fix blockers
- Daily ops review using logs + Telegram + KPI board

### Day 8-10: Economics and retention checkpoint
- Compute:
  - activation rate
  - weekly retention
  - pilot churn signal
  - support response SLA
- Build one-page decision dashboard

### Day 11-14: Commercial decision meeting
- If score >= 75 and no red flags: GO scale
- If score 60-74: extend pilot with strict improvement objectives
- If < 60: stop marketing scale, focus stabilization

## 6) Minimal KPI Dashboard (owner level)
- Reliability:
  - Uptime 30d
  - Crash-free sessions
- Operations:
  - Dispatch confirmation under 3 minutes
  - Driver precheck completion rate
  - Reconciliation completion within 24h
- Commercial:
  - New paid customers/week
  - MRR
  - Gross churn
  - CAC payback estimate
- Customer success:
  - Time-to-onboard
  - First-value time
  - Support first response time

## 7) Final Owner Decision Today
- You can sell now as controlled paid pilot.
- You should not scale advertising/sales aggressively yet.
- Trigger full commercial scale only after Gate B is passed with real 30-day business metrics.
