// extractClientSecret.js
// ------------------------------------------------------------------
// Determine the consumer_secret for the given client_id.
// This policy scans variables set by a preceding AccessEntity policy.


/* jshint esversion:6, node:false, strict:implied */
/* global context, properties */
var policyName = properties['access-entity-policy-name'];
var varNamePrefix = 'AccessEntity.ChildNodes.'+ policyName +'.App.Credentials.Credential.';
var clientId = context.getVariable('request.formparam.client_id');
var consumerSecret = null;

// scan the first 9 credentials
for (var i = 1; i<10 && !consumerSecret; i++) {
  var consumerKey = context.getVariable(varNamePrefix + i + '.ConsumerKey');
  if (clientId == consumerKey) {
    consumerSecret = context.getVariable(varNamePrefix + i + '.ConsumerSecret');
  }
}

if (consumerSecret) {
  context.setVariable('extracted_consumer_secret', consumerSecret);
}
