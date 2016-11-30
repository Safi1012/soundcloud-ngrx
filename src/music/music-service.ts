import * as localForage from 'localforage';
import { Injectable } from '@angular/core';
import { API_TRACKS_URL, CLIENT_ID_PARAM } from 'src/constants';

@Injectable()
export class MusicService {
  isServiceWorkerSupported: boolean;
  isDownloaded = false;

  lfCachedMusicURLs = localForage.createInstance({
    name: 'soundcloud-url-cache'
  });

  constructor() {
    debugger;

    if ('serviceWorker' in navigator) {
      this.isServiceWorkerSupported = true;
      // this.isMusicDownloaded(trackId);
    }
  }

  isMusicDownloaded(trackId: string): void {
    debugger;

    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;
    console.log(streamURL);



    this.lfCachedMusicURLs.getItem(streamURL).then(url => {
      if (url !== null) {
        // resolve(true);
        this.isDownloaded = true;
      } else {
        // resolve(false);
        this.isDownloaded = false;
      }
    }).catch(err => {
      console.log(err);
      // resolve(false);
      this.isDownloaded = false;
    });

  }


  downloadTrack(trackId: string): void {
    debugger;

    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;
    console.log(streamURL);

    this.sendMessage({
      command: 'saveMusic',
      url: streamURL

    }).then(() => {
      console.log('successfully: sent to sw');
      this.isDownloaded = true;

    }).catch(() => {
      console.log('failed: sent to sw');
      this.isDownloaded = false;

    });
  }

  deleteTrack(trackId: string): void {
    console.log('pressed deleteTrack');
  }

  sendMessage(message: any): Promise<{}> {
    debugger;
    // This wraps the message posting/response in a promise, which will resolve if the response doesn't
    // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
    // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
    // a convenient wrapper.
    return new Promise((resolve, reject) => {
      let messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event => {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data);
        }
      });

      // This sends the message data as well as transferring messageChannel.port2 to the service worker.
      // The service worker can then use the transferred port to reply via postMessage(), which
      // will in turn trigger the onmessage handler on messageChannel.port1.
      // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
      navigator.serviceWorker.controller.postMessage(message,
        [messageChannel.port2]);
    });
  }
}
