// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secret_name = "docdb-mongo-login";

const secret_client = new SecretsManagerClient({
  region: "us-east-1",
});

const { MongoClient, ObjectId } = require("mongodb");
const config = require("./config");

async function getClient() {
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
  const mongo_uri = `mongodb://${secret.username}:${secret.password}@${secret.host}:${secret.port}/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;

  return new MongoClient(mongo_uri);
}

module.exports = {
  mongoInsertBody: async function (body) {
    let client = await getClient();
    // Inserts the specified body as a document, then returns the document Id
    try {
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db(config.MONGO_DB_NAME);
      const collection = db.collection("request_bodies");
      let result = await collection.insertOne({ body: body });
      await client.close();

      return result.insertedId.toString();
    } catch (e) {
      console.error(e);
    }
  },

  mongoGetBody: async function (docId) {
    let client = await getClient();
    //Returns the body of the specified document
    try {
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db(config.MONGO_DB_NAME);
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
    let client = await getClient();
    //Deletes the request with the specified document Id, returns the deletion count
    try {
      await client.connect();
      console.log("Connected successfully to server");
      const db = client.db(config.MONGO_DB_NAME);
      const collection = db.collection("request_bodies");

      let result = await collection.deleteOne({ _id: new ObjectId(docId) });
      await client.close();

      return result.deletedCount;
    } catch (e) {
      console.error(e);
    }
  },
};
