// importJsonToContext.js
/* jshint esversion: 5, node: false */
/* global context, properties */

// ------------------------------------------------------------------
//
// Import a JSON string context variables.
//
// For example, suppose this is the json string
// {
//       targetUrls : [
//        'https://host1/api-test/t1',
//        'https://host2/api-test/t1',
//        'https://host3/api-test/t1'
//       ],
//       somethingElse: 'TARGET_URL_HERE',
//       debug : { core : true }
// }
//
// Then, the context will get these variables:
//   PREFIX_targetUrls_0 = 'https://host1/api-test/t1'
//   PREFIX_targetUrls_1 = 'https://host2/api-test/t1'
//   PREFIX_targetUrls_2 = 'https://host3/api-test/t1'
//   PREFIX_somethingElse = 'TARGET_URL_HERE'
//   PREFIX_debug_core = true
//
// ...where PREFIX is specified in the policy config and
// is the name of the variable containing the JSON string.
//
// created: Wed Sep  9 16:35:07 2015
// last saved: <2018-November-27 10:35:16>
//

function flatten(target, opts) {
  opts = opts || {};

  var separator = opts.separator || '_',
      maxDepth = opts.maxDepth,
      currentDepth = 1,
      output = {};

  function step(object, prev) {
    Object.keys(object).forEach(function(key) {
      var value = object[key],
          isarray = opts.safe && Array.isArray(value),
          type = Object.prototype.toString.call(value),
          isobject = (type === "[object Object]" || type === "[object Array]" ),
          newKey = prev ? prev + separator + key : key;

      if (!opts.maxDepth) {
        maxDepth = currentDepth + 1;
      }

      if (!isarray && isobject && Object.keys(value).length && currentDepth < maxDepth) {
        ++currentDepth;
        return step(value, newKey);
      }

      output[newKey] = value;
    });
  }

  step(target);

  return output;
}

var separator = '_';
var varname = properties.varname;
var settings = JSON.parse(context.getVariable(varname));
var flatObj = flatten(settings, separator);

Object.keys(flatObj).forEach(function(key){
  context.setVariable(varname + separator + key, flatObj[key]);
});
