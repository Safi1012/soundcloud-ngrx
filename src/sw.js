toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');
localForage = require('localforage');

// indexDB database
lfCachedMusicURLs = localForage.createInstance({
  name: 'soundcloud-url-cache'
});


// app shell
self.toolbox.router.get('/(.*)', function(request, values, options) {
  console.log(request.url);

  // don't cache sockets'
  if (!request.url.match(/(\/sockjs-node\/)/) && request.headers.get('accept')) {
    return self.toolbox.cacheFirst(request, values, options);
  } else {
    return self.toolbox.networkOnly(request, values, options);
  }
}, {
  cache: {
    name: 'soundcloud-shell-cache',
    maxEntries: 20
  }
});

// json
self.toolbox.router.get('/(.*)', function(request, values, options) {

  // don't cache music files
  if (!request.url.includes('stream')) {
    return self.toolbox.fastest(request, values, options);
  } else {
    return self.toolbox.networkOnly(request, values, options);
  }
}, {
  origin: /wis.sndcdn.com|api.soundcloud.com/,
  cache: {
    name: 'soundcloud-data-cache',
    maxEntries: 200
  }
});

// images
self.toolbox.router.get('/(.*)', self.toolbox.fastest, {
  origin: /i1.sndcdn.com/,
  cache: {
    name: 'soundcloud-img-cache',
    maxEntries: 200
  }
});

// music
self.toolbox.router.get('/(.*)', function(request, values, options) {
  debugger;

  var requestedUrl = request.url.includes('stream');

  if (requestedUrl.includes('stream')) {

    lfCachedMusicURLs.getItem(requestedUrl).then(url => {
      if (url !== null) {
        return self.toolbox.cacheOnly(request, values, options);
      } else {
        return self.toolbox.networkOnly(request, values, options);
      }
    }).catch(err => {
      console.log('sw music: ' + err);
      return self.toolbox.networkOnly(request, values, options);

    });

  } else {
    return self.toolbox.networkOnly(request, values, options);

  }
}, {
  origin: /api.soundcloud.com/
});

self.addEventListener('message', function(event) {
  switch (event.data.command) {
    case 'saveMusic':
      downloadMusic(event.data.url, event);
      break;

    case 'deleteMusic':
      deleteMusic(event.data.url, event);
      break;
  }
});

function downloadMusic(url, event) {
  debugger;

  self.toolbox.cache(url).then(() => {
    lfCachedMusicURLs.setItem(url, url).catch(err => {
      console.log('Localforage - error saving url: ' + err);
      sendMessageToClient('failed')
    });

  }).catch(err => {
    console.log('sw: download error: ' + err);
    sendMessageToClient('failed')

  });
}

function deleteMusic(url, event) {
  debugger;

  self.toolbox.uncache(url).then(() => {
    lfCachedMusicURLs.removeItem(url).catch(err => {
      console.log('Localforage - error deleting url: ' + err);
      sendMessageToClient('failed')
    });

  }).catch(err => {
    console.log('sw: delete error: ' + err);
    sendMessageToClient('failed');

  });
}

function sendMessageToClient(message) {
  event.ports[0].postMessage({
    'message': message
  });
}
