// userAuthentication.js
// ------------------------------------------------------------------
//
// A module to do user authentication.
//
// created: Wed Jun 15 14:13:56 2016
// last saved: <2018-November-27 11:17:14>


(function (globalScope){
  var localUserDb;

  function joinPathElements() {
    var re1 = new RegExp('^\\/|\\/$', 'g'),
        elts = Array.prototype.slice.call(arguments);
    return '/' + elts.map(function(element){
      if ( ! element) {return '';}
      return element.replace(re1,""); }).join('/');
  }

  function loadLocalUserDb(filename) {
    localUserDb = require(joinPathElements(__dirname, filename));
    if ( ! localUserDb) {
      throw new Error("localUserDb cannot be loaded.");
    }
  }

  function configureLocalAuth(config) {

    // Read the usernames + passwords "user database" that is passed in, in config.
    // This allows the "stored" credentials to be dynamically specified at init time.

    if ( !config.localUserDb) {
      throw new Error("there is no localUserDb configured.");
    }

    loadLocalUserDb(config.localUserDb);
  }

  function authenticateAgainstLocalUserDb(ctx) {
    console.log('Authenticate against localDB');
    if ( !ctx.credentials.username || !ctx.credentials.password) {
      ctx.userInfo = null;
      return ctx;
    }
    if ( !localUserDb) {
      throw new Error("localUserDb is null.");
    }

    console.log('Authenticate %s against localDB', ctx.credentials.username);
    var storedRecord = localUserDb[ctx.credentials.username];
    if (storedRecord && storedRecord.password) {
      // user has been found
      if (storedRecord.password == ctx.credentials.password) {
        console.log('password match');
        var copy = shallowCopyObject(storedRecord);
        delete(copy.hash);
        copy.email = ctx.credentials.username;
        ctx.loginStatus = 200;
        ctx.userInfo = copy;
      }
      else {
        console.log('password no match');
      }
    }
    else {
      console.log('No user by that name');
      ctx.loginStatus = 401;
    }
    return ctx;
  }


  function shallowCopyObject(obj) {
    var copy = {};
    if (null !== obj && typeof obj == "object") {
      Object.keys(obj).forEach(function(attr){copy[attr] = obj[attr];});
    }
    return copy;
  }

  module.exports = {
    config: configureLocalAuth,
    authn: authenticateAgainstLocalUserDb
  };


}(this));
