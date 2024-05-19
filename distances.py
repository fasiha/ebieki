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

    scores = np.array(util.cos_sim(embeddings, embeddings).cpu())

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


def hasJmdict(item):
    return 'id' in item['glossObj']


def getJmdict(item):
    return item['glossObj']['id']


for idx, item in enumerate(data):
    closest = np.argsort(scores[:, idx])[::-1]
    topClose = []

    seenGlosses: set[str] = set([item['glossStr']])
    seenIds: set[str] = set([getJmdict(item)] if hasJmdict(item) else [])
    for thisIdx in closest:
        thisItem = data[thisIdx]

        seen = ((hasJmdict(thisItem) and getJmdict(thisItem) in seenIds)
                or thisItem['glossStr'] in seenGlosses)

        seenGlosses.add(thisItem['glossStr'])
        if hasJmdict(thisItem):
            seenIds.add(getJmdict(thisItem))

        if seen:
            continue

        topClose.append(
            dict(kanji=data[thisIdx]["card"]["kanji"],
                 distance=round(float(scores[thisIdx, idx]), 3)))

        if len(topClose) == 5: break
    item['closest'] = topClose

with open(INPUT_JSON, 'w') as fid:
    json.dump(data, fid, indent=1, ensure_ascii=False)
