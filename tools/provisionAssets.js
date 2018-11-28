#! /usr/local/bin/node
/*jslint node:true */
// provisionAssets.js
// ------------------------------------------------------------------
// provision an Apigee Edge API Product, Developer, App, and Cache
// for the OAuthV2 PKCE Example.
//
// Copyright 2017-2018 Google LLC.
//

/* jshint esversion: 6, strict:false */


// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// last saved: <2018-November-28 10:32:11>

const edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20181128-0941',
    getopt = new Getopt(common.commonOptions.concat([
      ['R' , 'reset', 'Optional. Reset, delete all the assets previously created by this script'],
      ['e' , 'env=ARG', 'the Edge environment(s) to use for this demonstration. ']
    ])).bindHelp();

// ========================================================

function handleError(e) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
}

console.log(
  'Apigee Edge PKCE Example Provisioning tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');
var opt = getopt.parse(process.argv.slice(2));
common.verifyCommonRequiredParameters(opt.options, getopt);

const constants = {
        cacheName      : 'cache1',
        productName    : 'PKCE-Example-Product',
        developerEmail : 'PKCE-Example-Developer@example.com',
        appName        : 'PKCE-Example-App-1',
        note           : 'created '+ (new Date()).toISOString() + ' for PKCE Token-granting Example',
        callbackUrl    : 'https://dinochiesa.github.io/pkce-redirect/callback-handler.html',
        scopes         : ['A', 'B', 'C'],
        appExpiry      : '180d'
      };

let options = {
      mgmtServer : opt.options.mgmtserver,
      org        : opt.options.org,
      user       : opt.options.username,
      password   : opt.options.password,
      no_token   : opt.options.notoken,
      verbosity  : opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  handleError(e);
  common.logWrite('connected');

  if (opt.options.reset) {
    let options = { appName: constants.appName, developerEmail: constants.developerEmail };
    org.developerapps.del(options, function(e, result){
      let options = { developerEmail: constants.developerEmail };
      org.developers.del(options, function(e, result){
        let options = { productName: constants.productName };
        org.products.del(options, function(e, result){
          common.logWrite(sprintf('ok. demo assets have been deleted'));
        });
      });
    });
  }
  else {
    let options = { cacheName : constants.cacheName, environment : opt.options.env };
    org.caches.create(options, function(e, result){
      if (e) {
        if (e.statusCode == 409) {
          common.logWrite('cache already exists');
        }
        else handleError(e);
      }

      let options = {
            productName  : constants.productName,
            description  : 'Test Product for PKCE OauthV2 Example',
            scopes       : constants.scopes,
            attributes   : { access: 'public', note: constants.note },
            approvalType : 'auto'
          };

      org.products.create(options, function(e, result){
        handleError(e);
        common.logWrite(sprintf('created product. name: %s', result.name));
        let options = {
              developerEmail : constants.developerEmail,
              lastName       : 'Developer',
              firstName      : 'PKCE-Example',
              userName       : 'PKCE-Example-Developer',
              attributes     : { note: constants.note }
            };

        org.developers.create(options, function(e, result){
          handleError(e);
          common.logWrite(sprintf('created developer. email: %s', result.email));

          let options = {
                developerEmail : constants.developerEmail,
                appName        : constants.appName,
                apiProduct     : constants.productName,
                callbackUrl    : constants.callbackUrl,
                expiry         : constants.appExpiry,
                attributes     : { note: constants.note }
              };

          org.developerapps.create(options, function(e, result){
            handleError(e);
            common.logWrite(sprintf('created app. name: %s', result.name));
            console.log(sprintf('\n\nORG=%s', opt.options.org));
            console.log(sprintf('ENV=%s', opt.options.env));
            console.log(sprintf('client_id=%s', result.credentials[0].consumerKey));
            console.log(sprintf('client_secret=%s', result.credentials[0].consumerSecret));
          });
        });
      });
    });
  }
});
