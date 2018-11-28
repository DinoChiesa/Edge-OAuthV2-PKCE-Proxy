// login-and-consent.js
// ------------------------------------------------------------------
/* jshint esversion: 6, node: true, strict:false, camelcase:false */
/* global process, console, Buffer */

//
// created: Mon Apr  3 21:02:40 2017
// last saved: <2018-November-27 12:43:14>
//
// ------------------------------------------------------------------
//
// A node app that implements an authentication and consent-granting web
// app. This thing implements what is known in the OAuth docs as the
// Authorization Server. This app uses jade for view rendering, and
// bootstrap CSS in the HTML pages, but those details are irrelevant for
// its main purpose.
//
// Run this with
//     node ./login-and-consent.js
//
// To pop the login page:
// GET https://ORGNAME-ENVNAME-test.apigee.net/PROXYBASEPATH/oauth2/authorize?client_id=VALID_CLIENT_ID_HERE&redirect_uri=http://dinochiesa.github.io/openid-connect/callback-handler.html&response_type=id_token&scope=openid%20profile&nonce=A12345&state=ABCDEFG
//
// ------------------------------------------------------------------

var express = require('express'),
    bodyParser = require('body-parser'),
    querystring = require('querystring'),
    morgan = require('morgan'), // a logger
    request = require('request'),
    path = require('path'),
    url = require('url'),
    app = express(),
    config = require('./config/config.json'),
    userAuth = require('./lib/userAuthentication.js'),
    httpPort;

userAuth.config(config);

function getType(obj) {
  return Object.prototype.toString.call(obj);
}

function logError(e) {
  console.log('unhandled error: ' + e);
  console.log(e.stack);
}

function copyHash(obj) {
  var copy = {};
  if (null !== obj && typeof obj == "object") {
    Object.keys(obj).forEach(function(attr){copy[attr] = obj[attr];});
  }
  return copy;
}

function base64Encode(item) {
  return new Buffer(item).toString('base64');
}

function base64Decode(item) {
  return new Buffer(item, 'base64').toString('ascii');
}

function authenticateUser(ctx) { return userAuth.authn(ctx); }

function postAuthFormData(userInfo) {
  var copy = {};
  Object.keys(userInfo).forEach(function(key){
    if (key != "roles") {
      copy[key] = userInfo[key];
    }
  });
  if (userInfo.roles) {
    copy.roles = userInfo.roles.join(',');
  }
  delete copy.status;
  copy.response_type = 'code';
  return copy;
}

function requestAuthCode(ctx) {
  return new Promise ((resolve) => {
    let options = {
          uri: ctx.fullUrl.replace('login-and-consent', 'oauth2-ac-pkce') +
        '/authcode?' + querystring.stringify({ sessionid : ctx.sessionid }),
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          form : postAuthFormData(ctx.userInfo)
        };

    console.log('requestAuthCode, context:' + JSON.stringify(ctx, null, 2));
    console.log('requestAuthCode, request options:' + JSON.stringify(options, null, 2));

    request(options, function(error, response, body) {
      if (error) {
        console.log('Error from /authcode: ' + error);
        return resolve(ctx);
      }
      console.log('/authcode response: ' + response.statusCode);
      if (response.statusCode == 302) {
        try {
          ctx.authRedirLoc = response.headers.location;
        }
        catch (exc1) {
          console.log('auth exception: ' + exc1.message);
          console.log(exc1.stack);
        }
      }
      else {
        console.log('Non-302 response from /authcode: ' + response.statusCode);
        console.log('auth, statusCode = ' + response.statusCode);
        ctx.authStatusCode = response.statusCode;
        ctx.authResponseBody = (typeof body == "string") ? JSON.parse(body) : body;
      }
      resolve(ctx);
    });
  });
}

function externalUrl(req) {
  let external = url.format({
        protocol: req.header('x-client-scheme'),
        host: req.header('x-external-host'),
        pathname: req.header('x-proxy-basepath')
      });
  console.log('externalUrl() = %s', external);
  return external;
}

function inquireAuthorizationSessionId(ctx) {
  return new Promise( (resolve, reject) => {
    // send a query to Edge to ask about the oauth session
    let query = { sessionid : ctx.sessionid },
        endpoint = ctx.fullUrl.replace('login-and-consent', 'oauth2-session'),
      options = {
        uri: endpoint + '/info?' + querystring.stringify(query),
        method: 'GET',
        headers: {
          'apikey': config.sessionApi.apikey,
          'Accept': 'application/json'
        }
      };

  console.log('inquireAuthorizationSessionId request: ' + JSON.stringify(options, null, 2));

  request(options, function(error, response, body) {
    if (error) {
      ctx.error = error;
      return resolve(ctx);
    }
    console.log('inquireAuthorizationSessionId response: ' + body);
    if (response) {
      if (response.statusCode === 200) {
        try {
          body = JSON.parse(body);
          // Edge knows about the session and has returned information about it.
          ctx.sessionInfo = body;
        }
        catch (exc1) {
          console.log('inquireAuthorizationSessionId exception: ' + exc1.message);
        }
        return resolve(ctx);
      }

      console.log('inquireAuthorizationSessionId, statusCode = ' + response.statusCode);
      return resolve(ctx);
    }

    console.log('inquireAuthorizationSessionId, no response');
    reject(ctx);

  });
  });
}


app.use(morgan('combined')); // logger
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());


app.get('/logout', function (request, response) {
  var auth = request.session.username;
  request.session = null; // logout
  response.redirect('manage');
});


// display the cancel page
app.get('/cancel', function (request, response) {
  response.status(200);
  response.render('cancel', {
    title: "Declined",
    mainMessage: "You have declined.",
  });
});



// display the login form
app.get('/login', function (request, response) {
  function renderLogin (ctx) {
    // sessionInfo:
    //   client_id
    //   response_type
    //   scope
    //   redirect_uri
    //   req_state
    //   appName
    //   appLogoUrl
    //   nonce?
    if (ctx.sessionInfo && ctx.sessionInfo.client_id) {
      ctx.viewData = copyHash(ctx.sessionInfo);
      if ( ! ctx.viewData.appLogoUrl) {
        ctx.viewData.appLogoUrl = 'http://i.imgur.com/6DidtRS.png';
      }
      ctx.viewData.postback_url = 'validate';
      ctx.viewData.action = 'Sign in';
      ctx.viewData.sessionid = ctx.sessionid;
      ctx.viewData.redirect_url = ctx.viewData.redirect_url || "";
      ctx.viewData.req_state = ctx.viewData.req_state || "";
      ctx.viewData.appName = ctx.viewData.appName || "";
      ctx.viewData.errorMessage = null; // must be present and null
      response.render('login', ctx.viewData);
    }
    else {
      response.status(404);
      response.render('error404', {
        mainMessage: "the sessionid is not known.",
        title : "bad sessionid"
      });
    }
    return ctx;
  }

  Promise.resolve({sessionid: request.query.sessionid, fullUrl: externalUrl(request)})
    .then(inquireAuthorizationSessionId)
    .then(renderLogin, renderLogin);

});



// respond to the login form postback
app.post('/validate', function (request, response) {
  console.log('BODY: ' + JSON.stringify(request.body));
  if ( ! request.body.redirect_uri) {
    response.status(400);
    response.render('error', { errorMessage : 'Bad request - missing redirect_uri' });
    return;
  }

  if (request.body.submit != 'yes') {
    console.log('user has declined to login');
    // ! request.body.redirect_uri.startsWith('oob') &&
    // ! request.body.redirect_uri.startsWith('urn:ietf:wg:oauth:2.0:oob')
    response.status(302)
      .header('Location', request.body.redirect_uri + '?error=access_denied')
      .end();
    return;
  }

  // validate form data
  if ( ! request.body.username || ! request.body.password) {
    // missing form fields
    response.status(401);
    response.render('login', {
      postback_url  : 'validate',
      action        : 'Sign in',
      sessionid     : request.body.sessionid,
      client_id     : request.body.client_id,
      response_type : request.body.response_type,
      req_scope     : request.body.requestedScopes,
      redirect_uri  : request.body.redirect_uri,
      req_state     : request.body.clientState,
      appName       : request.body.appName,
      appLogoUrl    : request.body.appLogoUrl || 'http://i.imgur.com/6DidtRS.png',
      display       : request.body.display,
      login_hint    : request.body.login_hint,
      errorMessage  : "You must specify a user and a password."
    });
    return;
  }

  var context = {
        credentials : {
          username: request.body.username,
          password: request.body.password
        },
        sessionid : request.body.sessionid
      };

  Promise.resolve(context)
    .then(authenticateUser)
    .then(function(ctx){
      if (ctx.loginStatus != 200) {
        response.status(401);
        response.render('login', {
          postback_url  : 'validate',
          action        : 'Sign in',
          sessionid     : ctx.sessionid,
          client_id     : request.body.client_id,
          response_type : request.body.response_type,
          req_scope     : request.body.requestedScopes,
          redirect_uri  : request.body.redirect_uri,
          req_state     : request.body.clientState,
          appName       : request.body.appName,
          appLogoUrl    : request.body.appLogoUrl || 'http://i.imgur.com/6DidtRS.png',
          display       : request.body.display,
          login_hint    : request.body.login_hint,
          errorMessage  : "That login failed."
        });
        return ctx;
      }

      // else, a-ok.
      // This app got a 200 ok from the user Authentication service.
      delete ctx.userInfo.password;
      response.status(200)
        .render('consent', {
          action        : 'Consent',
          sessionid     : ctx.sessionid,
          postback_url  : 'grantConsent',
          client_id     : request.body.client_id,
          response_type : request.body.response_type,
          req_scope     : request.body.requestedScopes,
          redirect_uri  : request.body.redirect_uri,
          req_state     : request.body.clientState,
          appName       : request.body.appName,
          appLogoUrl    : request.body.appLogoUrl || 'http://i.imgur.com/6DidtRS.png',
          display       : request.body.display,
          login_hint    : request.body.login_hint,
          userProfile   : base64Encode(JSON.stringify(ctx.userInfo))
        });

      return ctx;
    })
    .then(function() {}, logError);
});


// respond to the consent form postback
app.post('/grantConsent', function (request, response) {
  console.log('BODY: ' + JSON.stringify(request.body));
  if ( ! request.body.redirect_uri) {
    response.status(400)
      .render('error', { errorMessage : 'Bad request - missing redirect_uri' });
    return;
  }

  if (request.body.submit != 'yes') {
    console.log('user has declined to consent');
    // ! request.body.redirect_uri.startsWith('oob') &&
    // ! request.body.redirect_uri.startsWith('urn:ietf:wg:oauth:2.0:oob')
    response.status(302)
      .header('Location', request.body.redirect_uri + '?error=access_denied')
      .end();
    return;
  }

  var context = {
        userInfo : JSON.parse(base64Decode(request.body.userProfile)),
        sessionid : request.body.sessionid,
        fullUrl : externalUrl(request)
  };
  Promise.resolve(context)
    .then(requestAuthCode)
    .then(function(ctx){
      if (!ctx.authRedirLoc) {
        console.log('the request-for-code did not succeed. status=' + ctx.authStatusCode );
        response.status(ctx.authStatusCode || 400);
        //console.log('ctx: ' + JSON.stringify(ctx));
        response.render('error', {
           errorMessage : (ctx.authResponseBody && ctx.authResponseBody.Error) ? ctx.authResponseBody.Error :
            "Bad request - cannot redirect"
        });
      }
      else {
        response.status(302)
                .header('Location', ctx.authRedirLoc);
      }

      response.end();
      return ctx;
    })
    .then(function() {}, logError);
});


app.get('/*', function (request, response) {
    response.status(404);
    response.render('error404', {
      mainMessage : 'There\'s nothing to see here.',
      title : 'That\'s 404 dude!'
    });
});


httpPort = process.env.PORT || 5150;
app.listen(httpPort, function() {
  console.log('Listening on port ' + httpPort);
});
