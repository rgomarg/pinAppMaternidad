import { buildMessageTree } from './message-tree';

describe('buildMessageTree', () => {
  it('anida las respuestas bajo su mensaje padre', () => {
    const tree = buildMessageTree([
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: null },
    ]);

    expect(tree.map((m) => m.id)).toEqual([1, 4]);
    expect(tree[0].replies.map((m) => m.id)).toEqual([2]);
    expect(tree[0].replies[0].replies.map((m) => m.id)).toEqual([3]);
  });

  it('sube al primer nivel las respuestas cuyo padre no está en la lista', () => {
    const tree = buildMessageTree([{ id: 5, parentId: 99 }]);
    expect(tree.map((m) => m.id)).toEqual([5]);
  });

  it('mantiene el orden de entrada entre hermanos', () => {
    const tree = buildMessageTree([
      { id: 1, parentId: null },
      { id: 3, parentId: 1 },
      { id: 2, parentId: 1 },
    ]);
    expect(tree[0].replies.map((m) => m.id)).toEqual([3, 2]);
  });
});
