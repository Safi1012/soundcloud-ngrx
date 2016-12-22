toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');
localForage = require('localforage');

// indexDB database
lfCachedMusicURLs = localForage.createInstance({
  name: 'soundcloud-url-cache'
});


// app shell
self.toolbox.router.get('/(.*)', function(request, values, options) {
  console.log(request.url);

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

// json + music
self.toolbox.router.get('/(.*)', function(request, values, options) {

  if (!request.url.includes('stream')) {
    // json  
    return self.toolbox.fastest(request, values, options);

  } else {
    // music
    return lfCachedMusicURLs.getItem(request.url).then(url => {

      if (url !== null) {
        console.log('Music: cache');
        return self.toolbox.cacheOnly(request, values, {
          cache: {
            name: 'soundcloud-music-cache'
          }
        });
      } else {
        console.log('Music: network');
        return self.toolbox.networkOnly(request, values, options);
      }

    }).catch(err => {
      console.log('sw music: ' + err);
      return self.toolbox.networkOnly(request, values, options);

    });
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

self.addEventListener('message', function(event) {
  debugger;

  switch (event.data.command) {
    case 'downloadMusic':
      downloadMusic(event.data.url, event);
      break;

    case 'deleteMusic':
      deleteMusic(event.data.url, event);
      break;
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
}); 

function downloadMusic(url, event) {
  self.toolbox.cache(url, {
    cache: {
      name: 'soundcloud-music-cache'
    }

  }).then(() => {
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
  self.toolbox.uncache(url, {
    cache: {
      name: 'soundcloud-music-cache'
    }

  }).then(() => {
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
