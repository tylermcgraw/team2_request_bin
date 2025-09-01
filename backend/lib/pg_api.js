const pgQuery = require("./pg_connection");

module.exports = class PostgreSQL {
  //Returns the id of a basket based on an endpoint
  async getBasketId(urlEndpoint) {
    try {
      let basketId = await pgQuery(
        "SELECT id FROM baskets WHERE url_endpoint = $1",
        urlEndpoint
      );
      return basketId.rows[0].id;
    } catch (e) {
      console.error(`Couldn't get basketId: ${e}`);
      return false;
    }
  }

  // Checks if a basket exists
  async isDuplicateBasket(urlEndpoint) {
    return await this.getBasketId(urlEndpoint) !== false;
  }

  // Return a potential url endpoint
  async getNewURLEndpoint() {
    try {
      let urlEndpoint;
      do {
        urlEndpoint = generateURLEndpoint();
      }
      while (await this.isDuplicateBasket(urlEndpoint));

      return urlEndpoint;
    } catch (e) {
      console.error(`Couldn't create url endpoint: ${e}`);
      return false;
    }

    function generateURLEndpoint() {
      const CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';
      const URL_LENGTH = 7;
      let url = '';
      for (let idx = 0; idx < URL_LENGTH; idx += 1) {
        let randomChar = CHARS[Math.floor(Math.random() * CHARS.length)];
        url += randomChar;
      }
      return url;
    }
  }

  // Creates a new basket with the specified endpoint
  async createBasket(urlEndpoint) {
    try {
      let result = await pgQuery(
        "INSERT INTO baskets (url_endpoint) VALUES ($1)",
        urlEndpoint
      );

      return result.rowCount > 0;
    } catch (e) {
      console.error(`Couldn't create basket: ${e}`);
      return false;
    }
  }

  // Deletes the corresponding basket
  async deleteBasket(urlEndpoint) {
    try {
      let basketId = await this.getBasketId(urlEndpoint);

      let result = await pgQuery(
        "DELETE FROM baskets WHERE basket_id = $1",
        basketId
      );

      return result.rowCount > 0;
    } catch (e) {
      console.error(`Couldn't delete basket: ${e}`);
      return false;
    }
  }

  // Deletes all requests from the corresponding basket
  async clearBasket(urlEndpoint) {
    try {
      let basketId = await this.getBasketId(urlEndpoint);

      let result = await pgQuery(
        "DELETE FROM requests WHERE basket_id = $1",
        basketId
      );

      return result.rowCount > 0;
    } catch (e) {
      console.error(`Couldn't clear basket: ${e}`);
      return false;
    }
  }

  // Adds a request to the database
  async addRequest(urlEndpoint, method, headers, mongoDocumentId) {
    try {
      let basketId = await this.getBasketId(urlEndpoint);

      let requestAdded = await pgQuery(
        "INSERT INTO requests (basket_id, headers, method, body) VALUES ($1, $2, $3, $4)",
        basketId,
        method,
        headers,
        mongoDocumentId
      );

      //Signifies whether the query truly worked
      return requestAdded.rowCount > 0;
    } catch (e) {
      console.error(`Couldn't add request: ${e}`);
      return false;
    }
  }

  // Returns an array of objects representing
  async getRequests(urlEndpoint) {
    try {
      let basketId = await this.getBasketId(urlEndpoint);

      let result = await pgQuery(
        "SELECT (arrival_timestamp, headers, method, body) FROM requests WHERE basket_id = $1",
        basketId
      );

      return result.rows;
    } catch (e) {
      console.error(`Couldn't get requests: ${e}`);
      return false;
    }
  }
};
