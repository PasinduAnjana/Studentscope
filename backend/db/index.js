const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "postgres"}:${
      process.env.DB_PASSWORD || 123
    }@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}/${
      process.env.DB_NAME || "studentscope"
    }`,
});

module.exports = pool;
