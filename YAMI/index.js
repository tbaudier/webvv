const express = require('express');
require('babel-polyfill');
const app = express();

const port = 9191;

app.get('/', function(req, res) {
  res.send('This is the root of this server... Aren\'t you looking for the /viewer/ ?');
})

// Statics routes allow use to get files without any modification (image, data, ...)
app.use('/viewer', express.static('public'));
app.use('/datafiles', express.static('studies'));
app.use('/thumbnail', express.static('thumbnails'));

app.listen(port, function() {
  console.log('Viewer server started on port ' + port);
})
