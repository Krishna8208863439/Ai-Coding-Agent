FROM node:20-alpine

RUN addgroup -g 1001 -S nexora && \
    adduser -u 1001 -S nexora -G nexora

WORKDIR /workspace
RUN chown -R nexora:nexora /workspace

USER nexora

CMD ["node", "-v"]

