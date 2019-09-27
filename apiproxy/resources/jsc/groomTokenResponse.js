// groomTokenResponse.js
// ------------------------------------------------------------------
/* jshint esversion:6, node:false, strict:implied */
/* global response, context */

var origResponse = JSON.parse(response.content),
    userProperties = ['user_given_name',
                        'user_family_name',
                        'user_uuid',
                        'user_email'],
    newResponse = {
      token_type : 'Bearer'
    };

if (origResponse.access_token) {
  ['access_token', 'refresh_token', 'scope'].forEach(function(key) {
    newResponse[key] = origResponse[key];
  });

  // Only if there is a refresh token, keep properties related to it:
  if (origResponse.refresh_token) {
    newResponse.refresh_token_expires_in = origResponse.refresh_token_expires_in;
    newResponse.refresh_count = origResponse.refresh_count;
  }

  // convert String(ms-since-epoch) to Number(seconds-since-epoch)
  ['issued_at', 'refresh_token_issued_at'].forEach(function convertIssuedAt(prop) {
    if (origResponse[prop]) {
      newResponse[prop] = Math.floor(parseInt(origResponse[prop], 10) / 1000);
    }
  });

  // convert expires_in to Number(expires_in)
  ['expires_in', 'refresh_token_expires_in'].forEach(function convertExpires(prop){
    if (origResponse[prop]) {
      newResponse[prop] = parseInt(origResponse[prop], 10);
    }
  });

  var user = {};
  userProperties.forEach(function(key){
    user[key.replace(/^user_/, '')] = origResponse[key];
  });
  newResponse.user = user;

  context.setVariable('response.content', JSON.stringify(newResponse, null, 2));
}
