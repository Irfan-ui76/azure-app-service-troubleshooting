#!/usr/bin/env bash
# Deletes everything the lab created. Run this when you finish to avoid charges.
set -euo pipefail
cd "$(dirname "$0")/.."
RG="${RG:-rg-appsvc-lab}"
if [ -f .lab.env ]; then source .lab.env; fi
echo "Deleting resource group $RG (runs in the background)"
az group delete --name "$RG" --yes --no-wait
rm -f .lab.env app.zip
