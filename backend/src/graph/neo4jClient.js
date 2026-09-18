'use strict';

/**
 * neo4jClient.js
 * Neo4j Graph Database Driver client with graceful fallback.
 */

let neo4j = null;
try {
  neo4j = require('neo4j-driver');
} catch (e) {
  // driver not available
}

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

let driver = null;
let isConnected = false;

function initNeo4j() {
  if (!NEO4J_URI || !neo4j) {
    return null;
  }
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2000,
    });
    driver.verifyConnectivity()
      .then(() => {
        isConnected = true;
        console.log(`[Neo4j] Connected to graph database at ${NEO4J_URI}`);
      })
      .catch((err) => {
        isConnected = false;
        console.log(`[Neo4j] Standalone Neo4j not running (${err.message}). Using native SQLite Graph Engine.`);
      });
    return driver;
  } catch (err) {
    console.log(`[Neo4j] Initialization skipped: ${err.message}`);
    return null;
  }
}

function getNeo4jDriver() {
  if (!driver) initNeo4j();
  return driver;
}

function isNeo4jActive() {
  return isConnected;
}

async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
    isConnected = false;
  }
}

module.exports = {
  getNeo4jDriver,
  isNeo4jActive,
  closeNeo4j,
  initNeo4j,
};
