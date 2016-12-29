import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app',
  styles: [`
    .main {
      padding-bottom: 200px;
    }
  `],
  template: `
    <app-header></app-header>

    <main class="main">
      <router-outlet></router-outlet>
    </main>

    <div id="snackbar"></div>

    <player></player>
  `
})
export class AppComponent implements OnInit {

  ngOnInit(): void {
    if ('serviceWorker' in navigator) {
      (navigator.serviceWorker as any).addEventListener('message', event => {
        this.displaySnackbar();
      });
    }
  }

  displaySnackbar(): void {
    let snackbarEl = document.getElementById('snackbar');
    snackbarEl.className = 'show';
    snackbarEl.textContent = 'Caching complete! App now works offline.';

    setTimeout(() => {
      snackbarEl.className = snackbarEl.className.replace('show', '');
    }, 3000);
  }
}
