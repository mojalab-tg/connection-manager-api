/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

'use strict';
const HubEndpointItemModel = require('../models/HubEndpointItemModel');
const { validateIPAddressInput, validatePorts, validateURLInput } = require('../utils/formatValidator');
const ValidationError = require('../errors/ValidationError');

/**
 * Creates a HubEndpoint, used by the createHubEgressIP and createHubIngressIP methods
 *
 * @param {IPEntry} body IPEntry
 * @param {String{'EGRESS'|'INGRESS'}} direction
 */
const createHubIp = async (body, direction) => {
  const inputIpEntry = body.value;
  if (!inputIpEntry.address) {
    throw new ValidationError('No address received');
  }
  if (!inputIpEntry.ports) {
    throw new ValidationError('No ports received');
  }
  if (!Array.isArray(inputIpEntry.ports)) {
    throw new ValidationError('No ports array received');
  }
  if (!inputIpEntry.ports.length === 0) {
    throw new ValidationError('Empty ports array received');
  }
  validateIPAddressInput(inputIpEntry.address);
  validatePorts(inputIpEntry.ports);

  const endpointItem = {
    state: 'NEW',
    type: 'IP',
    value: JSON.stringify(inputIpEntry),
    direction,
  };
  return endpointItem;
};

/**
 * Adds a new IP entry to the Hub Egress endpoint
 *
 * body InputIP Hub egress IP
 * returns EndPointIp
 **/
exports.createHubEgressIp = async (ctx, body) => {
  const endpointItem = await createHubIp(body, 'EGRESS');
  const id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};

/**
 * Adds a new IP entry to the Hub Ingress endpoint
 *
 * body InputIP Hub ingress IP
 * returns EndPointIp
 **/

// befor custom
exports.createHubIngressIp1 = async (ctx, body) => {
  const endpointItem = await createHubIp(body, 'INGRESS');
  const id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};
exports.createHubIngressIp = async (ctx, body) => {
  const endpointItem = await createHubIp(body, 'INGRESS');
  const id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id[0]);
};

/**
 * returns EndPointIp
 */
exports.getHubEgressIps = async ctx => HubEndpointItemModel.findObjectByDirectionType('EGRESS', 'IP');

/**
 * returns EndPointIp
 */
exports.getHubIngressIps = async ctx => HubEndpointItemModel.findObjectByDirectionType('INGRESS', 'IP');

/**
 * Set the Hub Ingress URL
 * The Hub operator sends the ingress URL
 *
 * body InputURL Hub ingress URL
 * returns EndPointConfigItem
 **/
exports.createHubIngressUrl = async (ctx, body) => {
  const inputURLAddress = body.value;
  if (!inputURLAddress.url) {
    throw new ValidationError('No URL received');
  }
  validateURLInput(inputURLAddress.url);

  const endpointItem = {
    state: 'NEW',
    type: 'URL',
    value: JSON.stringify(inputURLAddress),
    direction: 'INGRESS',
  };
  const id = await HubEndpointItemModel.create(endpointItem);
  return HubEndpointItemModel.findObjectById(id);
};

exports.getHubIngressUrls = async ctx => HubEndpointItemModel.findObjectByDirectionType('INGRESS', 'URL');

exports.getHubEndpoint = async (ctx, epId) => HubEndpointItemModel.findObjectById(epId);

exports.getHubEndpoints = async ctx => HubEndpointItemModel.findObjectAll();

/**
 *
 */

// before custom
exports.updateHubEndpoint1 = async (ctx, epId, body) => {
  await HubEndpointItemModel.findObjectById(epId);
  if (body.value && body.value.address) {
    validateIPAddressInput(body.value.address);
  }
  if (body.value && body.value.ports) {
    validatePorts(body.value.ports);
  }
  if (body.value && body.value.url) {
    validateURLInput(body.value.url);
  }

  const endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  const updatedEndpoint = await HubEndpointItemModel.update(epId, endpointItem);
  return updatedEndpoint;
};
exports.updateHubEndpoint = async (epId, body) => {
  await HubEndpointItemModel.findObjectById(epId);
  if (body.value && body.value.address) {
    validateIPAddressInput(body.value.address);
  }
  if (body.value && body.value.ports) {
    validatePorts(body.value.ports);
  }
  if (body.value && body.value.url) {
    validateURLInput(body.value.url);
  }

  const endpointItem = { ...body };
  if (endpointItem.value) {
    endpointItem.value = JSON.stringify(endpointItem.value);
  }
  const updatedEndpoint = await HubEndpointItemModel.update(epId, endpointItem);
  return updatedEndpoint;
};

// before custom
exports.deleteHubEndpoint1 = async (ctx, epId) => {
  await HubEndpointItemModel.findObjectById(epId);
  await HubEndpointItemModel.delete(epId);
};
exports.deleteHubEndpoint = async (epId) => {
  await HubEndpointItemModel.findObjectById(epId);
  await HubEndpointItemModel.delete(epId);
};

/**
 * Validates that the epId has the same direction and type as the parameters
 *
 * @param {Enum 'INGRESS' or 'EGRESS'} direction
 * @param {Enum 'IP' or 'ADDRESS'} type
 * @param {*} epId
 */
const validateDirectionType = async (direction, type, epId) => {
  const endpoint = await HubEndpointItemModel.findObjectById(epId);
  if (endpoint.direction !== direction) {
    throw new ValidationError(`Wrong direction ${direction}, endpoint has already ${endpoint.direction}`);
  }
  if (endpoint.type !== type) {
    throw new ValidationError(`Wrong type ${type}, endpoint has already ${endpoint.type}`);
  }
};

exports.getHubIngressIpEndpoint = async (ctx, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId);
  return HubEndpointItemModel.findObjectById(epId);
};

exports.updateHubIngressIpEndpoint = async (ctx, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('INGRESS', 'IP', epId);
  return exports.updateHubEndpoint(epId, body);
};

exports.deleteHubIngressIpEndpoint = async (ctx, epId) => {
  await validateDirectionType('INGRESS', 'IP', epId);
  return exports.deleteHubEndpoint(epId);
};

exports.getHubEgressIpEndpoint = async (ctx, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId);
  return HubEndpointItemModel.findObjectById(epId);
};

exports.updateHubEgressIpEndpoint = async (ctx, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'EGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'EGRESS';
  }
  if (body.type) {
    if (body.type !== 'IP') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'IP';
  }
  await validateDirectionType('EGRESS', 'IP', epId);
  return exports.updateHubEndpoint(epId, body);
};

exports.deleteHubEgressIpEndpoint = async (ctx, epId) => {
  await validateDirectionType('EGRESS', 'IP', epId);
  return exports.deleteHubEndpoint(epId);
};

exports.getHubIngressUrlEndpoint = async (ctx, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId);
  return HubEndpointItemModel.findObjectById(epId);
};

exports.updateHubIngressUrlEndpoint = async (ctx, epId, body) => {
  if (body.direction) {
    if (body.direction !== 'INGRESS') {
      throw new ValidationError('Bad direction value');
    }
  } else {
    body.direction = 'INGRESS';
  }
  if (body.type) {
    if (body.type !== 'URL') {
      throw new ValidationError('Bad type value');
    }
  } else {
    body.type = 'URL';
  }
  await validateDirectionType('INGRESS', 'URL', epId);
  return exports.updateHubEndpoint(epId, body);
};

exports.deleteHubIngressUrlEndpoint = async (ctx, epId) => {
  await validateDirectionType('INGRESS', 'URL', epId);
  return exports.deleteHubEndpoint(epId);
};
