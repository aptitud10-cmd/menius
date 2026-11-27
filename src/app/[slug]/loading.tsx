/**
 * Shown while the menu streams in. It mirrors the real layout at each width
 * (measured on /buccaneer at 390, 820 and 1280) so nothing jumps when the
 * menu arrives. Before, desktop got the phone skeleton stretched full width
 * and then snapped to three columns; the phone header/cover heights were off
 * too (h-14 + h-44 against the real overlaid header and h-48 cover).
 */
export default function MenuLoading() {
  return (
    <div className="min-h-dvh bg-[#f5f5f3] overflow-hidden" aria-busy="true">
      {/* Desktop header: name · search · status (phone overlays it on the cover). */}
      <div className="hidden lg:flex h-12 bg-white border-b border-gray-100 items-center gap-6 px-6">
        <div className="skeleton h-4 w-36 rounded-md" />
        <div className="skeleton h-9 flex-1 max-w-md mx-auto rounded-lg" />
        <div className="skeleton h-8 w-28 rounded-full" />
      </div>

      {/* Cover: same heights as MenuShell's banner. */}
      <div className="skeleton relative w-full h-48 sm:h-56 lg:h-56 lg:[@media(max-height:820px)]:h-44">
        <div className="lg:hidden absolute top-1 right-3 w-11 h-11 rounded-full bg-black/10" />
        <div className="absolute left-4 lg:left-8 bottom-4 lg:bottom-5 h-10 w-56 lg:w-72 rounded-lg bg-black/10" />
      </div>

      {/* Phone/tablet: info row + category pills. */}
      <div className="lg:hidden h-11 bg-white border-b border-gray-100 px-4 flex items-center gap-2">
        <div className="skeleton h-3.5 w-52 rounded-sm" />
        <div className="skeleton h-3.5 w-10 rounded-sm ml-auto" />
      </div>
      <div className="lg:hidden h-14 px-4 flex items-center gap-2 overflow-hidden">
        <div className="skeleton w-6 h-5 rounded-sm shrink-0 mr-2" />
        {[120, 96, 88, 72, 110].map((w, i) => (
          <div key={i} className="skeleton h-11 rounded-xl shrink-0" style={{ width: w }} />
        ))}
      </div>

      <div className="lg:flex max-w-[1440px] mx-auto">
        {/* Desktop: category sidebar. */}
        <div className="hidden lg:block w-[224px] xl:w-[232px] shrink-0 border-r border-gray-100 px-3 pt-5 space-y-2">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex items-center justify-between h-10 px-3">
              <div className="skeleton h-3.5 rounded-sm" style={{ width: 70 + ((i * 37) % 60) }} />
              <div className="skeleton h-3 w-5 rounded-sm" />
            </div>
          ))}
        </div>

        {/* Dishes: 2 columns on phones, 3 from md (as the real grid). */}
        <div className="flex-1 min-w-0 px-4 lg:px-8 pt-5 lg:pt-9">
          <div className="skeleton h-6 w-36 rounded-lg mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="skeleton w-full aspect-square lg:aspect-video" />
                <div className="p-3 lg:p-4 space-y-2">
                  <div className="skeleton h-4 w-4/5 rounded-sm" />
                  <div className="skeleton h-3 w-full rounded-sm" />
                  <div className="skeleton h-3 w-2/3 rounded-sm" />
                  <div className="flex items-center justify-between pt-2">
                    <div className="skeleton h-5 w-16 rounded-sm" />
                    <div className="skeleton w-10 h-10 lg:w-20 lg:h-9 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop xl: the cart column. */}
        <div className="hidden xl:block w-[340px] shrink-0 border-l border-gray-100 px-4 pt-6 space-y-4">
          <div className="skeleton h-5 w-28 rounded-md" />
          <div className="skeleton h-11 w-full rounded-full" />
          <div className="skeleton h-3.5 w-40 rounded-sm" />
          <div className="skeleton h-3.5 w-56 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
