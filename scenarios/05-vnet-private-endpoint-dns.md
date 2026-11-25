# Scenario 5: VNet integration and private endpoint DNS

**Skills practised:** regional VNet integration, private endpoints, private DNS, NSG basics, DNS troubleshooting.

Check the Azure pricing page first; a storage account and a private endpoint add a small cost. Delete everything with `infra/cleanup.sh` afterwards.

## Setup

```bash
source .lab.env
SA=stlab$RANDOM$RANDOM   # must be globally unique, lowercase, max 24 chars

# Network: one subnet for App Service integration, one for the private endpoint
az network vnet create -g $RG -n vnet-lab --address-prefix 10.50.0.0/16 \
  --subnet-name snet-appsvc --subnet-prefix 10.50.1.0/24
az network vnet subnet update -g $RG --vnet-name vnet-lab -n snet-appsvc \
  --delegations Microsoft.Web/serverFarms
az network vnet subnet create -g $RG --vnet-name vnet-lab -n snet-pe --address-prefixes 10.50.2.0/24

# Storage account with public network access disabled
az storage account create -g $RG -n $SA --sku Standard_LRS --public-network-access Disabled

# Private endpoint for the blob service (no private DNS zone yet: this is the fault)
SA_ID=$(az storage account show -g $RG -n $SA --query id -o tsv)
az network private-endpoint create -g $RG -n pe-blob --vnet-name vnet-lab --subnet snet-pe \
  --private-connection-resource-id $SA_ID --group-id blob --connection-name pe-blob-conn

# Integrate the web app with the VNet
az webapp vnet-integration add -g $RG -n $APP --vnet vnet-lab --subnet snet-appsvc
```

Now test from inside the app (replace the key and names):

```bash
URL=https://$(az webapp show -n $APP -g $RG --query defaultHostName -o tsv)
curl "$URL/dns?name=$SA.blob.core.windows.net&key=$LAB_KEY"
curl "$URL/http?url=https://$SA.blob.core.windows.net/&key=$LAB_KEY"
```

## Symptom

The app cannot use the storage account over the private endpoint. `/http` returns a 403 authorization failure, and `/dns` shows a public IP address instead of a private `10.50.2.x` address.

## Investigate (try before reading the answer)

1. Compare the address from `/dns` with the private endpoint's IP in the portal.
2. List the private DNS zones in the resource group and check their virtual network links.
3. Check the VNet integration status and the outbound routing setting on the web app.
4. Review the NSG rules on both subnets, if you attached any.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

The private endpoint exists, but there is no private DNS zone `privatelink.blob.core.windows.net` linked to the VNet, so the storage name still resolves to its public address and the request goes over the public path, where public access is disabled.

```bash
az network private-dns zone create -g $RG -n privatelink.blob.core.windows.net
az network private-dns link vnet create -g $RG -z privatelink.blob.core.windows.net \
  -n link-vnet-lab --virtual-network vnet-lab --registration-enabled false
az network private-endpoint dns-zone-group create -g $RG --endpoint-name pe-blob \
  -n default --private-dns-zone privatelink.blob.core.windows.net --zone-name blob
```

Restart the app, run `/dns` again and confirm it now returns a `10.50.2.x` address. The `/http` response should no longer be the 403 authorization failure from the public path. If it still resolves publicly, check the app's outbound routing (route all traffic) and DNS settings.

</details>

## Write up your own findings

Use `docs/case-write-up-template.md` and include the before and after `/dns` output.
