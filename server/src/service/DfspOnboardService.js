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

const PkiService = require('./PkiService');
const DFSPModel = require('../models/DFSPModel');
const DFSPEndpointItemModel = require('../models/DFSPEndpointItemModel');

const getIPsBundle = async () => {
  const ips = await DFSPEndpointItemModel.findConfirmedByDirectionType('EGRESS', 'IP');
  const bundle = {};
  for (const ip of ips) {
    if (bundle[ip.dfsp_id]) {
      bundle[ip.dfsp_id] += ',' + ip.value.address;
    } else {
      bundle[ip.dfsp_id] = ip.value.address;
    }
  }
  return bundle;
};

exports.onboardDFSP = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const id = await DFSPModel.findIdByDfspId(dfspId);
  await pkiEngine.populateDFSPClientCertBundle(id, dfspId);

  const ipsBundle = await getIPsBundle();
  await pkiEngine.populateDFSPInternalIPWhitelistBundle(ipsBundle);

  // TODO: populate external IP whitelist
  // await Promise.all(dfsps.map((dfsp) => pkiEngine.populateDFSPExternalIPWhitelistBundle(ipsBundle)));

  return {};
};
