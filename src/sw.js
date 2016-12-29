const toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');
const localForage = require('localforage');

const lfCachedMusicURLs = localForage.createInstance({
  name: 'soundcloud-url-cache'
});


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
      // remove old indexDB entries
      lfCachedMusicURLs.clear();
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
  // debugger;

  if (!request.url.includes('stream')) {
    // json
    return toolbox.fastest(request, values, options);
  } else {
    // music
    return lfCachedMusicURLs.getItem(request.url).then(url => {

      if (url !== null) {
        console.log('Music: cache');
        return toolbox.cacheOnly(request, values, {
          cache: {
            name: 'soundcloud-music-cache'
          }
        });
      } else {
        console.log('Music: network');
        return toolbox.networkOnly(request, values, options);
      }

    }).catch(err => {
      console.log('sw music: ' + err);
      return toolbox.networkOnly(request, values, options);

    });
  }
}, {
  origin: /wis.sndcdn.com|api.soundcloud.com/,
  cache: {
    name: 'soundcloud-data-cache',
    maxEntries: 200
  }
});


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

  }).then(() => {
    lfCachedMusicURLs.setItem(url, url).catch(err => {
      console.error('Localforage - error saving url: ' + err);
      replyToMessage('failed');
    });

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

  }).then(() => {
    lfCachedMusicURLs.removeItem(url).catch(err => {
      console.error('Localforage - error deleting url: ' + err);
      replyToMessage('failed');
    });

  }).catch(err => {
    console.warn('sw: delete error: ' + err);
    replyToMessage('failed');

  });
}
