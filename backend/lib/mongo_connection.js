const { MongoClient, ObjectId } = require("mongodb");
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
      SecretId: "mongo-credentials",
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

const buildUri = (config) => {
 return `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/?${config.options}`;
};

async function getMongoConfig() {
  try {
    const [credentials, host, port, options] = await Promise.all([
      getCredentials(),
      getParameter("/documentdb/host"),
      getParameter("/documentdb/port"),
      getParameter("/documentdb/options"),
    ]);

    return buildUri({
      username: credentials.username,
      password: credentials.password,
      host,
      port,
      options,
    });
  } catch (error) {
    throw new Error(
      `Failed to get database configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

module.exports = {
  mongoInsertBody: async function (body) {
    // Inserts the specified body as a document, then returns the document Id
    try {
      const monogoUri = await getMongoConfig();
      const client = new MongoClient(monogoUri);
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db('request_bin');
      const collection = db.collection("request_bodies");
      let result = await collection.insertOne({ body: body });
      await client.close();

      return result.insertedId.toString();
    } catch (e) {
      console.error(e);
    }
  },

  mongoGetBody: async function (docId) {
    //Returns the body of the specified document
    try {
      const monogoUri = await getMongoConfig();
      const client = new MongoClient(monogoUri);
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db('request_bin');
      const collection = db.collection("request_bodies");

      let result = await collection.findOne({ _id: new ObjectId(docId) });
      await client.close();

      // console.log(result);
      return result.body;
    } catch (e) {
      console.error(e);
    }
  },

  mongoDeleteBody: async function (docId) {
    //Deletes the request with the specified document Id, returns the deletion count
    try {
      const monogoUri = await getMongoConfig();
      const client = new MongoClient(monogoUri);
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db('request_bin');
      const collection = db.collection("request_bodies");

      let result = await collection.deleteOne({ _id: new ObjectId(docId) });
      await client.close();

      return result.deletedCount;
    } catch (e) {
      console.error(e);
    }
  },
};
