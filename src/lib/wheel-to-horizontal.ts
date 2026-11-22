/**
 * Rueda del mouse → scroll horizontal en una barra de pills.
 *
 * Con el dedo (celular, tablet) y con el trackpad (deltaX) la barra ya se
 * desliza sola. Con un mouse común la rueda solo da deltaY y la barra tiene el
 * scrollbar oculto: en una PC con la ventana angosta no había forma de moverla.
 *
 * Solo intercepta cuando la barra todavía puede moverse en esa dirección; en el
 * borde deja pasar el evento y la página scrollea como siempre.
 * Devuelve la función para quitar el listener.
 */
export function wheelToHorizontal(el: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // zoom o trackpad horizontal: nativo
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // Firefox manda líneas
    const next = Math.min(max, Math.max(0, el.scrollLeft + delta));
    if (next === el.scrollLeft) return;
    e.preventDefault();
    el.scrollLeft = next;
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}
