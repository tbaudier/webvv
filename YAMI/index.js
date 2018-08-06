require('babel-polyfill');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const port = 9191;

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.send('This is the root of this server... Aren\'t you looking for the /viewer/ ?');
})

app.post('/registration', function(req, res) {
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
    console.log("--------------");
    sendNumidoRegistration(
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

app.listen(port, function() {
  console.log('Viewer server started on port ' + port);
})


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

function sendNumidoRegistration(callbackToNumido, name, success, fail) {
  let xhr = new XMLHttpRequest();
  let url = callbackToNumido.url + callbackToNumido.path + "?" + name;
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
