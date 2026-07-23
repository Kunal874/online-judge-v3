# Serves both C and C++ — gcc:13 ships both gcc and g++, no reason to
# duplicate this Dockerfile per language.
FROM gcc:13
RUN useradd --no-create-home judge
USER judge
WORKDIR /workspace
