# Print assets

## Business card

`business-card-front.png` and `business-card-back.png` are ready to upload to VistaPrint as a
"complete design" for the standard US business card.

| Spec            | Value                                   |
| --------------- | --------------------------------------- |
| Trim size       | 3.5 × 2 in (89 × 51 mm)                 |
| Size with bleed | 3.75 × 2.25 in, 1125 × 675 px at 300 DPI |
| Bleed           | 0.125 in each edge                      |
| Safe area       | 0.125 in inside the trim                |

Front: logo lockup, name, title, website and email on paper (`#f6f7f3`). Back: the white mono
mark and the tagline on brand green (`#179c52`). Fonts are Plus Jakarta Sans and Inter from
Google Fonts, so rendering needs network access.

### Re-rendering

Edit the copy or layout in `business-card.html`, then from `e2e/` (the script lives there to use its Playwright):

```sh
node scripts/render-business-cards.mjs
```

The script screenshots each side at the bleed size and tags the PNGs at 300 DPI (on macOS via
`sips`). Upload the PNGs; export JPGs from them only if the uploader requires it.
