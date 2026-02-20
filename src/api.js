import axios from 'axios';
import { getConfig } from './config.js';

const BASE_URL = 'https://public-api.sandbox.bunq.com/v1';

async function apiRequest(method, endpoint, data = null, params = null) {
  const apiKey = getConfig('apiKey');
  
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': apiKey ? `Bearer ${apiKey}` : '',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  if (params) config.params = params;
  if (data) config.data = data;

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      throw new Error('Authentication failed. Check your API key.');
    } else if (status === 403) {
      throw new Error('Access forbidden. Check your permissions.');
    } else if (status === 404) {
      throw new Error('Resource not found.');
    } else if (status === 429) {
      throw new Error('Rate limit exceeded. Please wait before retrying.');
    } else {
      const message = data?.message || data?.error_message || JSON.stringify(data);
      throw new Error(`API Error (${status}): ${message}`);
    }
  } else if (error.request) {
    throw new Error('No response from API. Check your internet connection.');
  } else {
    throw error;
  }
}

export async function listResources(resource, params = {}) {
  return await apiRequest('GET', `/${resource}`, null, params);
}

export async function getResource(resource, id) {
  return await apiRequest('GET', `/${resource}/${id}`);
}

export async function createResource(resource, data) {
  return await apiRequest('POST', `/${resource}`, data);
}

export async function updateResource(resource, id, data) {
  return await apiRequest('PUT', `/${resource}/${id}`, data);
}

export async function deleteResource(resource, id) {
  return await apiRequest('DELETE', `/${resource}/${id}`);
}
