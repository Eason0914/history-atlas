"""Regenerate both buildless editions after editing the shared index.html."""
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
template=(ROOT/'index.html').read_text(encoding='utf-8')
for theme,title in [('classic','World History Atlas · Classic'),('glass','World History Atlas · Liquid Glass')]:
    html=template.replace('data-default-theme="classic" data-theme="classic"',f'data-default-theme="{theme}" data-theme="{theme}"')
    html=html.replace('<title>World History Atlas · APWH Study Map</title>',f'<title>{title}</title>')
    (ROOT/f'{theme}.html').write_text(html,encoding='utf-8')
print('Classic and Liquid Glass editions generated from index.html.')
