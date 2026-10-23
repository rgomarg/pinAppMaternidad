// Convierte la lista plana de mensajes de un hilo en un árbol de respuestas.
// Si el padre de un mensaje no está en la lista (p. ej. oculto por moderación),
// el mensaje se muestra en el primer nivel para no perder la respuesta.

type FlatMessage = { id: number; parentId: number | null };

export type MessageNode<T extends FlatMessage> = T & { replies: MessageNode<T>[] };

export function buildMessageTree<T extends FlatMessage>(messages: T[]): MessageNode<T>[] {
  const nodes = new Map<number, MessageNode<T>>();
  for (const message of messages) {
    nodes.set(message.id, { ...message, replies: [] });
  }

  const roots: MessageNode<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId !== null ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
