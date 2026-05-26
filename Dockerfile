FROM apify/actor-node-playwright-chrome:20

COPY --chown=myuser package*.json ./
RUN npm install --include=dev

COPY --chown=myuser . ./
RUN npm run build && npm prune --omit=dev

CMD npm start
