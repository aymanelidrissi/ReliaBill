FROM node:20-slim

ARG PNPM_VERSION=10.11.0

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git curl bash-completion zsh ca-certificates locales && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git /opt/powerlevel10k && \
    echo 'POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD=true' >> /root/.zshrc

COPY p10k-lean.zsh /root/.p10k.zsh

WORKDIR /workspaces
