# Firebase Auth Emulator (+ Emulator UI) for local development.
FROM node:22-slim

ARG FIREBASE_TOOLS_VERSION=15.36.0
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} \
  && npm cache clean --force

# Pre-download the Emulator UI so the container starts offline. Not fatal: if the
# download fails here (flaky network), the emulator fetches it on first start.
RUN firebase setup:emulators:ui || echo "Emulator UI download failed; it will be fetched at runtime."

WORKDIR /firebase
COPY firebase.json .firebaserc ./
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# 9099 = Auth Emulator, 4000 = Emulator UI
EXPOSE 9099 4000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
