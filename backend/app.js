//Import environment variables
// const config = require("./lib/config");
// const PORT = config.PORT;

// const path = require("path");

//Create an express server
const express = require("express");
const server = express();

// Create a 'ws' server for WebSockets
const http = require("http");
const WebSocket = require("ws"); // 'ws' is a Node.js library for WebSocket client (the backend) and server implementation
const httpServer = http.createServer(server); // This creates an 'http' server
const webSocketServer = new WebSocket.Server({ server: httpServer }); // This creates a WebSocket server and allows it to run on the same port as the http server

//Create API access variable
const PostgreSQL = require("./lib/pg_api");
const pgApi = new PostgreSQL();
const {
  mongoInsertBody,
  mongoGetBody,
  mongoDeleteBody,
} = require("./lib/mongo_connection");

//Import and use 'morgan' to log requests
const morgan = require("morgan");
server.use(morgan("dev"));

// Create validator
const { 
  endpointIsTooLong, 
  endpointContainsSymbols, 
  endpointIsReserved 
} = require("./lib/validator");

//Add body parsing middlewear to make incoming bodies text, regardless of the type
server.use(express.text({ type: "*/*" }));

// Health check path
server.get("/api/health", (req, res) => {
 res.status(200).json({ status: "healthy" });
});

//Handles requests to clear the basket
server.put("/api/baskets/:endpoint", async (req, res) => {
  let endpoint = req.params.endpoint;
  let errorMessage = '';

  try {
    if (!await pgApi.basketExists(endpoint)) {
      errorMessage = "Endpoint does not exist.";
      throw new Error(errorMessage);
    }

    //Get the requests from PG, then clear the bodies from mongo
    let requests = await pgApi.getRequests(endpoint);
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].body) {
        let deleted = await mongoDeleteBody(requests[i].body);

        if (!deleted) throw new Error("Mongo deletion issue");
      }
    }

    let basketCleared = await pgApi.clearBasket(endpoint);
    if (!basketCleared) {
      let errorMessage = "Basket couldn't be cleared.";
      throw new Error(errorMessage);
    }

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

// Handles requests to delete a basket
server.delete("/api/baskets/:endpoint", async (req, res) => {
  let endpoint = req.params.endpoint;
  let errorMessage = '';

  try {
    if (!await pgApi.basketExists(endpoint)) {
      errorMessage = "Endpoint does not exist.";
      throw new Error(errorMessage);
    }

    //Clear the basket's request bodies from mongo first
    //Get the requests from PG, then clear the bodies from mongo
    let requests = await pgApi.getRequests(endpoint);
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].body) {
        let deleted = await mongoDeleteBody(requests[i].body);

        if (!deleted) throw new Error("Mongo deletion issue");
      }
    }

    let basketDeleted = await pgApi.deleteBasket(endpoint);
    if (!basketDeleted) {
      errorMessage = "Basket couldn't be deleted.";
      throw new Error(errorMessage);
    }

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

// Handles requests to get all of the requests in a basket
server.get("/api/baskets/:endpoint", async (req, res) => {
  let endpoint = req.params.endpoint;
  let errorMessage = '';

  try {
    if (!await pgApi.basketExists(endpoint)) {
      errorMessage = "Endpoint does not exist.";
      throw new Error(errorMessage);
    }
    
    let requests = await pgApi.getRequests(endpoint);
    if (!requests) {
      errorMessage = "Requests couldn't be fetched.";
      throw new Error(errorMessage);
    }

    // Get each request's body from mongo and replace the body property on it with what mongo returns
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].id) {
        let mongoDocId = requests[i].body;
        requests[i].body = await mongoGetBody(mongoDocId);
      }
    }

    res
      .setHeader("Content-Type", "application/json")
      .send(JSON.stringify(requests));
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

// Handles requests to create a new basket
server.post("/api/baskets/:endpoint", async (req, res) => {
  let endpoint = req.params.endpoint;
  let errorMessage = '';

  try {
    if (await pgApi.basketExists(endpoint)) {
      // 409 CONFLICT
      errorMessage = "Could not create basket: endpoint already exists.";
      res.status(409).send(errorMessage);
      throw new Error(errorMessage);
    }

    if (endpointIsTooLong(endpoint)) {
      // 414 URI TOO LONG
      errorMessage = "Could not create basket: endpoint length cannot exceed 100 characters.";
      res.status(414).send(errorMessage);
      throw new Error(errorMessage);
    }

    if (endpointContainsSymbols(endpoint)) {
      // 400 BAD REQUEST
      errorMessage = "Could not create basket: endpoint can only contain alphanumeric characters.";
      res.status(400).send(errorMessage);
      throw new Error(errorMessage);
    }
    
    if (endpointIsReserved(endpoint)) {
      // 403 FORBIDDEN - /web and /api are reserved
      errorMessage = "Could not create basket: endpoint conflicts with reserved system path.";
      res.status(403).send(errorMessage);
      throw new Error(errorMessage);
    }

    let newBasket = await pgApi.createBasket(endpoint);
    if (!newBasket) {
      errorMessage = "Couldn't create basket.";
      throw new Error(errorMessage);
    }

    res.status(201).send();
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

// Handles requests to create a new url endpoint
server.get("/api/new_url_endpoint", async (_req, res) => {
  let errorMessage = '';
  try {
    let newURLEndpoint = await pgApi.getNewURLEndpoint();
    if (!newURLEndpoint) {
      errorMessage = "Couldn't generate new url endpoint.";
      throw new Error(errorMessage);
    }

    res.json(newURLEndpoint);
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

// Handles connection for WebSocket(s) on client(s)
webSocketServer.on('connection', (ws) => {
  console.log('WebSocket client connected!');

  ws.on('error', console.error);

  ws.on('close', () => {
    console.log('WebSocket client closed!')
  });
});

//Handles any type of request to the exposed endpoint, sends request data to request table (webhooks use this endpoint)
server.all("/api/:endpoint", async (req, res) => {
  let headers = JSON.stringify(req.headers);
  let method = req.method;
  let body = req.body; //Stored in Mongo
  let endpoint = req.params.endpoint;
  let errorMessage = '';

  try {
    if (!await pgApi.basketExists(endpoint)) {
      errorMessage = "Endpoint does not exist.";
      throw new Error(errorMessage);
    }
    
    //Add the body to Mongo and get a document ID
    let documentId = await mongoInsertBody(body);

    // Try adding the request to the SQL database if it fails, send 404 error
    let requestAdded = await pgApi.addRequest(
      endpoint,
      headers,
      method,
      documentId
    );
    if (!requestAdded) {
      errorMessage = "Request couldn't be added.";
      throw new Error(errorMessage);
    }

    // Sends a request directly to client using the WebSocket connection
    let request = { timestamp: new Date(), method, headers, body, endpoint };
    webSocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'new_request', data: request}));
      }
    });

    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(404).send(errorMessage);
  }
});

//Error handler (Last Line of Defense)
server.use((error, _req, res, _next) => {
  console.log(error);
  res.status(404).render("error", { error: error });
});

httpServer.listen(3001, () => {
  console.log(`Your server is now live on 3001`);
});
