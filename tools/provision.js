#! /usr/local/bin/node
/*jslint node:true */
// provisioningTool.js
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
// last saved: <2018-December-04 13:25:40>

const edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20181204-1324',
    getopt = new Getopt(common.commonOptions.concat([
      ['R' , 'reset', 'Optional. Reset, delete all the assets previously created by this script'],
      ['e' , 'env=ARG', 'the Edge environment(s) to use for this demonstration. ']
    ])).bindHelp();

// ========================================================

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
      },
      connectOptions = {
        mgmtServer : opt.options.mgmtserver,
        org        : opt.options.org,
        user       : opt.options.username,
        password   : opt.options.password,
        no_token   : opt.options.notoken,
        verbosity  : opt.options.verbose || 0
      };


apigeeEdge.connect(connectOptions)
  .then( (org) => {
    common.logWrite('connected');
    if (opt.options.reset) {
      let delOptions ={
            app: { appName: constants.appName, developerEmail: constants.developerEmail },
            developer:  { developerEmail: constants.developerEmail },
            product : { productName: constants.productName }
          };

      return org.developerapps.del(delOptions.app)
        .then( (result) => org.developers.del(delOptions.developer) )
        .then( (result) => org.products.del(delOptions.product) )
        .then( (result) => common.logWrite(sprintf('ok. demo assets have been deleted')) )
        .catch( (e) => console.log(e.stack) );
    }

    let createOptions = {
          cache: { cacheName : constants.cacheName, environment : opt.options.env },
          product: {
            productName  : constants.productName,
            description  : 'Test Product for PKCE OauthV2 Example',
            scopes       : constants.scopes,
            attributes   : { access: 'public', note: constants.note },
            approvalType : 'auto'
          },
          developer: {
            developerEmail : constants.developerEmail,
            lastName       : 'Developer',
            firstName      : 'PKCE-Example',
            userName       : 'PKCE-Example-Developer',
            attributes     : { note: constants.note }
          },
          app: {
            developerEmail : constants.developerEmail,
            appName        : constants.appName,
            apiProduct     : constants.productName,
            callbackUrl    : constants.callbackUrl,
            expiry         : constants.appExpiry,
            attributes     : { note: constants.note }
          }
        };

    return org.caches.create(createOptions.cache)
      .then( (result) => org.products.create(createOptions.product) )
      .then( (result) => org.developers.create(createOptions.developer) )
      .then( (result) => org.developerapps.create(createOptions.app) )
      .then( (result) => {
        common.logWrite(sprintf('created app. name: %s', result.name));
        console.log(sprintf('\n\nORG=%s', opt.options.org));
        console.log(sprintf('ENV=%s', opt.options.env));
        console.log(sprintf('client_id=%s', result.credentials[0].consumerKey));
        console.log(sprintf('client_secret=%s', result.credentials[0].consumerSecret));
      })
      .catch( (e) => console.log(e.stack) );
  })
  .catch( (e) => console.log(e.stack) );
