# Scenario 6: Function App not triggering (storage connection)

**Skills practised:** Azure Functions host health, `AzureWebJobsStorage`, Application Insights traces, runtime settings.

## Setup

Create a storage account and a Function App on the same Linux plan, then deploy the code in `functions/`.

```bash
source .lab.env
FSA=stfunc$RANDOM$RANDOM
FUNC=func-lab-$RANDOM

az storage account create -g $RG -n $FSA --sku Standard_LRS
az functionapp create -g $RG -n $FUNC --plan $PLAN --storage-account $FSA \
  --runtime node --runtime-version 20 --functions-version 4 --os-type Linux

# Send telemetry to the same Application Insights resource
AI_CONN=$(az monitor app-insights component show --app $AI -g $RG --query connectionString -o tsv)
az functionapp config appsettings set -g $RG -n $FUNC --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$AI_CONN"

# Deploy (needs Azure Functions Core Tools)
cd functions && func azure functionapp publish $FUNC && cd ..
```

Confirm the `heartbeat` timer fires every minute (look for `heartbeat fired` in **Log stream** or in `AppTraces`). Then break it:

```bash
az functionapp config appsettings set -g $RG -n $FUNC --settings AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=invalid;AccountKey=invalid;EndpointSuffix=core.windows.net"
az functionapp restart -g $RG -n $FUNC
```

## Symptom

The timer stops firing and the portal reports problems reaching the Functions runtime.

## Investigate (try before reading the answer)

1. Open **Diagnose and solve problems** for the Function App and review the findings.
2. Look at **Log stream** and the `AppTraces` query in `kql/useful-queries.kql`.
3. List the app settings and check `AzureWebJobsStorage`, `FUNCTIONS_WORKER_RUNTIME` and `FUNCTIONS_EXTENSION_VERSION`.
4. Check whether the HTTP `ping` function still responds, and explain why the timer and HTTP behave differently.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

The Functions host uses the `AzureWebJobsStorage` connection to coordinate triggers and store state. With an invalid connection string the host cannot start properly, so triggers stop. Restore the real connection string and restart:

```bash
CONN=$(az storage account show-connection-string -g $RG -n $FSA --query connectionString -o tsv)
az functionapp config appsettings set -g $RG -n $FUNC --settings AzureWebJobsStorage="$CONN"
az functionapp restart -g $RG -n $FUNC
```

Check the heartbeat lines return in `AppTraces`.

</details>

## Write up your own findings

Use `docs/case-write-up-template.md`. Note exactly which log line first showed the storage problem.
