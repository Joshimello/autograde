FROM oven/bun:1.3.1-alpine

RUN apk add --no-cache bash nodejs npm python3 unzip
RUN npm install -g @anthropic-ai/claude-code

RUN addgroup -S runner && adduser -S runner -G runner

WORKDIR /runner
COPY run.py /runner/run.py
RUN chmod 755 /runner/run.py

USER runner

ENTRYPOINT ["python3", "/runner/run.py"]
