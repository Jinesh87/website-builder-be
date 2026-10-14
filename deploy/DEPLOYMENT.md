# Web Builder deployment guide

This guide explains how to deploy the Web Builder on the server. Follow the steps in order.

The Web Builder has three parts:

1. The frontend. This is the website builder app that users log in to. It runs in Docker on port 8080.
2. The site renderer. This is a new small program. The backend uses it to draw the published websites. It runs in Docker on port 3100 and can only be reached from inside the server.
3. The backend. This is the API. It also serves the published websites. It runs in Docker on port 3000.

There is also a small script called the domain sync script. Customers can connect their own domain (for example www.theirshop.com) to a website they built. When they do, this script adds an nginx site file and an HTTPS certificate for that domain. When they remove the domain, the script deletes them again. It runs automatically every minute.

The script only creates and deletes its own files. Its nginx files are always named zz-webbuilder-something.conf, and its certificates are always named webbuilder-something. It never changes the nginx files or certificates of other projects on this server.


## Step 1: Set the folder paths

Replace the paths below with the real folders where the frontend and backend code are on the server, then run the two lines. Later commands use these names so you can copy them as they are.

```bash
export FRONTEND_DIR=~/webbuilder/frontend
export BACKEND_DIR=~/webbuilder/backend
```


## Step 2: Download the latest code

This downloads the new code for both parts. Nothing is restarted yet.

```bash
cd "$FRONTEND_DIR" && git pull
cd "$BACKEND_DIR" && git pull
```


## Step 3: Update the backend settings

First, create a secret password for the domain sync script. This command prints a long random text. Copy it, because you need it twice.

```bash
openssl rand -hex 32
```

Open the backend settings file:

```bash
nano "$BACKEND_DIR/.env"
```

Add the four lines below. Do not remove any existing lines. If one of these settings is already in the file, change its value instead of adding it again.

```env
TRUST_PROXY=true
SITE_RENDERER_URL=http://127.0.0.1:3100
SITE_SERVER_IPS=172.232.97.65
DOMAIN_SYNC_TOKEN=paste-the-secret-here
```

What these settings mean:

TRUST_PROXY=true tells the backend that it sits behind nginx, so it can see the real visitor address.

SITE_RENDERER_URL tells the backend where to find the site renderer.

SITE_SERVER_IPS is the public address of this server. Customers point their domains to this address.

DOMAIN_SYNC_TOKEN is the secret you just created. The domain sync script uses it to ask the backend for the list of customer domains.

While the file is open, also check that these existing settings have the correct live addresses:

```env
NODE_ENV=production
FRONTEND_URL=https://webcms.hrtrace.com
API_PUBLIC_URL=https://webcmsb.hrtrace.com
CORS_ORIGIN=https://webcms.hrtrace.com
```

To save in nano, press Ctrl+O and then Enter. To exit, press Ctrl+X.


## Step 4: Check the frontend settings

Open the frontend settings file:

```bash
nano "$FRONTEND_DIR/.env"
```

It should contain these lines:

```env
VITE_APP_NAME=WebBuilder
VITE_API_URL=https://webcmsb.hrtrace.com/api
FRONTEND_PORT=8080
SITE_RENDERER_PORT=3100
VITE_PUBLIC_SITE_DOMAIN=
```

Leave VITE_PUBLIC_SITE_DOMAIN empty for now. It will be used later for free addresses like shop.bytezora.site.

These values are built into the app when it is built. If you change them later, run Step 5 again.


## Step 5: Start the frontend and the site renderer

This builds and starts both the frontend and the site renderer. The first time can take a few minutes.

```bash
cd "$FRONTEND_DIR"
sudo docker compose up --build -d
```

Check that both are running. You should see two lines, frontend and site-renderer, both marked "Up". After about 15 seconds, the site renderer should also say "healthy".

```bash
sudo docker compose ps
```

Check the site renderer directly. It should print a line that starts with {"ok":true

```bash
curl -s http://127.0.0.1:3100/health
```


## Step 6: Start the backend

This builds and restarts the backend. When it starts, it automatically updates the database if needed.

```bash
cd "$BACKEND_DIR"
sudo docker compose up --build -d
```

Look at the last log lines. You should see "Database connected" and "API listening".

```bash
sudo docker compose logs --tail=50 backend
```

Check the backend from outside. It should print 200.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://webcmsb.hrtrace.com/api/health
```


## Step 7: Install the domain sync script

You only do this step once, the first time. It does not change nginx or any existing site.

Go to the script folder:

```bash
cd "$BACKEND_DIR/deploy/nginx-domain-sync"
```

Copy the script into the system folder for admin programs:

```bash
sudo install -m 755 webbuilder-domain-sync /usr/local/sbin/webbuilder-domain-sync
```

Create the script's settings file. Only the root user can read it, because it contains the secret.

```bash
sudo mkdir -p /etc/webbuilder
sudo cp domain-sync.env.example /etc/webbuilder/domain-sync.env
sudo chmod 600 /etc/webbuilder/domain-sync.env
sudo nano /etc/webbuilder/domain-sync.env
```

In that file, set SYNC_TOKEN to the same secret you put in DOMAIN_SYNC_TOKEN in Step 3. You can leave ACME_EMAIL empty.

```env
SYNC_TOKEN=paste-the-same-secret-here
ACME_EMAIL=
```

Run the script once by hand to test it. It should print OK. If it says "API unreachable", the backend is not running or the two secrets do not match.

```bash
sudo /usr/local/sbin/webbuilder-domain-sync && echo OK
```

Now make it run automatically every minute, including after the server restarts:

```bash
sudo cp webbuilder-domain-sync.service webbuilder-domain-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now webbuilder-domain-sync.timer
```

Check that it is scheduled. You should see one line showing when it runs next.

```bash
systemctl list-timers webbuilder-domain-sync.timer
```


## Step 8: Test

Open https://webcms.hrtrace.com and log in. The dashboard should load.

Publish any website and click "Visit live site". It opens an address like https://webcmsb.hrtrace.com/live/websitename. The website should look the same as in the editor.

Open a few of the other projects on this server and check that they still work as before.

To test a customer domain, use a spare domain that no other project on this server uses:

1. In the builder, open a website, go to the Domains tab, enter the domain and click "Connect domain".
2. At the company where the domain was bought, add the two records shown on that page. One is a TXT record. The other is an A record pointing to 172.232.97.65. If the domain uses Cloudflare, turn off the orange cloud (proxy) for the A record.
3. Click "Verify now". When the domain shows "Connected", wait about one minute.
4. Open https://yourdomain in a browser. The website should load with a secure padlock.

To see what the domain sync script did, run:

```bash
sudo journalctl -u webbuilder-domain-sync --since "10 min ago"
```

It should say "HTTPS ready for" followed by the domain.


## Updating later

For every future update, run these two lines. They download the new code and restart the frontend, site renderer and backend. The database is updated automatically.

```bash
cd "$FRONTEND_DIR" && git pull && sudo docker compose up --build -d
cd "$BACKEND_DIR" && git pull && sudo docker compose up --build -d
```

The developers will tell you if the domain sync script itself changed. Only in that case, also run:

```bash
sudo install -m 755 "$BACKEND_DIR/deploy/nginx-domain-sync/webbuilder-domain-sync" /usr/local/sbin/webbuilder-domain-sync
```


## Useful commands

See if the containers are running:

```bash
sudo docker compose -f "$FRONTEND_DIR/docker-compose.yml" ps
sudo docker compose -f "$BACKEND_DIR/docker-compose.yml" ps
```

Watch the backend logs live. Press Ctrl+C to stop watching. The backend keeps running.

```bash
sudo docker compose -f "$BACKEND_DIR/docker-compose.yml" logs -f --tail=100 backend
```

Watch the site renderer logs live:

```bash
sudo docker compose -f "$FRONTEND_DIR/docker-compose.yml" logs -f --tail=100 site-renderer
```

See what the domain sync script did in the last hour:

```bash
sudo journalctl -u webbuilder-domain-sync --since "1 hour ago"
```

List the customer domains nginx is currently serving:

```bash
ls /etc/nginx/sites-enabled/ | grep zz-webbuilder-
```

List the customer domain certificates and their expiry dates:

```bash
sudo certbot certificates 2>/dev/null | grep -A2 'Certificate Name: webbuilder-'
```

Run the domain sync right now instead of waiting for the next minute:

```bash
sudo systemctl start webbuilder-domain-sync.service
```


## When something goes wrong

If published websites look plain or unstyled, the backend cannot reach the site renderer. Run curl -s http://127.0.0.1:3100/health. If it does not answer, start it again with: cd "$FRONTEND_DIR" && sudo docker compose up -d site-renderer. Also check SITE_RENDERER_URL in the backend settings.

If a customer domain stays on "Waiting for DNS", the DNS records are missing or wrong, or the Cloudflare proxy is on. The Domains tab shows exactly what is missing. DNS changes can take up to a few hours.

If a domain shows "Connected" but the HTTPS address does not work, the certificate may not be ready yet, or it failed. Check the script's log with the journalctl command above. Failed domains are tried again after one hour. The full certbot message is in /var/lib/webbuilder-domain-sync/certbot-DOMAIN.log.

If the script's log says "API unreachable", the backend is not running, or SYNC_TOKEN does not match DOMAIN_SYNC_TOKEN.

If the script's log says "nginx rejected the change, rolled back", the script found a problem and changed nothing. Send that log line to the developers.

If a customer enters a domain that another project on this server uses, the other project keeps working, because its nginx file is loaded first. Remove that domain in the builder.


## How to turn off customer domains

Stop the script and keep it off after restarts:

```bash
sudo systemctl disable --now webbuilder-domain-sync.timer
```

Remove all customer domain sites from nginx, check the nginx settings, and reload nginx:

```bash
sudo rm -f /etc/nginx/sites-enabled/zz-webbuilder-*.conf
sudo nginx -t && sudo systemctl reload nginx
```

After this, customer domains stop working. The builder, the /live/ website links and all other projects keep working.


## Files created on the server

The script is at /usr/local/sbin/webbuilder-domain-sync.

Its settings, including the secret, are in /etc/webbuilder/domain-sync.env.

The every-minute schedule is in /etc/systemd/system/webbuilder-domain-sync.service and /etc/systemd/system/webbuilder-domain-sync.timer.

Customer domain nginx files are in /etc/nginx/sites-enabled and start with zz-webbuilder-. They are created automatically, so do not edit them.

Customer domain certificates are in /etc/letsencrypt/live and start with webbuilder-. certbot renews them automatically, together with the other certificates.

The script also uses /var/www/webbuilder-acme for certificate checks and /var/lib/webbuilder-domain-sync for its own notes and logs.
