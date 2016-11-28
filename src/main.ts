import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Root module
import { AppModule } from './app';

// shared styles
import './shared/styles/styles.scss';

const runtime = require('serviceworker-webpack-plugin/lib/runtime');

if ('serviceWorker' in navigator) {
  runtime.register();
}

if (process.env.NODE_ENV === 'production') {
  enableProdMode();
}

document.addEventListener('DOMContentLoaded', () => {
  platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(error => console.error(error));
});
