const toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');

//
// ─── SETTINGS ───────────────────────────────────────────────────────────────────
//

toolbox.options.cache.name = 'soundcloud-shell-cache';
toolbox.precache([
  '/',
  'index.html',
  'main.js',
  'polyfills.js',
  'https://api.soundcloud.com/users/185676792/favorites?client_id=d02c42795f3bcac39f84eee0ae384b00&limit=60&linked_partitioning=1'
]);

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
    .keys()
    .then(keys => {
      // remove old cache
      keys.forEach(key => {
        caches.delete(key);
      });
    })
    .then(
      // claim client without waiting for reload
      self.clients.claim()
    )
    .then(
      // add detection if it's the first version.
      // If yes -> display: 'app is ready for offline use'
      // Else -> display: 'a new version is available to use, please refresh
      sendMessageToAllClients('activated')
    )
  );
});

self.addEventListener('install', event => {
  // replace old sw without browser restart
  event.waitUntil(self.skipWaiting());
});


//
// ─── FETCH: APP-SHELL ─────────────────────────────────────────────────────────────
//

toolbox.router.get('/(.*)', (request, values, options) => {
  console.log(request.url);

  if (!request.url.match(/(\/sockjs-node\/)/)) {
    return toolbox.cacheFirst(request, values, options);
  } else {
    return toolbox.networkOnly(request, values, options);
  }
});


//
// ─── FETCH: DATA ─────────────────────────────────────────────────────────────
//

toolbox.router.get('/(.*)', (request, values, options) => {
  if (request.url.includes('stream')) {
    return handleMusicCache(request, values, options);
  } else {
    return handleDataCache(request, values, options);
  }
}, {
  origin: /wis.sndcdn.com|api.soundcloud.com/
});

function handleDataCache(request, values, options) {
  // special case -> get data from shell
  if (request.url.includes('users/185676792')) {
    return toolbox.fastest(request, values, {
    cache: {
      name: 'soundcloud-shell-cache',
    }
  });
  }
  return toolbox.fastest(request, values, {
    cache: {
      name: 'soundcloud-data-cache',
      maxEntries: 200
    }
  });
}

function handleMusicCache(request, values, options) {
  return self.caches.open('soundcloud-music-cache').then(cache => {
    return cache.keys().then(keys => {
      let obj = keys.find(key => key.url === request.url);

      if (obj) {
        return toolbox.cacheOnly(request, values, {
          cache: {
            name: 'soundcloud-music-cache'
          }
        });
      } else {
        console.log('[SW] Music: network');
        return toolbox.networkOnly(request, values, options);
      }
    });
  });
}

//
// ─── FETCH: IMAGES ─────────────────────────────────────────────────────────────
//

toolbox.router.get('/(.*)', toolbox.fastest, {
  origin: /i1.sndcdn.com/,
  cache: {
    name: 'soundcloud-img-cache',
    maxEntries: 200
  }
});




//
// ─── COMMUNICATION: CLIENT -> SW ────────────────────────────────────────────────
//

self.addEventListener('message', function(event) {
  switch (event.data.command) {
    case 'downloadMusic':
      downloadMusic(event.data.url);
      break;

    case 'deleteMusic':
      deleteMusic(event.data.url);
      break;

    default:
      console.warn('message event: switch doesn\'t match');
  }
});

function replyToMessage(message) {
  event.ports[0].postMessage({
    'message': message
  });
}


//
// ─── COMMUNICATION: SW -> CLIENT ────────────────────────────────────────────────
//

function sendMessageToAllClients(msg) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      sendMessage(client, msg).then(m => console.log('SW Received Message: ' + m));
    });
  });
}

function sendMessage(client, msg) {
  return new Promise(function(resolve, reject) {
    let channel = new MessageChannel();

    channel.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    client.postMessage(msg, [channel.port2]);
  });
}


//
// ─── HANDLE SONG TRACKS ─────────────────────────────────────────────────────────
//

function downloadMusic(url) {
  toolbox.cache(url, {
    cache: {
      name: 'soundcloud-music-cache'
    }

  }).catch(err => {
    console.warn('sw: download error: ' + err);
    replyToMessage('failed');

  });
}

function deleteMusic(url) {
  toolbox.uncache(url, {
    cache: {
      name: 'soundcloud-music-cache'
    }

  }).catch(err => {
    console.warn('sw: delete error: ' + err);
    replyToMessage('failed');

  });
}
