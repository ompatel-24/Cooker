import snowflake from "snowflake-sdk";

// Disable OOB telemetry
snowflake.configure({ logLevel: "WARN" });

let connectionPool = null;

function getPool() {
  if (connectionPool) return connectionPool;

  connectionPool = snowflake.createPool(
    {
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      database: process.env.SNOWFLAKE_DATABASE,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
    },
    { max: 5, min: 0 }
  );

  return connectionPool;
}

/**
 * Execute a SQL query against Snowflake and return rows.
 * @param {string} sql - SQL statement (use ? for bind params)
 * @param {any[]} binds - Bind parameter values
 * @returns {Promise<object[]>} - Array of row objects
 */
export async function querySnowflake(sql, binds = []) {
  const pool = getPool();

  return new Promise((resolve, reject) => {
    pool.use(async (clientConnection) => {
      return new Promise((res, rej) => {
        clientConnection.execute({
          sqlText: sql,
          binds,
          complete: (err, _stmt, rows) => {
            if (err) {
              rej(err);
              reject(err);
            } else {
              res(rows);
              resolve(rows);
            }
          },
        });
      });
    });
  });
}
