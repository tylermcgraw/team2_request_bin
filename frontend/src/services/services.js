import axios from 'axios';

const host = location.hostname;
export const DOMAIN =
  host === "localhost"
    ? `${location.protocol}//${host}:${location.port}`
    : `${location.protocol}//${host}`;

export const getRandomNewBasketName = async () => {
  const response = await axios.get(`${DOMAIN}/api/new_url_endpoint`);
  return response.data;
};

export const createNewBasket = async (newBasketName) => {
  const response = await axios.post(`${DOMAIN}/api/baskets/${newBasketName}`);
  return response.data;
};

const getRequests = async (urlEndpoint) => {
  const response = await axios.get(`${DOMAIN}/api/baskets/${urlEndpoint}`);
  return response.data;
};

const clearBasket = async (urlEndpoint) => {
  return axios.put(`${DOMAIN}/api/baskets/${urlEndpoint}`);
};

const deleteBasket = (urlEndpoint) => {
  return axios.delete(`${DOMAIN}/api/baskets/${urlEndpoint}`);
};

export default {
  getRandomNewBasketName,
  createNewBasket,
  deleteBasket,
  getRequests,
  clearBasket,
};