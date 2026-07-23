FROM python:3.12-slim
RUN useradd --no-create-home judge
USER judge
WORKDIR /workspace
