# Scenario 4: Custom domain, DNS and TLS problems

**Skills practised:** DNS records, domain validation, certificate binding, HTTP/HTTPS checks.

**Requirement:** a domain you own and can edit DNS for. If you don't have one, read this scenario, do the DNS checks against the default `azurewebsites.net` name, and say so in your write-up.

## Setup

Use a subdomain such as `lab.yourdomain.com`. Get the values the platform expects:

```bash
source .lab.env
az webapp show --name $APP --resource-group $RG --query "{host:defaultHostName, verificationId:customDomainVerificationId}"
```

Break it on purpose, one way at a time:

1. Create only the `CNAME` record `lab` pointing at the default host name, and skip the `TXT` record. Then try to add the hostname:

```bash
az webapp config hostname add --webapp-name $APP --resource-group $RG --hostname lab.yourdomain.com
```

2. Point the `CNAME` at the wrong target (a typo) and try again.

## Symptom

Adding the custom hostname fails with a validation error, or the name does not resolve to the app.

## Investigate (try before reading the answer)

1. Check what the name resolves to from your machine:

```bash
nslookup lab.yourdomain.com
nslookup -type=TXT asuid.lab.yourdomain.com
curl -vI https://lab.yourdomain.com
```

2. Compare the records you created with the ones the portal asks for under **Custom domains**.
3. Check how long ago you changed DNS, because records can take time to propagate.
4. After the hostname is added, review the certificate binding and whether HTTPS-only is on.

## Answer (spoiler)

<details>
<summary>Root cause and fix</summary>

For a subdomain, App Service needs a `CNAME` to `<app>.azurewebsites.net` and a `TXT` record named `asuid.<subdomain>` containing the app's custom domain verification ID. A missing `TXT` record or a wrong `CNAME` target fails validation. Correct the records, wait for DNS to propagate, add the hostname, then add a managed certificate and bind it. Test with `curl -vI https://lab.yourdomain.com` and confirm the certificate subject matches the name.

</details>

## Write up your own findings

Use `docs/case-write-up-template.md` and paste the real `nslookup` output before and after the fix.
