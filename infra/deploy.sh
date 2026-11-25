#!/usr/bin/env bash
# Creates the lab environment: resource group, Log Analytics, Application Insights,
# a Linux B1 App Service plan and a Node.js web app with logging turned on.
# Usage: az login && ./infra/deploy.sh
set -euo pipefail

LOCATION="${LOCATION:-centralindia}"
SUFFIX="${SUFFIX:-$RANDOM}"
RG="${RG:-rg-appsvc-lab}"
PLAN="plan-appsvc-lab"
APP="app-lab-${SUFFIX}"
LAW="law-appsvc-lab"
AI="ai-appsvc-lab"
LAB_KEY="$(openssl rand -hex 8)"

cd "$(dirname "$0")/.."

az extension add --name application-insights --only-show-errors >/dev/null || true

echo "Creating resource group $RG in $LOCATION"
az group create --name "$RG" --location "$LOCATION" --output none

echo "Creating Log Analytics workspace and Application Insights"
az monitor log-analytics workspace create --resource-group "$RG" --workspace-name "$LAW" --location "$LOCATION" --output none
LAW_ID="$(az monitor log-analytics workspace show --resource-group "$RG" --workspace-name "$LAW" --query id -o tsv)"
az monitor app-insights component create --app "$AI" --location "$LOCATION" --resource-group "$RG" \
  --workspace "$LAW_ID" --kind web --application-type web --output none
AI_CONN="$(az monitor app-insights component show --app "$AI" --resource-group "$RG" --query connectionString -o tsv)"

echo "Creating App Service plan (Linux, B1) and web app $APP"
az appservice plan create --name "$PLAN" --resource-group "$RG" --location "$LOCATION" --is-linux --sku B1 --output none
az webapp create --name "$APP" --resource-group "$RG" --plan "$PLAN" --runtime "NODE:20-lts" --output none

az webapp config appsettings set --name "$APP" --resource-group "$RG" --output none --settings \
  APPLICATIONINSIGHTS_CONNECTION_STRING="$AI_CONN" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  LAB_KEY="$LAB_KEY"

echo "Turning on application and web server logging"
az webapp log config --name "$APP" --resource-group "$RG" --application-logging filesystem \
  --level information --web-server-logging filesystem --docker-container-logging filesystem --output none

APP_ID="$(az webapp show --name "$APP" --resource-group "$RG" --query id -o tsv)"
az monitor diagnostic-settings create --name lab-diag --resource "$APP_ID" --workspace "$LAW_ID" --logs '[
  {"category":"AppServiceHTTPLogs","enabled":true},
  {"category":"AppServiceConsoleLogs","enabled":true},
  {"category":"AppServiceAppLogs","enabled":true},
  {"category":"AppServicePlatformLogs","enabled":true}
]' --output none

echo "Deploying the app"
rm -f app.zip
(cd app && zip -qr ../app.zip . -x "node_modules/*")
az webapp deploy --name "$APP" --resource-group "$RG" --src-path app.zip --type zip --output none

cat > .lab.env <<EOF
RG=$RG
PLAN=$PLAN
APP=$APP
LAW=$LAW
AI=$AI
LOCATION=$LOCATION
LAB_KEY=$LAB_KEY
EOF

echo
echo "Done. App URL: https://$(az webapp show --name "$APP" --resource-group "$RG" --query defaultHostName -o tsv)"
echo "Variables saved to .lab.env (do not commit). Load them with: source .lab.env"
