const { Pool } = require("pg");

const dbPool = new Pool({
  database: "personal_web_d12",
  port: "5432",
  user: "postgres",
  password: "anddev0804",
});

module.exports = dbPool;
