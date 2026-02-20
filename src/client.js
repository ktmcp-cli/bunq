import axios from 'axios';
import crypto from 'crypto';
import { getBaseUrl, getConfig } from './config.js';

/**
 * Create a signed axios request for the Bunq API.
 * Bunq requires each request to be signed with the client's private key.
 */
function signRequest(method, endpoint, body, privateKeyPem) {
  const bodyString = body ? JSON.stringify(body) : '';
  const dataToSign = `${method.toUpperCase()} /v1${endpoint}\n\n${bodyString}`;

  try {
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    const signature = sign.sign(privateKeyPem, 'base64');
    return signature;
  } catch {
    // If signing fails (e.g., no key yet), return empty string
    return '';
  }
}

export async function bunqRequest(method, endpoint, body = null, token = null) {
  const config = getConfig();
  const baseUrl = getBaseUrl();
  const authToken = token || config.sessionToken || config.installationToken;

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Bunq-Language': 'en_US',
    'X-Bunq-Region': 'en_US',
    'X-Bunq-Client-Request-Id': crypto.randomUUID(),
    'X-Bunq-Geolocation': '0 0 0 0 000',
  };

  if (authToken) {
    headers['X-Bunq-Client-Authentication'] = authToken;
  }

  // Sign if we have a private key
  if (config.privateKey) {
    const signature = signRequest(method, endpoint, body, config.privateKey);
    if (signature) {
      headers['X-Bunq-Client-Signature'] = signature;
    }
  }

  const response = await axios({
    method,
    url: `${baseUrl}${endpoint}`,
    data: body,
    headers,
  });

  return response.data;
}

export async function bunqGet(endpoint) {
  return bunqRequest('GET', endpoint);
}

export async function bunqPost(endpoint, body, token = null) {
  return bunqRequest('POST', endpoint, body, token);
}

export async function bunqPut(endpoint, body) {
  return bunqRequest('PUT', endpoint, body);
}

export async function bunqDelete(endpoint) {
  return bunqRequest('DELETE', endpoint);
}
