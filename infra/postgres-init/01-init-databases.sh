#!/bin/bash
set -e

for svc in identity inventory sales master_data reporting procurement finance; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE USER ${svc}_user WITH PASSWORD '${svc}_pass';
    CREATE DATABASE ${svc}_db OWNER ${svc}_user;
    GRANT ALL PRIVILEGES ON DATABASE ${svc}_db TO ${svc}_user;
EOSQL
done
