import json

with open('PowerPulse_AllHouses_Colab.ipynb', encoding='utf-8') as f:
    nb = json.load(f)

for i, c in enumerate(nb['cells']):
    src = ''.join(c.get('source', []))
    ctype = c.get('cell_type', 'unknown')
    print("=" * 60)
    print("CELL %d [%s]" % (i+1, ctype))
    print("=" * 60)
    print(src[:900])
    print()

