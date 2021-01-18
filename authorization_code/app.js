/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const { json } = require('body-parser');
const { response } = require('express');

var client_id // Your client id
var client_secret  // Your secret
var redirect_uri = "http://localhost:8888/callback/"; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token},
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


app.get('/get_obscure_tunes', function(req, res) {
  var access_token = req.query.access_token;
  console.log(access_token);

  var options = {
    url: 'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=5',
    headers: { 'Authorization': 'Bearer ' + access_token},
    json: true
  };

  var returnString = "\n";
    
  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {

    for (var i = 0; i < body.items.length; i++) {
      if (body.items[i].popularity < 0) {
        console.log(body.items[i].name);
        returnString += " " + body.items[i].name + " by " + body.items[i].artists[0].name + "\n";
      }
    }

    if (returnString === "\n") {
      returnString = "You had no songs because you're basic";
    }

    res.send({
      'items': returnString
    });
  
    
  });
});

console.log('Listening on 8888');
app.listen(8888);

function retrieveTracks() {
  $.ajax({
    url: `https://api.spotify.com/v1/me/top/tracks`,
    headers: {
      Authorization: 'Bearer ' + access_token
    },
    success: function (response) {
      var data = {
        trackList: response.items,
        total: 0,
        date: today.toLocaleDateString('en-US', dateOptions).toUpperCase(),
        json: true
      };
      for (var i = 0; i < data.trackList.length; i++) {
        data.trackList[i].name = data.trackList[i].name.toUpperCase();
        console.log(data.trackList[i].name)
        data.total += data.trackList[i].duration_ms;
        let minutes = Math.floor(data.trackList[i].duration_ms / 60000);
        let seconds = ((data.trackList[i].duration_ms % 60000) / 1000).toFixed(0);
        data.trackList[i].duration_ms = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        for (var j = 0; j < data.trackList[i].artists.length; j++) {
          data.trackList[i].artists[j].name = data.trackList[i].artists[j].name.trim();
          data.trackList[i].artists[j].name = data.trackList[i].artists[j].name.toUpperCase();
          if (j != data.trackList[i].artists.length - 1) {
            data.trackList[i].artists[j].name = data.trackList[i].artists[j].name + ', ';
          }
        }
      }
      minutes = Math.floor(data.total / 60000);
      seconds = ((data.total % 60000) / 1000).toFixed(0);
      data.total = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      userProfilePlaceholder.innerHTML = userProfileTemplate({
        tracks: data.trackList,
        total: data.total,
        time: data.date,
        num: domNumber,
        name: displayName,
        period: domPeriod
      });

    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      // error handler here
    }
  });
}