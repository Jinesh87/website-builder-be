# Customer domains on nginx, in simple English

## What this does

Customers can connect their own domain (for example `www.rosebakery.com`) to a website they built.
Each of those domains needs an nginx site and an HTTPS certificate, just like your own projects.

Normally you would do that by hand: write an nginx file and run `certbot`. Customers can connect
domains at any time, so this small script does it for you:

1. **Every minute** it asks the web builder: "which customer domains are connected?"
2. **New domain** → it writes an nginx file, gets a certificate with certbot, reloads nginx.
3. **Removed domain** → it deletes that nginx file and its certificate, reloads nginx.

```
customer connects www.rosebakery.com in the web builder
        |
        v   (within 1 minute)
script creates /etc/nginx/sites-enabled/zz-webbuilder-www.rosebakery.com.conf
script runs certbot  ->  certificate "webbuilder-www.rosebakery.com"
        |
        v
https://www.rosebakery.com  ->  nginx  ->  web builder API (port 3000)  ->  the customer's website
```

## What it does NOT touch

- **Your other projects.** It never edits any nginx file except its own `zz-webbuilder-*.conf`
  files, and never touches any certificate except its own `webbuilder-*` ones.
- **How you deploy projects.** Add new projects exactly like you always do (nginx file + certbot).
  There is no list to update and no extra step.

It's careful by design:

| Situation | What the script does |
| --- | --- |
| Web builder API is down | Changes nothing |
| nginx says a new file is wrong (`nginx -t` fails) | Puts everything back as it was |
| certbot fails for a domain (DNS not ready) | Leaves that domain on HTTP, tries again after 1 hour |
| A customer enters a domain one of your projects uses | Your project wins (its file loads first); nginx only logs a warning |

## Install (one time, on the server)

The steps assume the backend repo is at `~/webbuilder/backend`; change the path if yours is different.

**1. Create a secret token** and put it in `backend/.env`:

```bash
openssl rand -hex 32
```

```env
DOMAIN_SYNC_TOKEN=<the token>
TRUST_PROXY=true
SITE_RENDERER_URL=http://127.0.0.1:3100
SITE_SERVER_IPS=172.232.97.65
```

Restart the backend: `cd ~/webbuilder/backend && sudo docker compose up --build -d`

**2. Install the script and its settings:**

```bash
cd ~/webbuilder/backend/deploy/nginx-domain-sync
sudo install -m 755 webbuilder-domain-sync /usr/local/sbin/webbuilder-domain-sync
sudo mkdir -p /etc/webbuilder
sudo cp domain-sync.env.example /etc/webbuilder/domain-sync.env
sudo chmod 600 /etc/webbuilder/domain-sync.env
sudo nano /etc/webbuilder/domain-sync.env      # SYNC_TOKEN = same token as step 1, ACME_EMAIL = your email
```

**3. Run it once by hand** to check it works:

```bash
sudo /usr/local/sbin/webbuilder-domain-sync && echo OK
```

It should print `OK`. If there are no customer domains yet, it does nothing else.

**4. Start the every-minute timer:**

```bash
sudo cp webbuilder-domain-sync.service webbuilder-domain-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now webbuilder-domain-sync.timer
```

That's all. nginx's main configuration and your existing sites are not changed.

## Updating the script later

When the script changes in the repo, after `git pull`:

```bash
sudo install -m 755 ~/webbuilder/backend/deploy/nginx-domain-sync/webbuilder-domain-sync /usr/local/sbin/webbuilder-domain-sync
```

## Checking on it

```bash
# what it did recently
sudo journalctl -u webbuilder-domain-sync --since "1 hour ago"

# customer sites it manages
ls /etc/nginx/sites-enabled/ | grep zz-webbuilder-

# their certificates
sudo certbot certificates 2>/dev/null | grep -A2 "webbuilder-"
```

## How a customer connects a domain

1. Website dashboard → **Domains** tab → enter `www.theirbusiness.com`.
2. At their DNS provider they add the two records shown there:
   - `TXT  _wb-verify.www.theirbusiness.com` = the code shown (proves they own it)
   - `A    www.theirbusiness.com` = `172.232.97.65` (points it at your server)
   - On Cloudflare the A record must be "DNS only" (grey cloud).
3. The web builder checks every 5 minutes (or when they click **Verify now**) and marks it **Connected**.
4. Within about a minute this script gives it an nginx site and HTTPS.

## Certificate renewal

certbot's normal renewal timer (the one already renewing your projects) also renews these
certificates and reloads nginx afterwards. Nothing to do.

## Turning it off

```bash
sudo systemctl disable --now webbuilder-domain-sync.timer
sudo rm /etc/nginx/sites-enabled/zz-webbuilder-*.conf
sudo nginx -t && sudo systemctl reload nginx
```

Customer domains then stop working. Your projects are not affected.
