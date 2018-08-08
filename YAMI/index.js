require('babel-polyfill');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
// config
const port = 9191;
// parse/serialize json
app.use(bodyParser.json());

// root of the server (GET route)
app.get('/', function(req, res) {
  res.send('This is the root of this server... Aren\'t you looking for the /viewer/ ?');
})
// route target to send json in POST to be written down
app.post('/registration', function(req, res) {
  console.log("--------------");
  console.log("Registration received");
  console.log(req.body); // your JSON
  let result = {
    done: 'not ok'
  };
  let registrationStr = JSON.stringify(req.body.registrationJson, null, 2);
  let name = randomString(4) + "-" + randomString(4) + "-" + randomString(4) + "-" + randomString(4);
  fs.writeFile('registrations/' + name, registrationStr, 'utf8', (err) => {
    if (err) {
      result.done = err;
      console.log("Error with this registration");
    } else {
      result.done = 'ok';
      console.log("Registration saved");
    }
    req.body.callback.type = "registration";
    sendNumidoCallback(
      req.body.callback,
      name,
      _ => {
        res.send(result);
      },
      _ => {
        result.done = "Error while sending to numido";
        res.send(result);
      }
    );
  });
})

// Statics routes allow use to get files without any modification (image, data, ...)
app.use('/viewer', express.static('public'));
app.use('/datafiles', express.static('studies'));
app.use('/thumbnail', express.static('thumbnails'));

// Start of the server
app.listen(port, function() {
  console.log('Viewer server started on port ' + port);
})


/**
 * generate a string of random hexadeimal values (0-9a-f)
 *
 * @param  {Number} len length of the expected string, 4 if not specified
 * @return {String}     Generated random string
 */
function randomString(len) {　　
  len = len || 4;　　
  var $chars = 'abcdef0123456789';　　
  var maxPos = $chars.length;　　
  var pwd = '';　　
  for (i = 0; i < len; i++) {　　　　
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));　　
  }　　
  return pwd;
}


/**
 * Send a request to Numido to specify that a json of Registration has been created
 *
 * @param  {Object} callbackToNumido
 * @param  {String} callbackToNumido.url URl to Numido server
 * @param  {String} callbackToNumido.path path to concatenate with Numido URL
 * @param  {String} callbackToNumido.type type of the callback Numido URL
 * @param  {String} name             name of the generated file
 * @param  {callback} success          success callback
 * @param  {callback} fail             fail callback
 */
function sendNumidoCallback(callbackToNumido, name, success, fail) {
  let xhr = new XMLHttpRequest();
  let suffixe = "?callback=";
  let url = callbackToNumido.url + callbackToNumido.path + suffixe + callbackToNumido.type + "/" + name;
  console.log("request sent to " + url);
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        success();
      } else {
        fail();
      }
    }
  };
  xhr.send();
}
