const { Client } = require("pg");
const config = require("./config");
const CONNECTION = {
  user: config.PGUSER,
  password: config.PGPASSWORD,
  database: config.PGDATABASE,
  host: config.PGHOST,
  port: config.PGPORT,
};

function logQuery(statement, parameters) {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
}

module.exports = async function pgQuery(statement, ...parameters) {
  let client = new Client(CONNECTION);

  await client.connect();
  logQuery(statement, parameters);
  let result = await client.query(statement, parameters);
  await client.end();

  return result;
};
