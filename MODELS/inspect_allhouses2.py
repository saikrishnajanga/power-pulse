import json

with open('PowerPulse_AllHouses_Colab.ipynb', encoding='utf-8') as f:
    nb = json.load(f)

# Print full content of key cells (8, 10, 14, 16, 18)
for idx in [7, 9, 13, 15, 17]:
    c = nb['cells'][idx]
    src = ''.join(c.get('source', []))
    print("=" * 60)
    print("CELL %d [%s]" % (idx+1, c.get('cell_type')))
    print("=" * 60)
    print(src)
    print()

