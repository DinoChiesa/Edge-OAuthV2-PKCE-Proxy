// contriveProofKey.js
// ------------------------------------------------------------------
//
// created: Tue Nov 27 11:25:24 2018
// last saved: <2018-November-27 16:30:12>

/* jshint esversion: 6, node: true, strict:false, camelcase:false */
/* global process, console, Buffer */

//const cryptojs = require('crypto-js');
const sha256 = require('crypto-js/sha256'); // cryptojs.sha256;
const Base64 = require('crypto-js/enc-base64'); // cryptojs.Base64;

function base64url(source) {
  // Encode in classical base64
  var encodedSource = Base64.stringify(source);

  // Remove padding equal characters
  encodedSource = encodedSource.replace(/=+$/, '');

  // Replace characters according to base64url specifications
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');

  return encodedSource;
}

function generateRandomAlphaNumericString(L) {
  function c() {
    return (Math.floor(Math.random() * 5)<1) ?
      (Math.floor(Math.random() * 10) + 48) :
      String.fromCharCode(65 + Math.floor(Math.random() * 26) + (Math.floor(Math.random() * 2) * 32));
  }
  var i, s = '';
  L = L || (Math.floor(Math.random() * 7) + 8);
  for (i=0; i<L; i++) {
    s += c();
  }
  return s;
}

const chosenLength = (Math.floor(Math.random() * (128 - 43)) + 43);
const code_verifier = generateRandomAlphaNumericString(chosenLength);
const code_challenge = base64url(sha256(code_verifier));

console.log('\n');
console.log('code_verifier=' + code_verifier);
console.log('code_challenge=' + code_challenge);
