# OAuth Token-granting Proxy for 3-legged (Authorization code) flow with PKCE

This is an API Proxy that implements the OAuth2.0 3-legged (authorization code)
flow, with PKCE ([RFC 7636](https://tools.ietf.org/html/rfc7636)), which itself
is an extension of the OAuthV2 spec ([RFC 6749](https://tools.ietf.org/html/rfc6749)).

With the authorization code grant, both the user and the app credentials get
verified. In the Apigee model, there is an external Identity Provider that
authenticates the user credentials, and Apigee  itself authenticates the
application (client) credentials.

User authentication obviously requires a login-and-consent user experience.

For this proxy, the login-and-consent app is bundled within this API Proxy. For
this demonstration, it's implemented in nodejs, packaged as a hosted target, on
a separate proxy endpoint. Having the login experience contained within the
proxy bundle makes it super easy to demonstrate 3-legged OAuthV2 with PKCE in
Apigee. You won't do this in a production system.

In a production system, you could use a hosted target to host the
login-and-consent experience, but it would need to connect to a proper identity
provider.

## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.


## The Basics of the Code Verifier and Challenge

According to RFC7636, the PKCE verifier is a string of random characters, from
43 to 128 characters in length.

The challenge is `BASE64URL(SHA256(code_verifier))`.
In other words it is a shorter string representing the SHA256 of the verifier.

This should be obvious: the two strings are different. You must compute the
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
   Retain the client_id  of the developer app.


Fortunately, there are command-line helper tools that help you do the
preparation work. To use them, you need to have a current installation of node and npm.

## Provision the assets with the Command-line tool

Open a terminal window and run these commands:

```
cd tools
npm install
ORG=myorg
ENV=myenv

node ./provision.js -v -o $ORG -e $ENV
```

The provision.js tool imports and deploys the proxy checks for and creates the product, developer and app,
and then emits a few lines that you can copy/paste to set shell variables. The
final output of that tool looks like this:

```
ORG=orgname
ENV=envname
client_id=LadBY5r7wscxF4MXftAvAL9OBQ3j4D1G
redirect_uri=https://dinochiesa.github.io/pkce-redirect/callback-handler.html
code_verifier=j2lfhcgv8y0eld7rztsxwilfkovtqnn8laclgtze73qqxi8bjxu8lbp1xpqzpkfrllt25nu99jz1fc1zrwx1920fazbdxk1ot3zp493276pz9751n9a2eduqqjys
code_challenge=_em6TflF_a7HvzptwpKdAz_R9SPRvzBbUCvZuwfDWo4
```

Your output will be different.

You're going to need all of that information in a few moments.


## To Kick off the flow

Now that the pre-requisites are provisioned in your Apigee organization, you
can exercise the example. To do that you need to invoke the /authorize
endpoint. This is the standard way to start a 3-legged OAuth token acquisition.

From the command line, you could do it like this:

```
curl -i -X GET "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=A&code_challenge=${code_challenge}&code_challenge_method=S256"
```

Here's a description of the required query parameters:

| param                   | description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `client_id`             | a registered client id within Apigee                                 |
| `redirect_uri`          | a valid uri registered for the API Product authorized by that client ID. |
| `response_type`         | always `code` in this example, for authorization code grant.             |
| `scope`                 | a space-separated list of scopes allowed by this API Product.            |
| `code_challenge`        | the [code challenge](https://tools.ietf.org/html/rfc7636#section-4.1) as described by RFC 7636. |
| `code_challenge_method` | the code challenge method. For calls to this proxy, must always have the value S256.            |


For the `redirect_uri`, I suggest using my own callback endpoint on a
publicly-available webpage: `https://dinochiesa.github.io/pkce-redirect/callback-handler.html`

## Initiate the flow from a Terminal

If you want to examine what the API Proxy is doing, now is a good time to enable
tracing on the proxy.  Do that within the Apigee Admin UI. The proxy name is:
`oauth2-ac-pkce`.


Now, invoke the API from the terminal. First, copy/paste the output
lines from the provision.js tool. This sets shell variables ffor all of the
required parameters. After that, invoke the curl command as shown above:
```
curl -i -X GET "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=A&code_challenge=${code_challenge}&code_challenge_method=S256"
```

This will initiate the flow and return you a URL that will allow the user to
login. You need to copy THAT and paste it into a browser bar to get the
login-and-consent user experience.

> You can alternatively use a webpage to kick off the flow. To do that, visit
> [https://dinochiesa.github.io/pkce-redirect/](https://dinochiesa.github.io/pkce-redirect/),
> and fill in the form fields with the values that were emitted by the
> provision.js tool.


Regardless whether you use a terminal or the webpage to initiate the flow, you
will then visit the login-and-consent application.
The login-and-consent app uses a mock user database; these are the valid username / password pairs:
* dino@apigee.com / IloveAPIs
* valerie@example.com / Wizard123
* heidi@example.com / 1Performance
* greg@example.com / Memento4Quiet
* naimish@example.com / Imagine4


After you consent, you will then receive a code in the browser page.

## To Exchange the code and verifier for a token

Copy the code shown in the redirect_uri web page, then paste it into a request like so:

```
CODE=insert_authorization_code
curl -i -X POST "https://$ORG-$ENV.apigee.net/20181127/oauth2-ac-pkce/token" \
   -d "grant_type=authorization_code&client_id=${client_id}&code=${CODE}&code_verifier=${code_verifier}"
```

This will then show you the token response. It looks like this:
```
{
  "token_type": "Bearer",
  "access_token": "xJC3RTRCu5tpvIDhtTGBRIINZCav",
  "refresh_token": "EOX49jT2SAAdeT1Y6oqreoqoewWDud8N",
  "scope": "A",
  "refresh_token_expires_in": 0,
  "refresh_count": "0",
  "issued_at": 1569606383,
  "refresh_token_issued_at": 1569606383,
  "expires_in": 3599,
  "user": {
    "given_name": "Dino",
    "family_name": "Chiesa",
    "uuid": "EA1BA8EB-0A83-46BE-8B05-4C2E827F25B3",
    "email": "dino@apigee.com"
  }
}
```


If you want to run the experience again, you can create a new code
verifier and the corresponding code challenge using a specific tool,
[contriveProofKey.js](./tools/contriveProofKey.js). This tool just generates a
random string and then computes a SHA256 hash of it.

```js
cd tools
node ./contriveProofKey.js
```

Successful output looks like this:

```
code_verifier=H51JplDGBt55sQCvnVOY5252vczj55565649oy48EKfZXtmMsRWsPAXhjUpeVltQpZ4950bR50UTJHPpfgVEuqOWsccNL49io54hh54a52u52oGyFH55xGY55xFaQ55kYMz4855
code_challenge=a_Azw48swzMP8Y3AXufd7qPQ1abMyn_3S_deGuvXBbY
```

Copy/paste those lines directly in the terminal to set the appropriate
environment variables. Then, Initiate the login flow again as described above.


## The Web Helper

If you don't want to use the command line, there is [a helper web
page](https://dinochiesa.github.io/pkce-redirect/pkce-link-builder.html) to
assist you in building the /authorize URL and kicking things off.

To use it, fill in the form with the appropriate values for your org, env, app
etc. The helper will automatically generate a random verifier and the matching
challenge. Once you get the URL, right click it and open the page in a new
tab. (keep the helper tab open separately)

Nothing like the helper will ever be seen by a real user. This is just a
development-time tool, useful for demonstrating and exercising the token
granting flow. Once a real app is built, it will embed the URL that might be
generated by the helper, into its own code.


## Invoke the URL

Paste the resulting `/authorize` URL into a browser tab. (or if using the helper,
right-click the constructed URL to open in a new tab)

Invoking the URL for the `/authorize` request will redirect you to a URL for the
login-and-consent app. If you invoke the `/authorize` endpoint from the command
line you will see a 302 response with a Location header. You need to use a
browser to visit the link in the Location header. This will open the login page,
where you must authenticate. If you paste the `/authorize` URL into a browser,
it will automatically follow the 302 redirect and bring you to the login page.

Once you authenticate and grant consent, you will receive a code via the `redirect_uri`.


## To Exchange the code and verifier for a token

After authenticating and granting consent, you will be redirected to a simple
page showing the authorization code.
Copy the code (ctrl-C).

Return to the helper page and paste in the code in the appropriate
box at the bottom of the form. Press tab. The helper page will generate the cURL request
that allows you to redeem the code for a token.

You can then copy that command to run it from the terminal, or click the Redeem
button to invoke the appropriate command from the browser itself.

When you invoke the `/token` request, You should see a valid token.

If the code is invalid, or if it has expired, or if the code
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
   Apigee , using the session id as the cache key. The session id here is
   just the "message id", which is a unique string for every request handled by
   an Apigee API proxy; it's available in a context variable called
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
   CODE_VERIFIER, and compares that to the stored CODE_CHALLENGE. If they match,
   all good. If not, no token.

So this PKCE proxy is really a smple elaboration of the basic Authorization Code
grant flow, with the addition of checking the challenge and verifier, relying on
the Apigee cache for that purpose. The TTL for cached session is tunable
of course; I set it to 10 minutes to allow delays during demonstrations. It
makes sense to make that TTL shorter in a production system. 60-180 seconds ought
to be enough. It's got to be long enough to accommodate the user login and
consent. That should take 15-75 seconds or so normally, but one could imagine a
longer period in exceptional circumstances.


## Teardown

If you want to remove all the assets that were provisioned by the tool for this example, do this:

```
node ./provision.js -v -o $ORG -e $ENV -R

```


## Support

This example is just an illustration. It is not a supported part of Apigee.
If you have questions on it, or would like assistance with it, you can try
inquiring on [The Apigee Community Site](https://community.apigee.com).  There
is no service-level guarantee for responses to inquiries regarding this example.


## License

This material is copyright 2018-2020 Google LLC.
and is licensed under the [Apache 2.0 License](LICENSE).


## Bugs

??

