FROM eclipse-temurin:21-jdk
RUN useradd --no-create-home judge
USER judge
WORKDIR /workspace
