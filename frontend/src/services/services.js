import axios from 'axios';
const baseUrl = '/api';

export const getRandomNewBasketName = async () => {
  const response = await axios.get(`${baseUrl}/new_url_endpoint`);
  return response.data;
};

export const createNewBasket = async (newBasketName) => {
  const response = await axios.post(`${baseUrl}/baskets/${newBasketName}`);
  return response.data;
};

const getRequests = async (urlEndpoint) => {
  const response = await axios.get(`${baseUrl}/baskets/${urlEndpoint}`);
  return response.data;
};

const clearBasket = async (urlEndpoint) => {
  return axios.put(`${baseUrl}/baskets/${urlEndpoint}`);
}

const deleteBasket = (urlEndpoint) => {
  return axios.delete(`${baseUrl}/baskets/${urlEndpoint}`);
};

export default { getRandomNewBasketName, createNewBasket, deleteBasket, getRequests, clearBasket };
