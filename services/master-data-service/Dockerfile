# ---- 1. Build the fat jar ----------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# ---- 2. Unpack it into layers -------------------------------------------------
# An unpacked jar starts faster than nested jars, and the ~60 MB of
# dependencies become their own image layer, so a code change only re-ships
# the small "application" layer to the cluster.
FROM eclipse-temurin:21-jre-alpine AS extract
WORKDIR /x
COPY --from=build /build/target/master-data-service.jar application.jar
RUN java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# ---- 3. Runtime image -----------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=extract /x/extracted/dependencies/ ./
COPY --from=extract /x/extracted/spring-boot-loader/ ./
COPY --from=extract /x/extracted/snapshot-dependencies/ ./
COPY --from=extract /x/extracted/application/ ./

# Class Data Sharing (CDS) training run: start the app once at build time,
# stop right after the Spring context is created, and save every loaded class
# into application.jsa. Each real start then maps that archive instead of
# re-loading and verifying thousands of classes - a large cut in startup CPU.
# The run must not need Postgres/Kafka, so it disables Flyway, schema
# validation, JDBC metadata lookups and Kafka topic creation. If it ever
# fails the image still works, just without the speed-up.
RUN java -XX:ArchiveClassesAtExit=application.jsa         -Dspring.context.exit=onRefresh         -Dspring.flyway.enabled=false         -Dspring.jpa.hibernate.ddl-auto=none         -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false         -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect         -Dspring.kafka.admin.auto-create=false         -jar application.jar     || echo "WARNING: CDS training run failed - image works, but starts slower"

USER app
EXPOSE 8084
# MaxRAMPercentage=75: heap = 75% of the container memory limit (set one!).
# ExitOnOutOfMemoryError: crash fast and let Kubernetes restart the pod
# instead of limping along in a half-broken state.
ENTRYPOINT ["java", "-XX:SharedArchiveFile=application.jsa", "-Xlog:cds=off", "-Xlog:cds+dynamic=off",             "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-jar", "application.jar"]
