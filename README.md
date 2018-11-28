# OAuth Token-granting Proxy for 3-legged (Authorization code) flow with PKCE

This is an API Proxy that implements the OAuth2.0 3-legged (authorization code)
flow, with PKCE ([RFC 7636](https://tools.ietf.org/html/rfc7636)), which itself is an extension of the OAuthV2 spec ([RFC 6749](https://tools.ietf.org/html/rfc6749)).

With the authorization code grant, both the user and the app credentials get
verified. In the Apigee Edge model, there is an external Identity Provider that
authenticates the user credentials, and Apigee Edge itself authenticates the
application (client) credentials.

User authentication obviously requires a login-and-consent user experience.

For this proxy, the login-and-consent app is bundled within this API Proxy. (For
the curious, it's deployed as a nodejs app, packaged as a hosted target, for a
separate proxy endpoint) Having the login experience bundled in the proxy makes
it super easy to demonstrate 3-legged OAuthV2 with PKCE in Apigee Edge. You
won't do this in a production system.


## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.



## The Basics of the Code Verifier and Challenge

According to RFC7636, the PKCE verifier is a string of random characters, from
43 to 128 characters in length.

The challenge is `BASE64URL(SHA256(code_verifier))`.
In other words it is a shorter string representing the SHA256 of the verifier.

Maybe this is obvious, but: the two strings are different. You must compute the
challenge from the verifier. It is not possible to compute the verifier from the
challenge.

In the `GET /authorize` call, the client passes the CHALLENGE.
When exchanging the code for a token (`POST /token`), the client passes the VERIFIER.

The idea is that only the bonafide client would have the random verifier that
matches the challenge. This avoids risk of interception of the code in transit.


## Setup

Before exercising this demonstration, you need to:

1. Deploy the OAuthV2 token-dispensing proxy bundle.

2. Create a cache named 'cache1' in your environment.

3. Create an API Product, it can allow access to any OTHER api proxy.  The product should have scopes: A,B,C.

4. Create a developer

5. Create a developer app, attached to that developer, and authorized for the previously created product. 
   The app should have a redirect_uri of https://dinochiesa.github.io/pkce-redirect/callback-handler.html
   Retain the client_id and client_secret of the developer app.


Fortunately, there are command-line helper tools that do this work for you. To use them, you need node and npm.

```
cd tool
npm install
node ./importAndDeploy.js -v -o MyORG -e test -d ..
node ./provisionAssets.js -v -o MyORG -e test
```


## To Kick off the flow

Once the pre-requisites are provisioned in your Apigee Edge organization, you can exercise the example. To do that you need to invoke the /authorize endpoint. This is the standard way to start a 3-legged OAuth token acquisition.

From the command line, you could do it like this:

```
ORG=MyORG
ENV=myenv
client_id=whatever
client_secret=whatever
redirect_uri=https://dinochiesa.github.io/pkce-redirect/callback-handler.html
code_verifier=SOME_RANDOM_STRING_OF_CHARACTERS_OF_SUFFIcienT_LENGTH
code_challenge=BASE64URL(SHA256(code_verifier))

curl -i -X GET "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=A&code_challenge=${code_challenge}code_challenge_method=S256"
```

Breaking that request down, here are the query params.

| param                 | description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| client_id             | a registered client id within Apigee Edge                                |
| redirect_uri          | a valid uri registered for the API Product authorized by that client ID. |
| response_type         | always `code` in this example, for authorization code grant.             |
| scope                 | a space-separated list of scopes allowed by this API Product.            |
| code_challenge        | the [code challenge](https://tools.ietf.org/html/rfc7636#section-4.1) as described by RFC 7636. |
| code_challenge_method | the code challenge method. For calls to this proxy, must always have the value S256.            |

## Command-line tools

If you want to invoke the API from the command line, you can create a code
verifier and compute the code challenge using the accompanying tool,
[contriveProofKey.js](./tools/contriveProofKey.js).  This tool just generates a
random string and then computes a SHA256 hash of it.

You need node and npm installed, in order to use this tool.

```js
cd tools
npm install
node ./contriveProofKey.js
```

Successful output looks like this:

```
code_verifier=H51JplDGBt55sQCvnVOY5252vczj55565649oy48EKfZXtmMsRWsPAXhjUpeVltQpZ4950bR50UTJHPpfgVEuqOWsccNL49io54hh54a52u52oGyFH55xGY55xFaQ55kYMz4855
code_challenge=a_Azw48swzMP8Y3AXufd7qPQ1abMyn_3S_deGuvXBbY
```


## The Web Helper!

If you don't want to use the command line, there is [a helper web
page](https://dinochiesa.github.io/pkce-redirect/pkce-link-builder.html) to
assist you in building the /authorize URL.  Fill in the form with the
appropriate values for your org, env, app etc.  The helper will automatically
generate a random verifier and the matching challenge.  Once you get the URL, right click
it and open the page in a new tab. (keep the helper tab open separately)

Nothing like the helper will ever be seen by a real user. This is just a
development-time tool, useful for demonstrating and exercising the token
granting flow. Once a real app is built, it will embed the URL that might be
generated by the helper, into its own code.


## Invoke the URL

If you want to examine what the API Proxy is doing, now is a good time to enable tracing on the proxy.  The proxy name is:
`oauth2-ac-pkce`.

Paste the resulting /authorize URL into a browser tab. (or if using the helper, right-click the constructed URL to open in a new tab)

Invoking the URL for the /authorize request will redirect you to a URL for the
login-and-consent app. If you invoke the /authorize endpoint from the command
line you will see a 302 response with a Location header. You need to open the
resulting link in a browser and authenticate. If you paste the /authorize URL
into a browser, it will automatically follow the 302 redirect.


The login-and-consent app uses a mock user database; these are the valid username / password pairs:
* dino@apigee.com / IloveAPIs
* valerie@example.com / Wizard123
* heidi@example.com / 1Performance
* greg@example.com / Memento4Quiet
* naimish@example.com / Imagine4


Once you authenticate and grant consent, you will receive a code via the redirect_uri.


## To Exchange the code and verifier for a token

Copy the code shown in the redirect_uri web page, then paste it into a request like so:

```
curl -i -X POST "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/token" \
   -u ${client_id}:${client_secret} \
   -d 'grant_type=authorization_code&code=${authorization_code}&code_verifier=XXXX'
```

Or, you can return to the helper page and paste in the code in the appropriate
box at the bottom of the form. The helper page will generate the CURL request
that allows you to redeem the code for a token. Paste in the code and press TAB
to get the URL to appear.

When you invoke the /token request, if the code is invalid, or if the code
verifier does not match the challenge you used to obtain the code, the token
request will return 401.


## How does it work?

There are three "proxy endpoints" in the proxy bundle here.

1. *oauthv2* - responsible for sending a redirect for the initial request to
/authorize, and for generating authorization codes, and generating access
tokens.

2. *session* - responsible for sharing session information about in-flight
3-legged token "conversations". The login server invokes this to find out about
the client app.

3. *login* - additional endpoint, just used for this demonstration. this actually
hosts a full nodejs app. It's bundled here only for simplicity. Normally the
login and consent app is a self-standing app. Remember, the /authorize flow just
redirects to the login app.


Here's a breakdown of how it works.

1. The first request in an authorization code grant flow is `GET /authorize`.
   The API Proxy creates a session blob, containing information like the
   client_id, the app name, the scope, and so on. For PKCE, this session also
   stores the CODE_CHALLENGE. It stores this session blob in the in-memory cache for
   Apigee Edge, using the session id as the cache key. The session id here is
   just the "message id", which is a unique string for every request handled by
   an Apigee Edge API proxy; it's available in a context variable called
   `messageid`.

   The flow then redirects to the login server. This login server can run anywhere;
   it just happens that it runs in the proxy bundle, but that's not required.  The
   login-and-consent app it needs to know about the /session endpoint on the proxy
   bundle, so it can inquire about the client app, the scope requested, and so on.

2. The user interacts with the login-and-consent app. The login interaction
   verifies the user identity; in this example it uses a mock user
   database. After the user is authenticated the login-and-consent app gets the
   information about the session - the client id and the app name and the
   scopes, and the redirect URI. This is required in order to present the
   consent screen. After the user grants consent, the login-and-consent app then
   invokes the /authcode flow on the oauth endpoint in the API Proxy. This
   generates an Authorization Code, per RFC 6749. At this point the proxy stores
   the same session in cache with a different key: the authorization code. This
   allows later retrieval (see the next step) when the app wants to exchange the
   code for a token. The login-and-consent app then redirects the web page to
   the registered URL. In this example the URL is just a web page that displays
   the code.

3. The client then performs a `POST /token` to exchange the code and the
   verifier for a token. The OAuth proxy endpoint handles this request. Using
   the code, it retrieves the cached session. It then computes the SHA256 of the
   CODE_VERIFIER, and compares that to the stored CODE_CHALLENGE. IF they match,
   all good. If not, no token.

So this PKCE proxy is really a smple elaboration of the basic Authorization Code
grant flow, with the addition of checking the challenge and verifier, relying on
the Apigee Edge cache for that purpose.  The TTL for cached session is tunable
of course; I set it to 10 minutes to allow delays during demonstrations. It
makes sense to make that TTL shorter in a production system. 60-90 seconds ought
to be enough. It's got to be long enough to accommodate the user login and
consent. That should take 15 seconds or so normally, but one could imagine a
longer period in exceptional circumstances.


## Teardown

If you want to remove all the assets that were provisioned by the tool for this example, do this:

```
node ./provisionAssets.js -v -o gaccelerate3 -e test -R

```


## Support

This example is just an illustration. It is not a supported part of Apigee Edge.
If you have questions on it, or would like assistance with it, you can try
inquiring on [The Apigee Community Site](https://community.apigee.com).  There
is no service-level guarantee for responses to inquiries regarding this example.


## License

This material is copyright 2018 Google LLC.
and is licensed under the [Apache 2.0 License](LICENSE).


## Bugs

* The /token request is not CORS compliant, so redeeming the code for a token from the helper page does not work.
  (Must use curl).

