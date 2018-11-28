// groomTokenResponse.js
// ------------------------------------------------------------------

/* jshint esversion: 6, node: true */
/* global response, context */

'use strict';

var b1 = JSON.parse(response.content),
    propertiesToKeep = ['access_token',
                        'refresh_token',
                        'scope'],
    userProperties = ['user_given_name',
                        'user_family_name',
                        'user_uuid',
                        'user_email'],
    newToken = {};

if (b1.access_token) {
  propertiesToKeep.forEach(function(key){
    newToken[key] = b1[key];
  });
  if (b1.expires_in) {
    newToken.expires_in = parseInt(b1.expires_in, 10);
  }
  if (b1.issued_at) {
    newToken.issued_at = parseInt(b1.issued_at, 10);
  }

  var user = {};
  userProperties.forEach(function(key){
    user[key.replace(/^user_/, '')] = b1[key];
  });
  newToken.user = user;

  context.setVariable('response.content', JSON.stringify(newToken, null, 2));
}
