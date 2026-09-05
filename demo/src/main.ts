import 'zone.js';
import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { OrganisationPickerComponent } from '@organisation-tree/angular';
import { OrganisationController } from '@organisation-tree/organisation';
import { MockSource } from './mock-source';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [OrganisationPickerComponent],
  template: `<main>
    <header>
      <div class="eyebrow">ORGANISATION TREE / LIBRARY DEMO</div>
      <h1>The right people.<br /><span>One project.</span></h1>
      <p>Browse your organisation or find a person. Membership changes are saved as you go.</p>
    </header>
    <div class="layout">
      <div>
        <div class="panel-heading">
          <h2>Project members</h2>
          <span class="badge">Named list</span>
        </div>
        <ot-organisation-picker [controller]="controller"></ot-organisation-picker>
      </div>
      <aside>
        <h2>Try the interactions</h2>
        <p>
          Expand a chain to see its branches. Select a branch to add its people, or expand it to
          choose individuals.
        </p>
        <div class="legend">
          <b>−</b><span>Some people are members</span><b>✓</b><span>Everyone is a member</span>
        </div>
        <hr />
        <h3>Mock backend</h3>
        <label
          >Response latency <strong>{{ source.latency }} ms</strong
          ><input
            aria-label="Response latency"
            type="range"
            min="0"
            max="500"
            step="50"
            [value]="source.latency"
            (input)="latency($event)" /></label
        ><label class="check"
          ><input type="checkbox" (change)="reorder($event)" /> Return responses out of order</label
        >
        <div class="buttons">
          <button (click)="source.failNext = true">Fail next request</button
          ><button (click)="source.timeoutNext = true">Timeout next request</button
          ><button (click)="largeDataset()">Load 600 people</button>
        </div>
        <p class="hint">
          The demo timeout is 2 seconds. A timed-out write may still reach the backend; use Refresh
          to confirm.
        </p>
        <hr />
        <h3>Keyboard</h3>
        <p class="hint">
          Tab enters the tree. ↑ ↓ move between rows. ← → collapse or expand. Space changes
          membership. Home / End jump to the first or last row.
        </p>
        <div class="footer">TypeScript core · Angular UI<br />No application services required</div>
      </aside>
    </div>
  </main>`,
})
export class DemoApp {
  source = new MockSource();
  controller = new OrganisationController(this.source, 'demo-project', {
    timeoutMs: 2000,
    maxResults: 500,
  });
  latency(event: Event): void {
    this.source.latency = Number((event.target as HTMLInputElement).value);
  }
  reorder(event: Event): void {
    this.source.reverseResponses = (event.target as HTMLInputElement).checked;
  }
  largeDataset(): void {
    this.controller.dispose();
    this.source = new MockSource(50);
    this.controller = new OrganisationController(this.source, 'demo-project', {
      timeoutMs: 2000,
      maxResults: 500,
    });
  }
}
bootstrapApplication(DemoApp).catch(console.error);
