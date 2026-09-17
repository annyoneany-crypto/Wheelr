import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

/**
 * Entry point used only by `ng build` while prerendering. The browser bundle
 * still boots from `main.ts`; nothing here ships to a visitor.
 *
 * The context has to be threaded through: on the server there is no ambient
 * platform to fall back on, and bootstrapping without it fails with NG0401.
 */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, config, context);

export default bootstrap;
