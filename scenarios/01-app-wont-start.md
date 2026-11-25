# Scenario 1: The app won't start (port mismatch)

**Skills practised:** container start-up failures, platform logs, app settings, root cause analysis.

## Setup

Load your variables first: `source .lab.env`

Break the app by making it listen on a port the platform is not probing:

```bash
az webapp config appsettings set --name $APP --resource-group $RG --settings APP_PORT=3000
az webapp restart --name $APP --resource-group $RG
```

## Symptom

Browsing to the app URL shows an application error page (HTTP 503) instead of the JSON from `/`.

## Investigate (try before reading the answer)

1. Open **Log stream** in the portal and watch the start-up messages.
2. Open **Diagnose and solve problems** and look at the application and container start-up detectors.
3. Run the platform and console log queries from `kql/useful-queries.kql`.
4. Compare the port the app says it listens on with the port the platform probes.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

The app logs `Listening on port 3000`, but App Service Linux built-in images probe the port in the `PORT` variable (8080). The platform log shows the container did not answer the HTTP ping on port 8080, so the site start fails.

Fix: remove the override and restart.

```bash
az webapp config appsettings delete --name $APP --resource-group $RG --setting-names APP_PORT
az webapp restart --name $APP --resource-group $RG
```

For a custom container (see `app/Dockerfile`), the equivalent fix is to set `WEBSITES_PORT` to the port the container really listens on.

</details>

## Write up your own findings

Copy `docs/case-write-up-template.md` and fill it in using what you actually saw: the exact log lines, the time you noticed the failure and the time it recovered.
