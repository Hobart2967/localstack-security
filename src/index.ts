import 'reflect-metadata';

import { App } from './app';
import { container } from './config/container';

container.get(App).main();