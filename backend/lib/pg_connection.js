const { Client } = require("pg");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

// const config = require("./config");

// Create secretsClient and ssmClient objects
const secretsClient = new SecretsManagerClient({ region: "us-east-1" });
const ssmClient = new SSMClient({ region: "us-east-1" });

// Helper function get DB credentials from secrets manager
const getCredentials = async function () {
  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: "rds-credentials",
      VersionStage: "AWSCURRENT",
    })
  );

  if (!response.SecretString) {
    throw new Error("Database credentials not found!");
  }

  return JSON.parse(response.SecretString);
};

// Helper function to get a parameter from SSM parameter store
const getParameter = async function(paramName) {
 const response = await ssmClient.send(new GetParameterCommand({ Name: paramName }));

 if (!response.Parameter?.Value) {
  throw new Error(`Parameter ${paramName} not found!`);
 }

 return response.Parameter.Value;
};

// Function to get DB connection details
async function getDbDetails() {
  try {
    const [credentials, database, host, portStr] = await Promise.all([
      getCredentials(),
      getParameter("/rds/database"),
      getParameter("/rds/host"),
      getParameter("/rds/port")
    ]);

    const port = Number(portStr);
    if (isNaN(port)) {
      throw new Error("Invalid port number");
    }

    return {
      user: credentials.username,
      password: credentials.password,
      database,
      host,
      port,
    };
  } catch (error) {
    throw new Error(
      `Failed to get database configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

const CONNECTION = await getDbDetails();

// const CONNECTION = {
//   user: config.PGUSER,
//   password: config.PGPASSWORD,
//   database: config.PGDATABASE,
//   host: 'database-postgres.cofsigasi5ap.us-east-1.rds.amazonaws.com',
//   port: 5432,
// };

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
