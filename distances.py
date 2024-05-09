import json
import numpy as np
import os.path

INPUT_JSON = 'table.json'
OUTPUT_DISTANCES = 'result.npz'

with open(INPUT_JSON, 'r') as fid:
    data = json.load(fid)

print(f"{len(data)=}")
if os.path.isfile(OUTPUT_DISTANCES):
    scores = np.load(OUTPUT_DISTANCES)['scores']
else:
    from sentence_transformers import SentenceTransformer, util  # type: ignore
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode([p['glossStr'] for p in data],
                              convert_to_tensor=True,
                              batch_size=64)

    scores = util.cos_sim(embeddings, embeddings).cpu()

    np.savez(OUTPUT_DISTANCES, scores=scores)
print("loaded")


def describe(idx_of_interest):
    ranked_indexes = np.argsort(scores[:, idx_of_interest])
    closest_indexes = ranked_indexes[-10:][::-1]
    print("\n\n## Closest")
    print("\n".join([
        f"{scores[i,idx_of_interest]:0.2f} => {data[i]['card']['kanji']} {data[i]['glossStr']}"
        for i in closest_indexes
    ]))
    farthest_indexes = ranked_indexes[:3]
    print
    print("\n".join([
        f"{scores[i,idx_of_interest]:0.2f} => {data[i]['card']['kanji']} {data[i]['glossStr']}"
        for i in farthest_indexes
    ]))


describe(34)  # woman
describe(340)  # what month?
describe(3400)  # obi

for idx, item in enumerate(data):
    jmdict = item['glossObj']['id'] if 'id' in item['glossObj'] else None
    if jmdict is None:
        # simple: ignore the highest score (it'll be 1.0, the item itself)
        closest = np.argsort(scores[:, idx])[-5:-1][::-1]
    else:
        # ignore entries with the same JMDict word id
        scores_for_different = [
            score if other['glossObj'].get('id', "") != jmdict else -100
            for score, other in zip(scores[:, idx], data)
        ]
        closest = np.argsort(scores_for_different)[-4:][::-1]
    item['closest'] = [
        dict(kanji=data[i]["card"]["kanji"],
             distance=round(float(scores[i, idx]), 3)) for i in closest
    ]

with open(INPUT_JSON, 'w') as fid:
    json.dump(data, fid, indent=1, ensure_ascii=False)
