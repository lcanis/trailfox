FROM caddy:2-builder AS builder

# Build a Caddy binary that includes the rate_limit handler.
RUN xcaddy build \
  --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
