import { dedent, mflog } from '../utils.js'
import { observe, wrapInCustomElement, qs } from "../NoFramework/NoFramework.js"

/**
    - Performance test result for FastList(): [Nov 2025]
        - Runs buttery smooth even with 1'000'000 complex items on my M1 MBA in Google Chrome.
        - There are two optimizations:
            1. For large number of items (50+)
                -> 'not' rendering items that are off-screen. (Actually, we are rendering items within 1000px of the viewport-edges)
            2. For costly-to-paint items (background blurs, shadows, etc)
                -> Keeping visible items in the DOM between frames
                -> This is only noticable for extreme cases on my M1 MBA in Chrome. And I could only get it to be noticable when rows had expensive CSS effects, not just from their HTML being complex.
                    The effect I observed is that rows load in a bit faster, instead of loading their content in a split second after appearing on-screen when scrolling fast.
                        There were no frame-drops either way.
                    Just re-rendering all visible items from scratch on each scroll-event is more than fast enough for almost all cases.
                        But with this optimization it's fast enough *no matter what you throw at it*.
                            You can have 1'000'000 super expensive-to-draw items, and it's rock solid 60 fps on my M1 MBA.
                    -> I think the HTML rendering is not the bottleneck but that this optimization helps the browser cache the painting better or something. (But not sure.)
        - We're not doing full element-recycling like NSTableView, I don't think that's a bottleneck here.
*/

export const FastList = ({
    estimateHeight,                 // Returns the estimated height for a given item which has not been rendered, yet. To the website-visitor, the only noticable thing this does is to determine the size and position of the scroll-bar when initially loading the page. (When the page is scrolled and more items are rendered, the estimated heights will be replaced with the real measured heights, and the scrollbar will update)
    preloadSize = 1000,    // How much beyond the viewport bounds items are rendered. Can help UX by making sure images are already loaded once elements are scrolled onto the screen.
    render                          // Returns the HTML string for a given item.
}) => {

    mflog(`List called`);

    let html = `
        <div class="FastList_listContainer">
          <style> @scope {
              :scope {
                  height: 100vh; /*TODO: Breaks without this – this should be controllable by the user instead. */
                  overflow: auto;
                  position: relative;
              }
              .listContent {
                  display: block flow;
              }
          }</style>
        <div class="FastList_listContent"></div>
      </div>
    `

    html = wrapInCustomElement(html, {
        init() {

            this.items = []; // Set .items to have the FastList() render them.

            let listContent     = qs(this, ".FastList_listContent");
            let listContainer   = qs(this, ".FastList_listContainer");
            let itemContainer   = listContent;

            let itemHeightCache = {} // TODO: Scroll pos is not preserved after a page reload because we loose the itemHeightCache. [Nov 2025]
            let visibleElementTracker = {}; // 'visible' items aren't necessarily visible if the preloadSize > 0. It just means they're rendered HTML strings are attached to the DOM.

            let renderItems;

            requestAnimationFrame(() => { // this is just so we can define this stuff before the long renderItems function.

                let _reloadItems = () => {
                    itemContainer.innerHTML = '';
                    itemHeightCache = {};
                    visibleElementTracker = {};
                    renderItems();
                }

                observe(this, 'items', () => {
                    _reloadItems();
                }, true)

                let listWidth = -1;
                let resizeObserver = new ResizeObserver((entries) => {

                    let newListWidth = listContent.offsetWidth;
                    mflog(`listWidth/newListWidth: ${[listWidth, newListWidth]}`)
                    if (listWidth !== -1 && listWidth !== newListWidth) {
                        _reloadItems(); // TODO: Maybe we could only reset `itemHeightCache` for optimization [Nov 2025]
                    }
                    listWidth = newListWidth;

                })
                resizeObserver.observe(listContent);

                listContainer.addEventListener('scroll', () => {
                    renderItems();
                }, { passive: true });
            });

            renderItems = () => {

                let accumulatedHeight = 0;
                let i = 0

                // Find first visible item
                {
                    // Take property-accesses out of the hot loop
                    //  Very noticeable optimization at 1'000'000 items on Chrome [Nov 2025]
                    let _listContainer_scrollTop = listContainer.scrollTop;
                    let _this_items_length       = this.items.length;
                    let _this_items                       = this.items;
                    for (; i < _this_items_length; i++) {
                        if (itemHeightCache[i] === undefined) itemHeightCache[i] = estimateHeight(_this_items[i]); /// Weird/bad: We break; *after* this so that the heightShift code below can access the estimateHeight() through the itemHeightCache[i]. I don't remember why we did that. [Nov 2025]
                        let itemHeight = itemHeightCache[i];
                        if (accumulatedHeight + itemHeight >= (_listContainer_scrollTop - preloadSize)) { break; }
                        accumulatedHeight += itemHeight;
                    }

                    /// DEBUG
                    if ((0)) {
                        mflog(dedent(`visibleElementCache: (removal) (firstVisible: ${i})
                        ${Object.keys(visibleElementTracker).join(' ')}
                         
                    `))
                    }
                }

                // Render visible items.
                let firstVisibleI = i;
                for (; i < this.items.length; i++) {

                    let renderedItemAlreadyVisible = visibleElementTracker[i] !== undefined;

                    let renderedItem;
                    if (renderedItemAlreadyVisible) {
                        renderedItem = visibleElementTracker[i];
                    }
                    else {
                        // Render the item fresh from the HTML string returned by render()
                        {
                            let wrapper = document.createElement('div');
                            wrapper.innerHTML = render(this.items[i]);
                            let renderedItemRoots = wrapper.children;
                            console.assert(renderedItemRoots.length === 1);
                            renderedItem = renderedItemRoots[0];
                        }

                        itemContainer.appendChild(renderedItem);
                        visibleElementTracker[i] = renderedItem;
                    }

                    // Position the renderedItem vertically
                    renderedItem.style.position = 'absolute';
                    renderedItem.style.left = '0';
                    renderedItem.style.top = `${accumulatedHeight}px`;

                    /// Handle height of the renderedItem
                    if (renderedItemAlreadyVisible) {
                        accumulatedHeight += itemHeightCache[i];
                    }
                    else {

                        /// Adjust scroll position to compensate for growing/shrinking item shifting the items below it down/up.
                        let heightShift = renderedItem.offsetHeight - itemHeightCache[i];
                        if (heightShift) {
                            let itemWasScrolledInFromTop = listContainer.scrollTop > renderedItem.offsetTop;
                            if (itemWasScrolledInFromTop)
                                listContainer.scrollTop += heightShift;
                        }

                        accumulatedHeight += renderedItem.offsetHeight;
                        itemHeightCache[i] = renderedItem.offsetHeight;
                    }

                    /// Stop when we find the first not-visible item.
                    if (
                        accumulatedHeight >
                        (listContainer.scrollTop + listContainer.offsetHeight + preloadSize)
                    ) {
                        i++;
                        break;
                    }
                }
                /// Remove no-longer-visible elements from the DOM.
                for (let j of Object.keys(visibleElementTracker)) {
                    let isVisible = firstVisibleI <= Number(j) && Number(j) < i;
                    if (!isVisible) {
                        itemContainer.removeChild(visibleElementTracker[j]);
                        delete visibleElementTracker[j];
                    }
                }
                /// DEBUG
                if (1)
                {
                    mflog(dedent(`
                        Rendered elements: ${firstVisibleI}..${i} (count: ${i-firstVisibleI})
                            DOM children: ${itemContainer.children.length}
                            visibleElementCache: ${Object.keys(visibleElementTracker).length}
                            Conditions: ${accumulatedHeight} > (${listContainer.scrollTop} + ${listContainer.offsetHeight})
                    `));
                }

                // Estimate height of remaining items
                {
                    let _this_items_length = this.items.length;
                    let _this_items = this.items;
                    for (; i < _this_items_length; i++) {
                        if (itemHeightCache[i] === undefined) itemHeightCache[i] = estimateHeight(_this_items[i]);
                        accumulatedHeight += itemHeightCache[i];
                    }
                }

                // Set the height of the scroll-area.
                listContent.style.height = `${accumulatedHeight}px`;
            }

        }
    })

    return html;
}