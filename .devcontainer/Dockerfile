FROM node:20-slim

ARG PNPM_VERSION=9.0.6

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git curl bash-completion zsh docker.io ca-certificates locales && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate && \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    mkdir -p /home/node && \
    cp /root/.zshrc /home/node/.zshrc && \
    chown node:node /home/node/.zshrc && \
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git /opt/powerlevel10k && \
    sed -i 's|^ZSH_THEME=.*|ZSH_THEME="powerlevel10k/powerlevel10k"|' /home/node/.zshrc && \
    echo 'POWERLEVEL9K_DISABLE_CONFIGURATION_WIZARD=true' >> /home/node/.zshrc && \
    echo '[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh' >> /home/node/.zshrc && \
    chsh -s /usr/bin/zsh node

COPY p10k-lean.zsh /home/node/.p10k.zsh
RUN chown node:node /home/node/.p10k.zsh

WORKDIR /workspaces
