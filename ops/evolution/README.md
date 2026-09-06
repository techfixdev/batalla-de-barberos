# Run Evolution API privately on the OMV NAS

This standalone Compose project runs Evolution API 2.3.7 with private PostgreSQL and Redis services. Only the API is published, on the explicitly selected NAS LAN address at port `18081`.

## Prepare the private application directory

Perform these steps only during the authorized NAS maintenance window. They are not executed by this repository change.

1. Create `$HOME/apps/bdb-evolution` with mode `0700`.
2. Copy `compose.yaml` there and copy `environment.example` to `.env`.
3. Set `.env` mode to `0600` and edit it directly. Do not print it or load it with `source`.
4. Replace both placeholder secrets with different random values. `openssl rand -hex 32` generates a URL-safe value; treat its terminal output as sensitive.
5. Confirm the initial LAN values remain:
   - `EVOLUTION_BIND_IP=192.168.100.20`
   - `EVOLUTION_SERVER_URL=http://192.168.100.20:18081`

The Compose variable guards intentionally reject an absent or incomplete `.env` before containers start.

## Start and verify during the maintenance window

From the private application directory, use only project-scoped Compose commands:

```sh
docker compose --env-file .env -f compose.yaml config
docker compose --env-file .env -f compose.yaml pull
docker compose --env-file .env -f compose.yaml up -d
docker compose --env-file .env -f compose.yaml ps
```

Image pull and real runtime checks are pending execution on the NAS. The API image's own entry point performs Prisma migration/generation and startup; the Compose file does not override it. PostgreSQL and Redis must become healthy before the API starts. No undocumented API healthcheck is configured, so perform the separately approved runtime probe after startup.

Open `http://192.168.100.20:18081` only from the trusted LAN. Create the required Evolution instance and complete QR pairing with the intended WhatsApp account.

## Isolation and coexistence

- The project name is `bdb-evolution`; commands above affect only this stack and preserve the other 23 NAS containers.
- PostgreSQL and Redis have no host ports and share an internal backend network with the API.
- The API also uses a normal bridge network because outbound internet access is required.
- Data resides in project-owned named volumes for instances, PostgreSQL, and Redis.
- Never use `docker compose down -v`; it deletes project data volumes.

## Back up before every update

Before changing image versions or configuration, take recoverable backups of both PostgreSQL and the Evolution instances volume. Keep the backup outside these Compose volumes and verify the restore procedure. Do not update until those backups exist.

The images are pinned by tag and digest. Review the official [Evolution API 2.3.7 release](https://github.com/evolution-foundation/evolution-api/releases/tag/2.3.7) before any future version change.

## Add the bounded public tunnel separately

The public layer is an independent Compose project named `bdb-evolution-public`. It exposes no host ports and does not replace or restart the existing `bdb-evolution` project or its private Manager endpoint on LAN port `18081`.

### Prepare the NAS directory

1. Create `$HOME/apps/bdb-evolution-public` with mode `0700`, owned by UID/GID `1000:1000`.
2. Copy `tunnel.compose.yaml` there as `compose.yaml`, and copy `nginx.conf` beside it.
3. Create `tunnel-token` as a regular file with mode `0600`, owned by `1000:1000`, then enter the remotely managed tunnel token directly in a private editor.
4. Never put the token in `.env`, an environment variable, Compose command arguments, or a committed config. Never print it with `cat` or a config dump. The bind mount has `create_host_path: false`, so a missing file is rejected instead of becoming a directory.

Use `docker compose -f compose.yaml config --quiet` for syntax checking without dumping configuration, then validate Nginx and start only this project:

```sh
docker compose -f compose.yaml run --rm --no-deps proxy -t
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
```

Both containers have health checks. Cloudflared's metrics listener on port `2000` is container-internal only: Compose publishes no port, and the dashboard service target is only the proxy.

### Prove the proxy boundary before DNS

Before configuring any public hostname, run local requests through the proxy container and inspect the response status:

```sh
docker compose -f compose.yaml exec proxy wget -S -O /dev/null http://127.0.0.1:8080/manager
docker compose -f compose.yaml exec proxy wget -S -O /dev/null http://127.0.0.1:8080/message/sendMedia/batalla-de-barberos
docker compose -f compose.yaml exec proxy wget -S -O /dev/null --post-data='' http://127.0.0.1:8080/message/sendMedia/batalla-de-barberos
```

The first request must be `404`, the second must be denied (`403`), and the unauthenticated POST to the one allowed path must reach Evolution and return `401`. These expected 4xx responses make `wget` exit nonzero. Do not configure the public record unless all three statuses match.

Then configure the remotely managed tunnel in the Cloudflare dashboard:

| Setting | Value |
|---|---|
| Public hostname | `api.batalladebarberos.com.ar` |
| Service type | HTTP |
| Service URL | `http://proxy:8080` |

Cloudflare terminates public TLS. The proxy still enforces the exact path and POST-only rule even if the dashboard route is a catch-all. Evolution's API key remains mandatory and is forwarded as a normal request header; no Manager, admin, root, or instance API is public. No router or NAS port-forwarding change is needed.

After Cloudflare reports the route active, repeat denial and unauthenticated checks over HTTPS and confirm the containers remain healthy. Do not send an API-key-authenticated media request until the user has authorized a controlled test recipient; that is the first step capable of sending a WhatsApp message.

### Roll back only the public layer

From `$HOME/apps/bdb-evolution-public`, stop only this new project:

```sh
docker compose -f compose.yaml down
```

Never add `-v`, and do not restart or run `down` against the existing `bdb-evolution` project.
