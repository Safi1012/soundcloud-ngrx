toolbox = require('node_modules/sw-toolbox/sw-toolbox.js');

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

// images
self.toolbox.router.get('/(.*)', self.toolbox.fastest, {
  origin: /i1.sndcdn.com/,
  cache: {
    name: 'soundcloud-img-cache',
    maxEntries: 200
  }
});

// data -> forbid if data is mp3
// content-type:audio/mpeg
// only: content-type:application/json; charset=utf-8
self.toolbox.router.get('/(.*)', self.toolbox.fastest, {
  origin: /wis.sndcdn.com|api.soundcloud.com/,
  cache: {
    name: 'soundcloud-data-cache',
    maxEntries: 200
  }
});