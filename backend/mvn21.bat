@echo off
REM Run Maven with Java 21 (required for Lombok compatibility)
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
mvn %*
