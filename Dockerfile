FROM node:22-bookworm-slim

# Fallback toolchain in case better-sqlite3 must compile from source
# (prebuilt binaries for Node 22 make this unnecessary)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

ENV NODE_ENV=production DEMO_MODE=true
EXPOSE 3000
CMD ["node", "server.js"]
