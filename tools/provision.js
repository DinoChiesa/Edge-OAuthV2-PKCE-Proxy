#! /usr/local/bin/node
/*jslint node:true */
// provisioningTool.js
// ------------------------------------------------------------------
// provision an Apigee Edge API Product, Developer, App, and Cache
// for the OAuthV2 PKCE Example.
//
// Copyright 2017-2020 Google LLC.
//

/* jshint esversion: 9, strict:implied */

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
// last saved: <2020-August-19 10:04:21>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      util       = require('util'),
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20200819-1004',
      getopt     = new Getopt(common.commonOptions.concat([
        ['R' , 'reset', 'Optional. Reset, delete all the assets previously created by this script'],
        ['e' , 'env=ARG', 'the Edge environment(s) to use for this demonstration. ']
      ])).bindHelp();

// ========================================================

function random(min, max) {
  let delta = max - min;
  return Math.floor(Math.random() * delta) + min;
}

function pkceCodeVerifier() {
  let s = '', desiredLength = random(43, 128);
  while (s.length < desiredLength) {
    s += Math.random().toString(36).substring(2, random(8, 12));
  }
  return s.substring(0, 128);
}

function sha256_base64url(s) {
  return require('crypto')
    .createHash('sha256')
    .update(s)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}

console.log(
  'Apigee Edge PKCE Example Provisioning tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');
let opt = getopt.parse(process.argv.slice(2));
common.verifyCommonRequiredParameters(opt.options, getopt);

const constants = {
        discriminators : {
          cache        : 'cache1',
          product      : 'PKCE-Example-Product',
          developer    : 'PKCE-Example-Developer@example.com',
          developerapp : 'PKCE-Example-App-1'
        },
        note           : 'created '+ (new Date()).toISOString() + ' for PKCE Token-granting Example',
        callbackUrl    : 'https://dinochiesa.github.io/pkce-redirect/callback-handler.html',
        scopes         : ['A', 'B', 'C'],
        appExpiry      : '210d'
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
  .then( org => {
    common.logWrite('connected');
    if (opt.options.reset) {
      let delOptions = {
            app       : { appName: constants.discriminators.developerapp, developerEmail: constants.discriminators.developer },
            developer : { developerEmail: constants.discriminators.developer },
            product   : { productName: constants.discriminators.product }
          };

      // delete items and ignore 404 errors
      return Promise.resolve({})
        .then( _ => org.developerapps.del(delOptions.app)
               .catch(e => {
                 if ( ! e.result || e.result.code != 'developer.service.DeveloperDoesNotExist' ) {
                   console.log(e);
                   return Promise.reject(e);
                 }
               }))
        .then( _ => org.developers.del(delOptions.developer)
               .catch(e => {
                 if ( ! e.result || e.result.code != 'developer.service.DeveloperDoesNotExist' ) {
                   console.log(e);
                 }
               }))
        .then( _ => org.products.del(delOptions.product)
               .catch(e => {
                 if ( ! e.result || e.result.code != 'keymanagement.service.apiproduct_doesnot_exist' ) {
                   console.log(e);
                 }
               }))

        .then( _ => common.logWrite(sprintf('ok. demo assets have been deleted')) );
    }

    let options = {
          caches: {
            get: { environment : opt.options.env },
            create: { cacheName : constants.discriminators.cache, environment : opt.options.env }
          },
          products: {
            create: {
              productName  : constants.discriminators.product,
              description  : 'Test Product for PKCE OauthV2 Example',
              scopes       : constants.scopes,
              attributes   : { access: 'public', note: constants.note },
              approvalType : 'auto'
            }
          },
          developers: {
            create: {
              developerEmail : constants.discriminators.developer,
              lastName       : 'Developer',
              firstName      : 'PKCE-Example',
              userName       : 'PKCE-Example-Developer',
              attributes     : { note: constants.note }
            }
          },
          developerapps: {
            get: {
              developerEmail : constants.discriminators.developer
            },
            create: {
              developerEmail : constants.discriminators.developer,
              appName        : constants.discriminators.developerapp,
              apiProduct     : constants.discriminators.product,
              description    : 'Test Product for PKCE OauthV2 Example',
              scopes         : constants.scopes,
              attributes     : { access: 'public', note: constants.note },
              approvalType   : 'auto'
            }
          }
        };

    function conditionallyCreateEntity(entityType) {
      let collectionName = entityType + 's';
      return org[collectionName].get(options[collectionName].get || {})
        .then( result => {
          //console.log('GET Result: ' + JSON.stringify(result));
          if (result.indexOf(constants.discriminators[entityType])>=0) {
            if (collectionName == 'developerapps') {
              return org[collectionName].get({
                developerEmail : constants.discriminators.developer,
                appName        : constants.discriminators.developerapp
              });
            }
            return Promise.resolve(result) ;
          }
          if (opt.options.verbose) {
            console.log('CREATE: ' + JSON.stringify(options[collectionName].create));
          }
          return org[collectionName].create(options[collectionName].create);
        });
    }

    return conditionallyCreateEntity('cache')
      .then( _ => conditionallyCreateEntity('product'))
      .then( _ => conditionallyCreateEntity('developer'))
      .then( _ => conditionallyCreateEntity('developerapp'))
      .then( result => {
        common.logWrite(sprintf('app name: %s', result.name));
        console.log(sprintf('\n\nORG=%s', opt.options.org));
        console.log(sprintf('ENV=%s', opt.options.env));
        console.log(sprintf('client_id=%s', result.credentials[0].consumerKey));
        //console.log(sprintf('client_secret=%s', result.credentials[0].consumerSecret));
        console.log(sprintf('redirect_uri=%s', constants.callbackUrl));
        let codeVerifier = pkceCodeVerifier();
        console.log(sprintf('code_verifier=%s', codeVerifier));
        console.log(sprintf('code_challenge=%s', sha256_base64url(codeVerifier)));
        console.log();

        console.log('curl -i -X GET "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=A&code_challenge=${code_challenge}&code_challenge_method=S256"');

      });
  })
  .catch( e => console.log(util.format(e)) );
