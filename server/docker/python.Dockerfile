FROM python:3.12-slim
RUN useradd --no-create-home --uid 1000 judge
USER judge
WORKDIR /workspace
