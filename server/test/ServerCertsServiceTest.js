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

const { setupTestDB, tearDownTestDB } = require('./test-database');

const fs = require('fs');
const path = require('path');
const ServerCertsService = require('../src/service/ServerCertsService');
const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const NotFoundError = require('../src/errors/NotFoundError');
const ROOT_CA = require('./Root_CA');
const { createHubCA, deleteHubCA } = require('../src/service/HubCAService');

const AMAZON_ROOT_CA_PATH = 'resources/amazon.com/RootCA.pem';
const AMAZON_CHAIN_PATH = 'resources/amazon.com/amazon.chain.pem';
const AMAZON_SERVER_CERT_PATH = 'resources/amazon.com/www.amazon.com.pem';

const GOOGLE_CHAIN_PATH = 'resources/google.com/google.chain.pem';
const GOOGLE_SERVER_CERT_PATH = 'resources/google.com/google.com.pem';

describe('ServerCertsService', () => {
  before(async function () {
    this.timeout(10000);
    await setupTestDB();
    await createHubCA(ROOT_CA);
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('Hub Server Certificates', () => {
    let envId = null;

    beforeEach('creating hook Environment', async () => {
      const env = {
        name: 'HUB_TEST_ENV'
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down hook CA', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a HubServerCerts entry', async () => {
      const body = {
        subject: {
          CN: 'example.com',
        },
      };
      const result = await ServerCertsService.createHubServerCerts(envId, body);
      assert.isNotNull(result.serverCertificate);
      assert.isNotNull(result.rootCertificate);
    }).timeout(30000);

    it('should create and delete a HubServerCerts entry', async () => {
      const body = {
        subject: {
          CN: 'example.com',
        },
      };
      const result = await ServerCertsService.createHubServerCerts(envId, body);
      assert.isNotNull(result.serverCertificate);
      await ServerCertsService.deleteHubServerCerts(envId);
      try {
        await ServerCertsService.getHubServerCerts(envId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    }).timeout(30000);
  }).timeout(30000);

  describe('DFSP Server Certificates', () => {
    let envId = null;
    let dfspId = null;

    beforeEach('creating Environment and DFSP', async () => {
      const env = {
        name: 'DFSP_TEST_ENV'
      };
      const result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;
    });

    afterEach('tearing down ENV and DFSP', async () => {
      await PkiService.deleteEnvironment(envId);
    });

    it('should create a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result);
      assert.equal(result.serverCertificateInfo.serialNumber, '0e4098bddd80b0d3394a0e1487d7765c');
      assert.equal(result.intermediateChainInfo[0].notBefore.toISOString(), '2017-06-15T00:00:42.000Z');
      await PkiService.deleteDFSP(envId, dfspId);
    }).timeout(30000);

    it('should create and delete a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result);
      await ServerCertsService.deleteDfspServerCerts(envId, dfspId);
      try {
        await ServerCertsService.getDfspServerCerts(envId, dfspId);
        assert.fail('Should have throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
      await PkiService.deleteDFSP(envId, dfspId);
    }).timeout(30000);

    it('should update a DfspServerCerts entry', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };
      const dfsp = {
        dfspId: 'DFSP_TEST',
        name: 'DFSP'
      };
      const resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
      const result = await ServerCertsService.createDfspServerCerts(envId, dfspId, body);
      assert.isNotNull(result);
      assert.equal(result.serverCertificateInfo.serialNumber, '0e4098bddd80b0d3394a0e1487d7765c');
      assert.equal(result.intermediateChainInfo[0].notBefore.toISOString(), '2017-06-15T00:00:42.000Z');

      const newBody = {
        rootCertificate: fs.readFileSync(path.join(__dirname, AMAZON_ROOT_CA_PATH)).toString(),
        intermediateChain: fs.readFileSync(path.join(__dirname, AMAZON_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, AMAZON_SERVER_CERT_PATH)).toString(),
      };
      const resultAfter = await ServerCertsService.updateDfspServerCerts(envId, dfspId, newBody);
      assert.isNotNull(resultAfter.id);
      assert.equal('0c8ee0c90d6a89158804061ee241f9af', resultAfter.intermediateChainInfo[0].serialNumber);
      await PkiService.deleteDFSP(envId, dfspId);
    }).timeout(30000);

    it('should create and find several dfsps certs', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        const resultDfsp = await PkiService.createDFSP(envId, dfsp);
        const eachId = resultDfsp.id;
        dfspIds.push(eachId);

        const result = await ServerCertsService.createDfspServerCerts(envId, dfsp.dfspId, body);
        assert.isNotNull(result);
      }

      const certs = await ServerCertsService.getAllDfspServerCerts(envId);
      certs.forEach(cert => {
        assert.equal(cert.serverCertificateInfo.serialNumber, '0e4098bddd80b0d3394a0e1487d7765c');
        assert.equal(cert.intermediateChainInfo[0].notBefore, '2017-06-15T00:00:42.000Z');
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(envId, id)));
    }).timeout(30000);

    it('should create and find several dfsps certs with dfsp_id not null', async () => {
      const body = {
        rootCertificate: null,
        intermediateChain: fs.readFileSync(path.join(__dirname, GOOGLE_CHAIN_PATH)).toString(),
        serverCertificate: fs.readFileSync(path.join(__dirname, GOOGLE_SERVER_CERT_PATH)).toString(),
      };

      const N_DFSPS = 20;
      const dfspIds = [];
      for (let i = 0; i < N_DFSPS; i++) {
        const dfsp = {
          dfspId: 'DFSP_TEST' + i,
          name: 'DFSP'
        };
        const resultDfsp = await PkiService.createDFSP(envId, dfsp);
        const eachId = resultDfsp.id;
        dfspIds.push(eachId);

        const result = await ServerCertsService.createDfspServerCerts(envId, eachId, body);
        assert.isNotNull(result);
      }

      const certs = await ServerCertsService.getAllDfspServerCerts(envId);

      certs.forEach(cert => {
        assert.isNotNull(cert.dfspId);
        assert.include(dfspIds, cert.dfspId);
      });

      await Promise.all(dfspIds.map(id => PkiService.deleteDFSP(envId, id)));
    }).timeout(30000);
  }).timeout(30000);
}).timeout(30000);
