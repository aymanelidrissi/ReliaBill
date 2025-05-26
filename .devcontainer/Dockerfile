FROM node:20-slim

ARG PNPM_VERSION=9.0.6
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl bash-completion zsh \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@$PNPM_VERSION --activate

WORKDIR /workspaces
