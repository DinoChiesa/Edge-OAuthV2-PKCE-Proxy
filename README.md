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
43 to 128 characters in length.  Why? I don't know, that's what the spec says.

The challenge is `BASE64URL(SHA256(code_verifier))`.
In other words it is a shorter string representing the SHA256 of the verifier.

Maybe this is obvious, but: the two strings are different. You must compute the
challenge from the verifier. It is not possible to compute the verifier from the
challenge.

In the /authorize call, the client passes the CHALLENGE.
When exchanging the code for a token, the client passes the VERIFIER.

The idea is that only the bonafide client would have the random verifier that
matches the challenge. This avoids risk of interception of the code in transit.


## Setup

Before exercising this demonstration, you need to:

1. deploy the OAuthV2 token-dispensing proxy bundle.

2. create a cache named 'cache1' in your environment.

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
generate a random verifier and a challenge.  Once you get the URL, right click
it and open the page in a new tab. (keep the helper tab open separately)

Nothing like the helper will ever be seen by a real user. This is just a
development-time tool, useful for demonstrating and exercising the token
granting flow. Once a real app is built, it will embed the URL that might be
generated by the helper, into its own code.


## Invoke the URL

If you want to examine what the API Proxy is doing, now is a good time to enable tracing on the proxy.  The proxy name is:
`oauth2-ac-pkce`.

Paste the resulting /authorize URL into a browser tab. (or if using the helper, right-click the constructed URL to open in a new tab)

Invoking the URL for the /authorize request will redirect you to a URL for the login-and-consent app.  You need to open the resulting link in a browser and authenticate.

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

## Teardown

If you want to remove all the assets that were provisioned by the tool, do this:

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

