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
