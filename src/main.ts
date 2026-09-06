import { bootstrapApplication } from '@angular/platform-browser';
import { DemoComponent } from './app/demo/demo.component';
console.log('[tree-debug] main | bootstrap DemoComponent');
debugger;
bootstrapApplication(DemoComponent).catch(console.error);
