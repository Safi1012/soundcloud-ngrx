toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');
localForage = require('localforage');

// indexDB database
lfCachedURLs = localForage.createInstance({
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

// onOfflineSwitchToogle((song) => {
//     self.toolbox.cache(song.url).then(() => { idb.addToCachedUrls(song.url); });
// })


self.addEventListener('message', function(event) {
  debugger

  console.log(event.data.command);
  console.log(event.data.url);

  switch (event.data.command) {
    case 'saveMusic':
      downloadMusic(event.data.url);
      break;

    case 'deleteMusic':
      deleteMusic(event.data.url);
      break;
  }
});

function downloadMusic(url) {
  self.toolbox.cache(url).then(() => {

    // add URL to indexDB
    lfCachedURLs.setItem(url, url).catch(err => {
      console.log('Localforage - error saving url: ' + err);
    });

  }).catch(err => {
    console.log(err);
    // send message to client so it updates the UI

  });
}

function deleteMusic(url) {
  self.toolbox.uncache(url).then(() => {

    // remove URL from indexDB
    lfCachedURLs.removeItem(url).catch(err => {
      console.log('Localforage - error deleting url: ' + err);
    });

  }).catch(err => {
    console.log(err);
    // call to client -> move toggle back to 'selected'

  });
}
