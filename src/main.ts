import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (window.location.hostname === 'localhost') {
	const canonicalUrl = new URL(window.location.href);
	canonicalUrl.hostname = '127.0.0.1';
	window.location.replace(canonicalUrl.href);
} else {
	bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
