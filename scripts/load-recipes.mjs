#!/usr/bin/env node

/**
 * One-time script to load Food.com recipes into Snowflake.
 *
 * Prerequisites:
 *   1. Download RAW_recipes.csv from:
 *      https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions
 *   2. Place the file at: scripts/data/RAW_recipes.csv
 *   3. Fill in your Snowflake credentials in .env
 *   4. Run:  node scripts/load-recipes.mjs
 *
 * The script will:
 *   - Parse the CSV
 *   - Convert Python-style string lists → JSON arrays
 *   - Convert nutrition PDV values → approximate grams
 *   - Create the RECIPES table in Snowflake (drops if exists)
 *   - Bulk insert all rows in batches of 500
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import snowflake from "snowflake-sdk";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

// ─── Config ──────────────────────────────────────────────────────────────────
const CSV_PATH = resolve(__dirname, "data/RAW_recipes.csv");
const BATCH_SIZE = 500;

// ─── Snowflake connection ────────────────────────────────────────────────────
function connect() {
  return new Promise((res, rej) => {
    const conn = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      database: process.env.SNOWFLAKE_DATABASE,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
    });
    conn.connect((err, c) => (err ? rej(err) : res(c)));
  });
}

function exec(conn, sql, binds = []) {
  return new Promise((res, rej) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, _stmt, rows) => (err ? rej(err) : res(rows)),
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert Python-style string list to JS array, e.g. "['a', 'b']" → ["a","b"] */
function parsePythonList(raw) {
  if (!raw || raw === "[]") return [];
  try {
    // Replace single quotes with double quotes for valid JSON
    const jsonStr = raw.replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch {
    // Fallback: strip brackets and split
    return raw
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
}

/** Convert minutes integer → human-readable string */
function minutesToReadable(mins) {
  const m = parseInt(mins, 10);
  if (!m || m <= 0) return "Unknown";
  if (m < 60) return `${m} minutes`;
  const hrs = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return hrs === 1 ? "1 hour" : `${hrs} hours`;
  return `${hrs}h ${rem}m`;
}

/**
 * Parse the nutrition column.
 * Format: [calories, total_fat(PDV), sugar(PDV), sodium(PDV), protein(PDV), sat_fat(PDV), carbs(PDV)]
 * Returns { calories, protein_g, fat_g, carbs_g }
 */
function parseNutrition(raw) {
  const defaults = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
  if (!raw) return defaults;
  try {
    const nums = JSON.parse(raw);
    if (!Array.isArray(nums) || nums.length < 7) return defaults;
    return {
      calories: Math.round(nums[0]),           // absolute kcal
      fat_g: Math.round(nums[1] * 0.78),       // PDV → grams (78g daily ref)
      // nums[2] = sugar PDV (skip)
      // nums[3] = sodium PDV (skip)
      protein_g: Math.round(nums[4] * 0.5),    // PDV → grams (50g daily ref)
      // nums[5] = sat fat PDV (skip)
      carbs_g: Math.round(nums[6] * 3.0),      // PDV → grams (300g daily ref)
    };
  } catch {
    return defaults;
  }
}

// ─── CSV parsing (simple, handles the Food.com format) ──────────────────────

/**
 * Parse a single CSV line respecting quoted fields.
 * Food.com CSV uses double-quote escaping.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to Snowflake...");
  const conn = await connect();
  console.log("Connected!");

  // Create table
  console.log("Creating RECIPES table...");
  await exec(conn, `DROP TABLE IF EXISTS RECIPES`);
  await exec(
    conn,
    `CREATE TABLE RECIPES (
      ID            INTEGER AUTOINCREMENT PRIMARY KEY,
      TITLE         VARCHAR(16777216),
      INGREDIENTS   VARIANT,
      STEPS         VARIANT,
      MINUTES       INTEGER,
      TIME_TO_MAKE  VARCHAR(100),
      CALORIES      FLOAT,
      PROTEIN_G     FLOAT,
      FAT_G         FLOAT,
      CARBS_G       FLOAT,
      TAGS          VARIANT,
      N_INGREDIENTS INTEGER,
      N_STEPS       INTEGER
    )`
  );
  console.log("Table created.");

  // Read CSV
  const rl = createInterface({
    input: createReadStream(CSV_PATH, "utf-8"),
    crlfDelay: Infinity,
  });

  let headers = null;
  let batch = [];
  let total = 0;
  let skipped = 0;

  const INSERT_SQL = `
    INSERT INTO RECIPES (TITLE, INGREDIENTS, STEPS, MINUTES, TIME_TO_MAKE, CALORIES, PROTEIN_G, FAT_G, CARBS_G, TAGS, N_INGREDIENTS, N_STEPS)
    SELECT
      column1,
      PARSE_JSON(column2),
      PARSE_JSON(column3),
      column4::INTEGER,
      column5,
      column6::FLOAT,
      column7::FLOAT,
      column8::FLOAT,
      column9::FLOAT,
      PARSE_JSON(column10),
      column11::INTEGER,
      column12::INTEGER
    FROM VALUES ${Array(BATCH_SIZE).fill("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
  `;

  async function flushBatch(rows) {
    if (rows.length === 0) return;

    // Build a custom INSERT for partial batches
    const sql = `
      INSERT INTO RECIPES (TITLE, INGREDIENTS, STEPS, MINUTES, TIME_TO_MAKE, CALORIES, PROTEIN_G, FAT_G, CARBS_G, TAGS, N_INGREDIENTS, N_STEPS)
      SELECT
        column1,
        PARSE_JSON(column2),
        PARSE_JSON(column3),
        column4::INTEGER,
        column5,
        column6::FLOAT,
        column7::FLOAT,
        column8::FLOAT,
        column9::FLOAT,
        PARSE_JSON(column10),
        column11::INTEGER,
        column12::INTEGER
      FROM VALUES ${rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
    `;

    const binds = rows.flat();
    await exec(conn, sql, binds);
  }

  // Column indices in RAW_recipes.csv:
  // name(0), id(1), minutes(2), contributor_id(3), submitted(4),
  // tags(5), nutrition(6), n_steps(7), steps(8), description(9),
  // ingredients(10), n_ingredients(11)

  for await (const line of rl) {
    if (!headers) {
      headers = parseCSVLine(line);
      console.log("CSV headers:", headers);
      continue;
    }

    const cols = parseCSVLine(line);
    if (cols.length < 12) {
      skipped++;
      continue;
    }

    // Truncate very long names to 1000 chars as a safety measure
    const name = cols[0].slice(0, 1000);
    const minutes = parseInt(cols[2], 10) || 0;
    const tags = parsePythonList(cols[5]);
    const nutrition = parseNutrition(cols[6]);
    const nSteps = parseInt(cols[7], 10) || 0;
    const steps = parsePythonList(cols[8]);
    const ingredients = parsePythonList(cols[10]);
    const nIngredients = parseInt(cols[11], 10) || 0;

    // Skip recipes with no steps or no ingredients
    if (ingredients.length === 0 || steps.length === 0) {
      skipped++;
      continue;
    }

    batch.push([
      name,                           // TITLE
      JSON.stringify(ingredients),     // INGREDIENTS (JSON string for PARSE_JSON)
      JSON.stringify(steps),           // STEPS
      minutes,                         // MINUTES
      minutesToReadable(minutes),      // TIME_TO_MAKE
      nutrition.calories,              // CALORIES
      nutrition.protein_g,             // PROTEIN_G
      nutrition.fat_g,                 // FAT_G
      nutrition.carbs_g,               // CARBS_G
      JSON.stringify(tags),            // TAGS
      nIngredients,                    // N_INGREDIENTS
      nSteps,                          // N_STEPS
    ]);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      total += batch.length;
      batch = [];
      if (total % 5000 === 0) {
        console.log(`  Inserted ${total} rows...`);
      }
    }
  }

  // Flush remaining rows
  if (batch.length > 0) {
    await flushBatch(batch);
    total += batch.length;
  }

  console.log(`\nDone! Inserted ${total} recipes (skipped ${skipped} invalid rows).`);

  // Verify
  const [{ COUNT }] = await exec(conn, "SELECT COUNT(*) AS COUNT FROM RECIPES");
  console.log(`Verification: ${COUNT} rows in RECIPES table.`);

  conn.destroy((err) => {
    if (err) console.error("Disconnect error:", err);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
