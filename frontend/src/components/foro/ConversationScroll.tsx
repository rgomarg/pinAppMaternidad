import React, { useRef } from 'react';
import { ScrollView, type ScrollViewInstance } from 'react-native';

// Scroll horizontal de una conversación (mensaje de primer nivel + sus respuestas).
// Si la sangría de las respuestas la saca de la pantalla, la barra de scroll destella
// una vez para indicar que hay contenido oculto a la derecha.
export default function ConversationScroll({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);
  const flashed = useRef(false);

  // Se llama al medir el contenedor y al cambiar el contenido: solo destella
  // la primera vez que el contenido es más ancho que lo visible
  const flashIfOverflowing = () => {
    if (flashed.current || viewportWidth.current === 0) return;
    if (contentWidth.current > viewportWidth.current + 1) {
      flashed.current = true;
      scrollRef.current?.flashScrollIndicators();
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      onLayout={(e) => {
        viewportWidth.current = e.nativeEvent.layout.width;
        flashIfOverflowing();
      }}
      onContentSizeChange={(width) => {
        contentWidth.current = width;
        flashIfOverflowing();
      }}
    >
      {children}
    </ScrollView>
  );
}
