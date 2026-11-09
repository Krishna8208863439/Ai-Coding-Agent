FROM python:3.12-alpine

RUN addgroup -g 1001 -S nexora && \
    adduser -u 1001 -S nexora -G nexora

WORKDIR /workspace
RUN chown -R nexora:nexora /workspace

USER nexora

CMD ["python3", "--version"]

