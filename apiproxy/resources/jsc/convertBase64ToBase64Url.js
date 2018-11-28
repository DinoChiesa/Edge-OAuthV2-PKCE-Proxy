// convertBase64ToBase64Url.js
// ------------------------------------------------------------------
//
// created: Tue Nov 27 15:02:04 2018
// last saved: <2018-November-27 15:28:56>

/* jshint esversion: 6, node: true */
/* global properties, context, Buffer */

'use strict';

var source = properties.source;
var value = context.getVariable(source);
  // Remove padding equal characters
value = value.replace(/=+$/, '')
  // Replace characters according to base64url specifications
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

context.setVariable(source, value);
