// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secret_name = "postgres-rds-db";
const secret_client = new SecretsManagerClient({ region: "us-east-1" });

const { 
  SSMClient, 
  GetParameterCommand 
} = require("@aws-sdk/client-ssm");

const ssmClient = new SSMClient({ region: "us-east-1" });

const { Client } = require("pg");

function logQuery(statement, parameters) {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
}

async function getDatabaseName() {
  // Define the command's input
  const input = {
    Name: "pg_database", // The full name of your parameter
  };

  // Create and send the command
  const command = new GetParameterCommand(input);

  try {
    const response = await ssmClient.send(command);
    const name = response.Parameter.Value;
    return name;
  } catch (error) {
    console.error("Failed to fetch database name:", error);
    throw error;
  }
};

async function getSecrets() {
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

  return response.SecretString;
}

module.exports = async function pgQuery(statement, ...parameters) {
  const secret = JSON.parse(await getSecrets());

  let client = new Client({
    database: await getDatabaseName(),
    user: secret.username,
    password: secret.password,
    host: secret.host,
  });

  await client.connect();
  logQuery(statement, parameters);
  let result = await client.query(statement, parameters);
  await client.end();

  return result;
};
