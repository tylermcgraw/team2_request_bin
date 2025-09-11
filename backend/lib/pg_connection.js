// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secret_name = "postgres-rds-db";
const secret_client = new SecretsManagerClient({
  region: "us-east-1",
});

const { Client } = require("pg");
const config = require("./config");
const CONNECTION = {
  host: config.PG_HOST,
  database: config.PG_DATABASE,
};

function logQuery(statement, parameters) {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
}

module.exports = async function pgQuery(statement, ...parameters) {
  let response;

  try {
    response = await secret_client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
      })
    );
  } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
  }

  const secret = JSON.parse(response.SecretString);
  CONNECTION.user = secret.username;
  CONNECTION.password = secret.password;

  let client = new Client(CONNECTION);

  await client.connect();
  logQuery(statement, parameters);
  let result = await client.query(statement, parameters);
  await client.end();

  return result;
};
