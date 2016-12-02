import * as localForage from 'localforage';
import { Observable } from 'rxjs/Observable';
import { API_TRACKS_URL, CLIENT_ID_PARAM } from 'src/constants';

export enum CommandSW {
  Download,
  Delete
}

export class MusicHandler {
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
        this.initializeMusicState(trackId);
      });
    }
  }

  initializeMusicState(trackId: number): void {
    this.checkIfUrlIsCached(trackId);
  }

  toggleMusic(trackId: number): void {
    this.checkIfUrlIsCached(trackId).then((data) => {
      if (data) {
        this.deleteTrack(trackId);
      } else {
        this.downloadTrack(trackId);
      }
    });
  }

  checkIfUrlIsCached(trackId: number): Promise<boolean> {
    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;

    return new Promise((resolve) => {

      this.lfCachedMusicURLs.getItem(streamURL).then(url => {

        if (url !== null) {
          this.setIsDownloadedObserverToTrue();
          resolve(true);
        } else {
          this.setIsDownloadedObserverToFalse();
          resolve(false);
        }

      }).catch(err => {
        console.log(err);
        this.setIsDownloadedObserverToFalse();
        resolve(false);

      });
    });
  }

  downloadTrack(trackId: number): void {
    this.setIsDownloadedObserverToTrue();

    this.buildMessage(trackId, CommandSW.Download).then((replyMessage: any) => {
      if (replyMessage.message === 'failed') {
        this.setIsDownloadedObserverToFalse();
      }

    }).catch(err => {
      console.log(err + ': failed sending to sw');
      this.setIsDownloadedObserverToFalse();

    });
  }

  deleteTrack(trackId: number): void {
    this.setIsDownloadedObserverToFalse();

    this.buildMessage(trackId, CommandSW.Delete).then((replyMessage: any) => {
      if (replyMessage.message === 'failed') {
        this.setIsDownloadedObserverToTrue();
      }

    }).catch(err => {
      console.log(err + ': failed sending to sw');
      this.setIsDownloadedObserverToTrue();

    });
  }

  buildMessage(trackId: number, command: CommandSW): Promise<{}> {
    let streamURL = API_TRACKS_URL + '/' + String(trackId) + '/stream?' + CLIENT_ID_PARAM;

    let stringCommand = '';

    if (command === CommandSW.Delete) {
      stringCommand = 'deleteMusic';
    } else {
      stringCommand = 'downloadMusic';
    }

    return this.sendMessage({
      command: stringCommand,
      url: streamURL
    });
  }

  sendMessage(message: any): Promise<{}> {
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

  private setIsDownloadedObserverToFalse(): void {
    if (this.isDownloadedObserver) {
      this.isDownloadedObserver.next(false);
    }
  }

  private setIsDownloadedObserverToTrue(): void {
    if (this.isDownloadedObserver) {
      this.isDownloadedObserver.next(true);
    }
  }
}
