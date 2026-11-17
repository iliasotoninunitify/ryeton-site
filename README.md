# ryeton.com

Static site, no build step. Everything served lives in `site/`.

- `site/index.html` is for owners of management firms, `site/investors.html` for investors.
- Fonts are latin subsets with `font-display: optional` and a preload in each page head.
- Design rules: hallmark (github.com/Nutlope/hallmark); lint with `node sloplint.mjs site`.
- Pages carry `noindex` and `robots.txt` disallows everything until launch. Remove both at go-live.
