/**
 * Deep links (?category= / ?item=) from the restaurant's site, Instagram, etc.
 *
 * The menu page is ISR, so its HTML is the same for every visitor and always
 * renders the default view (cover + "Today"). MenuShell only reads the param
 * after hydration and then moves to the section — so the visitor used to see
 * the default view, then the page jumping to the category and the pill bar
 * sliding over (three screen changes in under a second).
 *
 * This inline script runs while the HTML is parsed, before the first paint:
 * if the URL carries a deep link it hides the menu until MenuShell has landed
 * on the section (MenuShell removes the attribute). The timeout is the safety
 * net: the menu is never left hidden if the script below it fails or the
 * section does not exist.
 *
 * Reading the param here instead of on the server keeps the page cacheable.
 */
export const DEEP_LINK_ATTR = 'data-menu-deeplink';

const SCRIPT = `(function(){try{if(/[?&](category|item)=/.test(location.search)){var d=document.documentElement;d.setAttribute('${DEEP_LINK_ATTR}','');setTimeout(function(){d.removeAttribute('${DEEP_LINK_ATTR}')},3000)}}catch(e){}})();`;

export function DeepLinkGuard() {
  return (
    <>
      <style>{`html[${DEEP_LINK_ATTR}] #main-content{visibility:hidden}`}</style>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
