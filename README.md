# n8n-nodes-scala

![n8n community node](https://img.shields.io/badge/n8n-community%20node-ff6d5a)
![License](https://img.shields.io/badge/license-MIT-blue)
![Companies](https://img.shields.io/badge/companies-244M%2B-green)

**n8n community node for [S.C.A.L.A. AI OS](https://get-scala.com)** — the enterprise AI operating system for B2B automation.

This node lets you connect your n8n workflows to:

- **Score API** — Search 244M+ companies across 40+ countries. Financial data, risk scores, industry codes, revenue estimates.
- **CRM** — Full contact lifecycle: create, update, pipeline, kanban, email, timeline.
- **Data Tables** — Generic CRUD on any S.C.A.L.A. table (contacts, tickets, assets, invoices, orders…).
- **Webhooks** — Real-time events: new contact, WhatsApp message, order created, and more.

## Installation

### Community Nodes (recommended)

1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install a community node**
3. Enter `n8n-nodes-scala`
4. Click **Install**

### Manual

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-scala
# Restart n8n
```

## Nodes

### S.C.A.L.A. Score

Search and enrich company data from 244M+ businesses worldwide.

| Operation | Description | Credits |
|-----------|-------------|---------|
| Search Companies | Search by name, VAT, keyword. Filter by country, NACE code, status | 1 |
| Lookup Company | Get full company details by ID or VAT number | 1 |
| Generate Report | Full company health report (Basic/Pro/Enterprise) | 5/10/20 |
| Get Countries | List available countries with company counts | 0 |
| Get Stats | Database statistics | 0 |
| Check Credits | Your remaining API credits | 0 |

### S.C.A.L.A. CRM

Manage your entire customer lifecycle from n8n.

| Resource | Operations |
|----------|-----------|
| Contact | Get All, Create, Update, Delete, Timeline, Send Email |
| Pipeline | Get stages, Kanban view |
| Ticket | Get All, Create, Update |
| Data Table | Generic CRUD on any table |
| Webhook | Create, Delete, Test, List |

## Credentials

### Score API

1. Sign up at [app.get-scala.com](https://app.get-scala.com)
2. Go to **Score > API**
3. Generate an API key
4. Paste it in the n8n credential

### CRM API

1. Go to **Settings > API** in your S.C.A.L.A. dashboard
2. Generate an API token
3. Paste it in the n8n credential

## Example Workflows

### Lead enrichment pipeline

```
Webhook trigger → SCALA Score: Search → Filter → SCALA CRM: Create Contact → Slack notification
```

Incoming lead from your website → automatically enrich with company data from 244M+ database → add to CRM with financial score → notify your sales team.

### WhatsApp order automation

```
SCALA Webhook (order.created) → SCALA CRM: Update Contact → Google Sheets → Email notification
```

When a customer places an order via WhatsApp AI (SARA), automatically update CRM, log to spreadsheet, and send confirmation.

### Company monitoring

```
Schedule trigger → SCALA Score: Search (by NACE) → SCALA Score: Lookup → Filter (revenue change) → Email
```

Daily check on competitors or target companies — get alerts when financial data changes.

## Pricing

| Plan | Price | Credits/mo |
|------|-------|-----------|
| Starter | €19/mo | 500 |
| Growth | €49/mo | 5,000 |
| Enterprise | €149/mo | 50,000 |

Self-hosted n8n + S.C.A.L.A. Score API = unlimited automation at a fraction of the cost of Dun & Bradstreet, Bureau van Dijk, or ZoomInfo.

## Links

- [S.C.A.L.A. AI OS](https://get-scala.com)
- [Score API Docs](https://app.get-scala.com/api/docs/ui)
- [GitHub](https://github.com/Alessandro114/n8n-nodes-scala)

## License

MIT
