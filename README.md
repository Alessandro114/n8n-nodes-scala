# n8n-nodes-scala

![n8n community node](https://img.shields.io/badge/n8n-community%20node-ff6d5a)
![License](https://img.shields.io/badge/license-MIT-blue)

**n8n community nodes for [S.C.A.L.A.](https://get-scala.com)**: company data from the Score API v1, plus a CRM node for the S.C.A.L.A. platform. No runtime dependencies.

## Installation

**Settings > Community Nodes > Install**, enter `n8n-nodes-scala`. Or manually:

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-scala
# restart n8n
```

## S.C.A.L.A. Score node

Calls `https://score.get-scala.com/api/v1/*` with your key in the `X-API-Key` header.

| Operation | Endpoint | Credits |
|-----------|----------|---------|
| Search Companies (name prefix, or tax/VAT id; country, limit, filed-only) | `GET /api/v1/search` | 1 |
| Lookup Company (by `id` from search) | `GET /api/v1/company/{id}` | 1 |
| Get Countries | `GET /api/v1/countries` | 1 |
| Check Credits | `GET /api/v1/usage` | 0 |

Search returns one item per company. Each item keeps the `data_licences` (and `attribution`, where present) block: keep it if you redistribute the data.

### What financial data you get (read this)

Financial fields (`revenue`, `employees`, `net_income`, `score`, `grade`, ...) are returned only for **FR, NO, LT, EE, LV and CO**, where the source licence is confirmed. For all other countries the company record is returned without financials and carries `financials_withheld: "licence_not_confirmed"`. The database holds 766,606 filed accounts (balance sheets) across those 6 countries.

Check `revenue_type` on each record: `reported` = filed accounts, `estimated` = model estimate. Search results with `revenue_type: reported` can be requested with **Filed Accounts Only** (paid credit packs; free keys get HTTP 403).

### Credentials

1. Get a free key (50 calls/month, no card): https://score.get-scala.com/api/free-key
2. In n8n create **S.C.A.L.A. Score API**, paste the key.
3. **Base URL** defaults to `https://score.get-scala.com` (host only, no `/api/v1`). Change it only for a self-hosted or proxied instance. Credentials saved with the old default `https://app.get-scala.com` are mapped to the Score host automatically.

Paid packs are one-time credits (500 = EUR 15, 2,000 = EUR 39), no subscription: https://score.get-scala.com/builders

### Changes in 0.2.0

- Moved from the non-existent `/api/score/*` routes to the live `/api/v1/*` API.
- Operation values `search`, `lookup`, `countries`, `credits` are unchanged, so saved workflows keep working. `Generate Report` and `Get Stats` are removed (no v1 equivalent). The NACE and Status filters are removed (v1 does not support them); the new **Tax ID** and **Filed Accounts Only** inputs replace them.
- Lookup now returns the company object itself plus `data_licences` and `credits_remaining`.

## S.C.A.L.A. CRM node

Unchanged in 0.2.0. It talks to a S.C.A.L.A. platform account (**Settings > API** in your dashboard, base URL in the credential), not to the Score API.

| Resource | Operations |
|----------|-----------|
| Contact | Get All, Create, Update, Delete, Timeline, Send Email |
| Pipeline | Get stages, Kanban view |
| Ticket | Get All, Create, Update |
| Data Table | Generic CRUD on any table |
| Webhook | Create, Delete, Test, List |

## Example workflow (import as template)

Copy the JSON below (also in [`examples/score-company-search.json`](examples/score-company-search.json)), then in n8n use **Workflow > Import from URL / File** or paste it on the canvas, and select your Score credential. It searches French companies and splits results by whether financials are available.

```json
{
  "name": "SCALA Score - company search with licence check",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "operation": "search",
        "query": "Total",
        "country": "FR",
        "limit": 5
      },
      "name": "SCALA Score: Search",
      "type": "n8n-nodes-scala.scalaScore",
      "typeVersion": 1,
      "position": [460, 300],
      "credentials": {
        "scalaScoreApi": { "id": "", "name": "S.C.A.L.A. Score API" }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose" },
          "conditions": [
            {
              "id": "withheld",
              "leftValue": "={{ $json.financials_withheld }}",
              "rightValue": "",
              "operator": { "type": "string", "operation": "empty", "singleValue": true }
            }
          ],
          "combinator": "and"
        }
      },
      "name": "Financials available?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [680, 300]
    },
    {
      "parameters": {},
      "name": "Has financials",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [900, 220]
    },
    {
      "parameters": {},
      "name": "Name only (licence not confirmed)",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [900, 400]
    }
  ],
  "connections": {
    "Manual Trigger": { "main": [[{ "node": "SCALA Score: Search", "type": "main", "index": 0 }]] },
    "SCALA Score: Search": { "main": [[{ "node": "Financials available?", "type": "main", "index": 0 }]] },
    "Financials available?": {
      "main": [
        [{ "node": "Has financials", "type": "main", "index": 0 }],
        [{ "node": "Name only (licence not confirmed)", "type": "main", "index": 0 }]
      ]
    }
  },
  "active": false,
  "settings": {},
  "tags": []
}
```

## Links

- [S.C.A.L.A.](https://get-scala.com)
- [Score API](https://score.get-scala.com/api/docs) · [sources and licences](https://score.get-scala.com/sources)
- [GitHub](https://github.com/Alessandro114/n8n-nodes-scala)

## License

MIT (this package). Data licences are listed per country in the `data_licences` field of every response.

---

## Ecosystem

Part of the **S.C.A.L.A.** open-source ecosystem:

| Project | What it does |
|---------|-------------|
| [SARA](https://github.com/Alessandro114/sara) | WhatsApp AI agent with 20 industry-specific brains |
| [LandIQ](https://github.com/Alessandro114/landiq) | Autonomous real estate feasibility agent |
| [scala-sites](https://github.com/Alessandro114/scala-sites) | 100 vertical website templates (Next.js, MIT) |
| [scala-agent-definitions](https://github.com/Alessandro114/scala-agent-definitions) | 79 AI tool definitions for 20 verticals |
| [scala-mcp-server](https://github.com/Alessandro114/scala-mcp-server) | MCP server for Claude/ChatGPT — company data |
| [Score SDKs](https://github.com/Alessandro114/scala-score-js) | Company data — [JS](https://npmjs.com/package/scala-score) · [Python](https://pypi.org/project/scala-score) · [Go](https://github.com/Alessandro114/company-lookup-go) · [Rust](https://github.com/Alessandro114/score-rust) · [Deno](https://github.com/Alessandro114/scala-score-deno) |
| [enrich-companies](https://github.com/Alessandro114/enrich-companies) | CSV enrichment CLI — [npm](https://npmjs.com/package/enrich-companies) · [pip](https://pypi.org/project/enrich-companies) |
| [n8n node](https://github.com/Alessandro114/n8n-nodes-scala) | n8n community node for company data |

