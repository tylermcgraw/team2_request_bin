//Import environment variables
const env = require("./lib/config");
const HOST = env.HOST;
const PORT = env.PORT;

//Create an express server
const express = require("express");
const server = express();

//Create API access variable
const PostgreSQL = require("./lib/pg_api");
const pgApi = new PostgreSQL();

//Import and use 'morgan' to log requests
const morgan = require("morgan");
server.use(morgan("dev"));

//Add body parsing middlewear to make incoming bodies text, regardless of the type
server.use(express.text({ type: "*/*" }));

//Handles any type of request to the exposed endpoint, sends request data to request table
server.all("/:endpoint", async (req, res) => {
  let method = req.method;
  let headers = JSON.stringify(req.headers);
  let body = req.body; //Stored in Mongo
  let endpoint = req.params.endpoint;

  //Add the body to Mongo and get a document ID
  let documentId = body ? Math.random() * 1000 : undefined;

  // Try adding the request to the SQL database if it fails, send 404 error
  try {
    let requestAdded = await pgApi.addRequest(
      endpoint,
      method,
      headers,
      documentId
    );
    if (!requestAdded) throw new Error("Request couldn't be added.");

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

//Handles requests to clear the basket
server.put("/api/baskets/:endpoint", async (req, res) => {
  //Don't allow non-local requests to this endpoint
  if (!req.headers.host.includes("localhost")) {
    res.status(403).send("API access denied");
  }

  let endpoint = req.params.endpoint;

  try {
    let basketCleared = await pgApi.clearBasket(endpoint);
    if (!basketCleared) throw new Error("Basket couldn't be cleared.");

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

// Handles requests to delete a basket
server.delete("/api/baskets/:endpoint", async (req, res) => {
  //Don't allow non-local requests to this endpoint
  if (!req.headers.host.includes("localhost")) {
    res.status(403).send("API access denied");
  }

  let endpoint = req.params.endpoint;

  try {
    let basketDeleted = await pgApi.deleteBasket(endpoint);
    if (!basketDeleted) throw new Error("Basket couldn't be deleted.");

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

// Handles requests to get all of the requests in a basket
server.get("/api/baskets/:endpoint", async (req, res) => {
  //Don't allow non-local requests to this endpoint
  if (!req.headers.host.includes("localhost")) {
    res.status(403).send("API access denied");
  }

  let endpoint = req.params.endpoint;

  try {
    let requests = await pgApi.getRequests(endpoint);
    if (!requests) throw new Error("Requests couldn't be fetched.");

    res.json(requests);
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

// Handles requests to create a new basket
server.post("/api/baskets/:endpoint", async (req, res) => {
  //Don't allow non-local requests to this endpoint
  if (!req.headers.host.includes("localhost")) {
    res.status(403).send("API access denied");
  }

  let endpoint = req.params.endpoint;

  try {
    let isDuplicateBasket = await pgApi.isDuplicateBasket(endpoint);
    if (isDuplicateBasket) {
      res.status(403).send(`Failed to create a basket. ${endpoint} already exists.`);
    }

    let newBasket = await pgApi.createBasket(endpoint);
    if (!newBasket) throw new Error("Couldn't create basket.");

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

// Handles requests to create a new url endpoint
server.get("/api/new_url_endpoint", async (req, res) => {
  //Don't allow non-local requests to this endpoint
  if (!req.headers.host.includes("localhost")) {
    res.status(403).send("API access denied");
  }

  try {
    let newURLEndpoint = await pgApi.getNewURLEndpoint();
    if (!newURLEndpoint) throw new Error("Couldn't generate new url endpoint.");

    res.json(newURLEndpoint);
  } catch (e) {
    console.error(e);
    res.status(404).send();
  }
});

//Error handler (Last Line of Defense)
server.use((error, req, res, _next) => {
  console.log(error);
  res.status(404).render("error", { error: error });
});

server.listen(PORT, () => {
  console.log(`Your server is now live on ${HOST}:${PORT}`);
});
