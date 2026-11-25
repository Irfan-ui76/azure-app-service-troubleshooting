# Scenario 2: HTTP 500 after a deployment (missing app setting)

**Skills practised:** reading exceptions, Application Insights failures, configuration drift between environments.

## Setup

The app is already broken for this scenario because it expects an app setting that was never created. Make sure `APP_PORT` is removed (scenario 1) and then call the endpoint:

```bash
source .lab.env
curl -i https://$(az webapp show -n $APP -g $RG --query defaultHostName -o tsv)/config
```

## Symptom

`/` and `/health` return 200, but `/config` returns HTTP 500 with a generic error.

## Investigate (try before reading the answer)

1. In Application Insights, open **Failures** and find the failing request.
2. Check the exception details and the console log for the stack trace.
3. Run the `AppRequests` and `AppExceptions` queries in `kql/useful-queries.kql`.
4. Decide whether this is a code bug, a deployment problem or a configuration problem, and explain why.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

The code throws `Missing required app setting: DB_CONNECTION`. The setting exists in the developer's environment but was never added to this app.

```bash
az webapp config appsettings set --name $APP --resource-group $RG --settings DB_CONNECTION="lab-placeholder"
```

Call `/config` again and it returns 200. Note that changing an app setting restarts the app.

</details>

## Stretch goals

- Write one sentence a customer could understand explaining what happened.
- List two ways to stop this recurring (for example a deployment checklist or a start-up check that fails fast).

## Write up your own findings

Use `docs/case-write-up-template.md`.
