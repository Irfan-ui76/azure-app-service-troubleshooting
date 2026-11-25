# Scenario 3: Slow responses, high CPU and growing memory

**Skills practised:** performance triage, App Service metrics, Application Insights performance, scaling decisions.

Keep this scenario short to limit cost, and run `/leak/reset` when you finish.

## Setup

```bash
source .lab.env
URL=https://$(az webapp show -n $APP -g $RG --query defaultHostName -o tsv)

curl "$URL/slow?ms=4000"        # slow dependency simulation
curl "$URL/cpu?ms=8000"         # blocks the Node.js event loop
for i in 1 2 3 4 5; do curl "$URL/leak?mb=100"; done   # memory climbs on every call
```

While the calls run, send a normal request in a second terminal: `curl -w "%{time_total}\n" $URL/health`.

## Symptom

Normal requests become slow or time out while `/cpu` is running, and memory use keeps rising after each `/leak` call.

## Investigate (try before reading the answer)

1. In the App Service **Metrics** blade chart CPU time, Memory working set and Average response time.
2. In Application Insights open **Performance** and compare p50 and p95 by operation.
3. Run the slowest-requests and percentile queries in `kql/useful-queries.kql`.
4. Use **Diagnose and solve problems** to see what it reports for high CPU and memory.
5. Decide which problems are code problems and which can be mitigated by scaling.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

- `/slow` is a slow request but does not block other requests, so it is an expected slow dependency.
- `/cpu` runs a synchronous loop, so the single Node.js thread cannot serve other requests until it finishes. Scaling out helps only partly; the real fix is moving the work off the request path.
- `/leak` keeps every allocation in a global array, so memory never falls. A restart (`az webapp restart`) clears it temporarily; the real fix is code that releases the data.

Scaling up the plan gives more headroom but hides the leak. Say that clearly in your write-up.

</details>

## Clean up

```bash
curl "$URL/leak/reset"
```

## Write up your own findings

Use `docs/case-write-up-template.md`. Include a screenshot of the metrics chart, with the time the load started.
