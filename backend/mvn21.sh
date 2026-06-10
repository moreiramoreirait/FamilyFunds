#!/bin/bash
# Run Maven with Java 21 (required for Lombok compatibility)
JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.11.10-hotspot"
PATH="$JAVA_HOME/bin:$PATH"
export JAVA_HOME PATH
mvn "$@"
