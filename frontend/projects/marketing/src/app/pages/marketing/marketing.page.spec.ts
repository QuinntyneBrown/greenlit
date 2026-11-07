import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MarketingPage } from './marketing.page';

describe('MarketingPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the hero heading', async () => {
    const fixture = TestBed.createComponent(MarketingPage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Every day off, greenlit.');
  });
});
