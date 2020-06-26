// login-and-consent.js
// ------------------------------------------------------------------
/* jshint esversion: 9, node: true, strict:implied, camelcase:false */
/* global process, console, Buffer, URL */

// This requires node >=10 in order to run.

//
// created: Mon Apr  3 21:02:40 2017
// last saved: <2020-June-26 15:03:54>
//
// ------------------------------------------------------------------
//
// A node app that implements an authentication and consent-granting web
// app. This thing implements what is known in the OAuth documentation as the
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

const express = require('express'),
      bodyParser = require('body-parser'),
      morgan = require('morgan'), // a logger
      https = require('https'),
      path = require('path'),
      url = require('url'),
      app = express(),
      config = require('./config/config.json'),
      userAuth = require('./lib/userAuthentication.js');

userAuth.config(config);

// function getType(obj) {
//   return Object.prototype.toString.call(obj);
// }

function logError(e) {
  console.log('unhandled error: ' + e);
  console.log(e.stack);
}

function copyHash(obj) {
  var copy = {};
  if (null !== obj && typeof obj === 'object') {
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

function encodeQuerystring(obj) {
  return Object.keys(obj).map( key => `${key}=` + encodeURIComponent(obj[key]))
    .join('&');
}

function postAuthFormData(userInfo) {
  var copy = {
        response_type : 'code',
        ...userInfo
      };
  if (userInfo.roles) {
    copy.roles = userInfo.roles.join(',');
  }
  delete copy.status;
  return encodeQuerystring(copy);
}

function requestAuthCode(ctx) {
  return new Promise ( resolve => {
    let qs = encodeQuerystring({sessionid: ctx.sessionid}),
        url = new URL(ctx.fullUrl.replace('login-and-consent', 'oauth2-ac-pkce') + `/authcode?${qs}`),
        options = {
          hostname: url.hostname,
          path:`${url.pathname}${url.search}`,
          protocol: url.protocol,
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json'
          }
        };

    console.log('requestAuthCode, context:' + JSON.stringify(ctx, null, 2));
    console.log('requestAuthCode, request options:' + JSON.stringify(options, null, 2));

    const req = https.request(options, (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
              body += chunk;
            });
            console.log(`/authcode response: ${response.statusCode}`);
            ctx.authStatusCode = response.statusCode;

            response.on('end', () => {
              if (response.statusCode === 302) {
                try {
                  ctx.authRedirLoc = response.headers.location;
                }
                catch (exc1) {
                  console.log('auth exception: ' + exc1.message);
                  console.log(exc1.stack);
                }
              }
              else {
                console.log('Non-302 response');
                if (body) {
                  ctx.authResponseBody = JSON.parse(body);
                }
              }
              resolve(ctx);
            });
          });

    req.write(postAuthFormData(ctx.userInfo));
    req.on('error', e => {
      console.log('Error from /authcode: ' + e);
      resolve(ctx);
    });
    req.end();
  });
}


function externalUrl(req) {
  let external = url.format({
        protocol: req.header('x-client-scheme'),
        host: req.header('x-external-host'),
        pathname: req.header('x-proxy-basepath')
      });
  console.log(`externalUrl: ${external}`);
  return external;
}

function inquireAuthorizationSessionId(ctx) {
  return new Promise( (resolve, reject) => {
    // send a query to Edge to ask about the oauth session
    let encodedSessionId = encodeURIComponent(ctx.sessionid),
        endpoint = ctx.fullUrl.replace('login-and-consent', 'oauth2-session'),
        url =  new URL(endpoint + `/info?sessionid=${encodedSessionId}`),
        options = {
          hostname: url.hostname,
          path:`${url.pathname}${url.search}`,
          protocol: url.protocol,
          method: 'GET',
          headers: {
            apikey: config.sessionApi.apikey,
            Accept: 'application/json'
          }
        };

    console.log('inquireAuthorizationSessionId request: ' + JSON.stringify(options, null, 2));

    const req = https.request(options, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => {
              body += chunk;
            });
            console.log(`/info response: ${response.statusCode}`);

            response.on('end', () => {
              console.log('inquireAuthorizationSessionId response: ' + body);
              if (response.statusCode === 200) {
                try {
                  body = JSON.parse(body);
                  // Edge knows about the session and has returned information about it.
                  ctx.sessionInfo = body;
                }
                catch (exc1) {
                  console.log('inquireAuthorizationSessionId exception: ' + exc1.message);
                }
              }
              return resolve(ctx);
            });
          });

    req.on('error', e => {
      console.log('Error from /info: ' + e);
      ctx.error = e;
      reject(ctx);
    });
    req.end();

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
  //var auth = request.session.username;
  request.session = null; // logout
  response.redirect('manage');
});


// display the cancel page
app.get('/cancel', function (request, response) {
  response.status(200);
  response.render('cancel', {
    title: 'Declined',
    mainMessage: 'You have declined.'
  });
});


// display the login form
app.get('/login', function (request, response) {
  // GET /login?sessionid=xxxxxxx
  function renderNoLogin (e) {
    console.log('error: ' + e);
      response.status(404);
      response.render('error404', {
        mainMessage: 'the sessionid is not known.',
        title : 'bad sessionid'
      });
  }

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
      ctx.viewData.redirect_url = ctx.viewData.redirect_url || '';
      ctx.viewData.req_state = ctx.viewData.req_state || '';
      ctx.viewData.appName = ctx.viewData.appName || '';
      ctx.viewData.errorMessage = null; // must be present and null
      response.render('login', ctx.viewData);
    }
    else {
      renderNoLogin();
    }
    return ctx;
  }

  Promise.resolve({sessionid: request.query.sessionid, fullUrl: externalUrl(request)})
    .then(inquireAuthorizationSessionId)
    .then(renderLogin)
    .catch ( e => renderNoLogin(e)) ;

});


// respond to the login form postback
app.post('/validate', function (request, response) {
  console.log('BODY: ' + JSON.stringify(request.body));
  if ( ! request.body.redirect_uri) {
    response.status(400);
    response.render('error', { errorMessage : 'Bad request - missing redirect_uri' });
    return;
  }

  if (request.body.submit !== 'yes') {
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
      errorMessage  : 'You must specify a user and a password.'
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
          errorMessage  : 'That login failed.'
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

  if (request.body.submit !== 'yes') {
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
            'Bad request - cannot redirect'
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


let httpPort = process.env.PORT || 5150;
app.listen(httpPort, function() {
  console.log('Listening on port ' + httpPort);
});
