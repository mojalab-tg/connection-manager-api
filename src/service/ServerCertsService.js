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
const DFSPModel = require('../models/DFSPModel');
const PkiService = require('./PkiService');
const ValidationError = require('../errors/ValidationError');
const Constants = require('../constants/Constants');

// custom dfsp
exports.createDfspServerCerts = async (ctx, dfspId, body) => {
  if (body === null || typeof body === 'undefined') {
    throw new ValidationError(`Invalid body ${body}`);
  }
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);

  const certData = {
    dfspId,
    ...formatBody(body, pkiEngine),
    validations,
    validationState,
  };

  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.setDFSPServerCerts(dbDfspId, certData);
  return certData;
};

exports.updateDfspServerCerts = async (ctx, dfspId, body) => {
  return exports.createDfspServerCerts(ctx, dfspId, body);
};

exports.getDfspServerCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  return pkiEngine.getDFSPServerCerts(dbDfspId);
};

exports.deleteDfspServerCerts = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.deleteDFSPServerCerts(dbDfspId);
};

exports.getAllDfspServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  const allDfsps = await DFSPModel.findAll();
  return Promise.all(allDfsps.map(({ id }) => pkiEngine.getDFSPServerCerts(id)));
};

/**
 * Creates the server certificates
 */
exports.createHubServerCerts= async (ctx, body) => {
  const { pkiEngine } = ctx;
  const cert = {};
  cert.serverCertificate = pkiEngine.getCertInfo(body.serverCertificate); // custom
  const serverCertData = await pkiEngine.createHubServerCert(cert.serverCertificate);
  
  cert.rootCertificate = await pkiEngine.getRootCaCert();
  cert.rootCertificateInfo = pkiEngine.getCertInfo(cert.rootCertificate);
  // console.log('csrParameters serverCertData', serverCertData.ca_chain)
  if (serverCertData.ca_chain) {
    // cert.intermediateChain = serverCertData.ca_chain;
    cert.intermediateChain = serverCertData.ca_chain[0]; // custom
    cert.intermediateChainInfo = pkiEngine.getCertInfo(cert.intermediateChain)
    // cert.intermediateChainInfo = cert.intermediateChain.map(pkiEngine.getCertInfo);
  }
  cert.serverCertificate = serverCertData.certificate;
  cert.serverCertificateInfo = pkiEngine.getCertInfo(cert.serverCertificate);
  cert.serverCertificateInfo.serialNumber = serverCertData.serial_number;
  const { validations, validationState } = await pkiEngine.validateServerCertificate(cert.serverCertificate, cert.intermediateChain, cert.rootCertificate);
  console.log('csrParameters serverCertData', validationState)
  const certData = {
    ...cert,
    validations,
    validationState,
  };

  await pkiEngine.setHubServerCert(certData);
  return certData;
};
// custom
exports.createHubServerCerts_1 = async (ctx, body) => { // custom
  const { pkiEngine } = ctx;
  const cert = {};
  // const serverCertData = await pkiEngine.createHubServerCert(Constants.serverCsrParameters);
  // const serverCertificateInfo = pkiEngine.getCertInfo(body.serverCertificate)
  // const serverCertData = await pkiEngine.createHubServerCert(serverCertificateInfo);
  // cert.rootCertificate = body.rootCertificate
  // cert.intermediateChain = body.intermediateChain
  // cert.rootCertificateInfo = pkiEngine.getCertInfo(body.rootCertificate);
  // cert.intermediateChainInfo = pkiEngine.getCertInfo(body.intermediateChain);
  // console.log('cert.rootCertificate', cert.rootCertificate);
  // console.log('rootCertificateInfo', rootCertificateInfo);
  // if (serverCertData &&serverCertData.ca_chain) {
  //   cert.intermediateChain = serverCertData.ca_chain;
  //   cert.intermediateChainInfo = cert.intermediateChain.map(pkiEngine.getCertInfo);
  // }
  // console.log('serverCertData', cert);
  // cert.serverCertificate = body.serverCertificate
  // cert.serverCertificateInfo = pkiEngine.getCertInfo(body.serverCertificate);
  // cert.serverCertificateInfo.serialNumber = serverCertData.serial_number;

  const { validations, validationState } = await pkiEngine.validateServerCertificate(body.serverCertificate, body.intermediateChain, body.rootCertificate);
  const certData = {
    ...formatBody(body, pkiEngine),
    validations,
    validationState,
  };

  await pkiEngine.setHubServerCert(certData);
  return certData;
};

exports.getHubServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  return pkiEngine.getHubServerCert();
};

exports.deleteHubServerCerts = async (ctx) => {
  const { pkiEngine } = ctx;
  const cert = await pkiEngine.getHubServerCert();
  if (cert) {
    await pkiEngine.revokeHubServerCert(cert.serverCertificateInfo.serialNumber);
    await pkiEngine.deleteHubServerCert();
  }
};

const formatBody = (body, pkiEngine) => {
  return {
    rootCertificate: body.rootCertificate,
    rootCertificateInfo: body.rootCertificate && pkiEngine.getCertInfo(body.rootCertificate),
    intermediateChain: body.intermediateChain,
    intermediateChainInfo: PkiService.splitChainIntermediateCertificateInfo(body.intermediateChain, pkiEngine),
    serverCertificate: body.serverCertificate,
    serverCertificateInfo: body.serverCertificate && pkiEngine.getCertInfo(body.serverCertificate),
  };
};
