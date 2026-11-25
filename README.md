# Azure App Service Troubleshooting Lab

A hands-on lab for practising how to diagnose common Azure App Service and Azure Functions problems. A small Node.js app is deployed to App Service, then broken on purpose in six ways. For each one you investigate with the portal, logs and KQL, find the root cause, fix it and write the case up.

> **This is a learning lab, not production or customer work.** Run each scenario yourself and write your own findings. The scenario files include spoilers (collapsed) so you can check your answer afterwards.

## Scenarios

| # | Scenario | What you practise |
| --- | --- | --- |
| 1 | [App won't start](scenarios/01-app-wont-start.md) | Container start-up failures, platform logs, app settings |
| 2 | [HTTP 500 after a deployment](scenarios/02-http-500-after-deploy.md) | Exceptions, Application Insights, configuration problems |
| 3 | [Slow responses, CPU and memory](scenarios/03-slow-and-memory.md) | Metrics, performance triage, scaling decisions |
| 4 | [Custom domain, DNS and TLS](scenarios/04-custom-domain-dns-tls.md) | DNS records, domain validation, certificates |
| 5 | [VNet integration and private endpoint DNS](scenarios/05-vnet-private-endpoint-dns.md) | Private networking, private DNS, NSGs |
| 6 | [Function App not triggering](scenarios/06-function-app-not-triggering.md) | Functions host health, storage connection, traces |

## Repository layout

```
app/          Node.js (Express) app with endpoints used by the scenarios, plus a Dockerfile
functions/    Minimal Azure Functions app (timer and HTTP triggers) for scenario 6
infra/        deploy.sh creates the environment, cleanup.sh deletes it
kql/          Ready-to-use Log Analytics queries
scenarios/    One guide per break/fix scenario
docs/         Case write-up template (also a mock support case format)
```

## Prerequisites

- An Azure subscription (this creates billable resources; a Linux B1 plan costs a small amount per hour)
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), signed in with `az login`
- `zip` and `openssl` (Linux, macOS or WSL)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) for scenario 6
- Node.js 20 if you want to run the app locally

## Quick start

```bash
az login
./infra/deploy.sh          # creates resources and deploys the app (takes a few minutes)
source .lab.env            # loads APP, RG, LAB_KEY and other variables
curl https://$(az webapp show -n $APP -g $RG --query defaultHostName -o tsv)/
```

Run locally:

```bash
cd app && npm install && npm start    # http://localhost:8080
```

## App endpoints

| Endpoint | Purpose |
| --- | --- |
| `/` and `/health` | Basic status and health check |
| `/config` | Returns 500 until the `DB_CONNECTION` app setting exists (scenario 2) |
| `/slow`, `/cpu`, `/leak`, `/leak/reset` | Slow responses, CPU load and memory growth (scenario 3) |
| `/dns`, `/outbound`, `/http` | DNS, TCP and HTTP checks from inside the app (scenarios 4 and 5). These require the `LAB_KEY` value |

## How to use this for your own learning

1. Do each scenario before opening the spoiler.
2. Save real evidence: log lines, KQL, screenshots.
3. Copy `docs/case-write-up-template.md` into a `write-ups/` folder for each scenario and fill it in.
4. Update this README with the scenarios you completed and what you learned.

## Clean up

```bash
./infra/cleanup.sh
```

This deletes the whole resource group. Run it when you finish to stop charges.

## Security notes

- The diagnostic endpoints can probe other hosts, so they require `LAB_KEY`. `deploy.sh` generates a random key and keeps it in `.lab.env`, which is git-ignored.
- Do not leave the lab running, and do not commit keys, connection strings or `.lab.env`.
