import * as localForage from 'localforage';
import { Observable } from 'rxjs/Observable';
import { API_TRACKS_URL, CLIENT_ID_PARAM } from 'src/constants';

export class MusicService {
  isServiceWorkerSupported: boolean;
  isDownloaded: Observable<boolean>;
  isDownloadedObserver: any;

  lfCachedMusicURLs = localForage.createInstance({
    name: 'soundcloud-url-cache'
  });

  constructor(trackId: number) {
    if ('serviceWorker' in navigator) {
      this.isServiceWorkerSupported = true;

      this.isDownloaded = new Observable((observer) => {
        this.isDownloadedObserver = observer;
        this.isMusicDownloaded(trackId);
      });
    }
  }

  isMusicDownloaded(trackId: number): void {
    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;

    this.lfCachedMusicURLs.getItem(streamURL).then(url => {
      if (url !== null) {
        if (this.isDownloadedObserver) {
          this.isDownloadedObserver.next(true);
        }
      } else {
        if (this.isDownloadedObserver) {
          this.isDownloadedObserver.next(false);
        }
      }
    }).catch(err => {
      console.log(err);
      if (this.isDownloadedObserver) {
        this.isDownloadedObserver.next(false);
      }
    });
  }

  downloadTrack(trackId: number): void {
    debugger;

    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;

    if (this.isDownloadedObserver) {
      this.isDownloadedObserver.next(true);
    }
    this.sendMessage({
      command: 'saveMusic',
      url: streamURL

    }).then(() => {
      console.log('successfully: sent to sw');

    }).catch(() => {
      console.log('failed: sent to sw');
      if (this.isDownloadedObserver) {
        this.isDownloadedObserver.next(false);
      }

    });
  }

  deleteTrack(trackId: number): void {
    debugger;

    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;

    if (this.isDownloadedObserver) {
      this.isDownloadedObserver.next(false);
    }
    this.sendMessage({
      command: 'deleteMusic',
      url: streamURL

    }).then(() => {
      console.log('successfully: delete sent to sw');

    }).catch(() => {
      console.log('failed: delete sent to sw');
      if (this.isDownloadedObserver) {
        this.isDownloadedObserver.next(true);
      }

    });
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
