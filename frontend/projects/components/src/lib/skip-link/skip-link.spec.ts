import { TestBed } from '@angular/core/testing';
import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  it('links to the main landmark', async () => {
    await TestBed.configureTestingModule({ imports: [SkipLink] }).compileComponents();
    const fixture = TestBed.createComponent(SkipLink);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.skip-link');
    expect(link?.getAttribute('href')).toBe('#main');
    expect(link?.textContent?.trim()).toBe('Skip to content');
  });
});
