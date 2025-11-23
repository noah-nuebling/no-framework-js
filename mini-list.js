import { dedent } from './utils.js'
import { observe, wrapInCustomElement, listen, debounce, qs } from "./mini-framework.js"

/**
    Performance test result for FastList(): [Nov 2025]
        - Runs buttery smooth even with 1'000'000 complex items on my M1 MBA in Google Chrome.
        - The only complex optimization is 'not' rendering items that are off-screen. (Actually, we are rendering items within 1000px of the viewport-edges)
        - We're not doing element-reuse like NSTableView. We're re-rendering the on-screen elements from HTML on every scroll-event – doesn't seem to be a bottleneck even with complex items.
*/

export const FastList = ({
    estimateHeight,                 // Returns the estimated height for a given item which has not been rendered, yet. To the website-visitor, the only effect is that this determines the size and position of the scroll-bar before the items are rendered (and the estimated height is replaced with the measured height).
    preloadSize = 1000,             // How much beyond the viewport bounds items are rendered. Can help UX by making sure images are already loaded once elements are scrolled onto the screen.
    render                          // Returns the HTML string for a given item.
}) => {

    console.log(`List called`);

    let html = ``

    html = wrapInCustomElement(html, {
        connected() {

            this.items = []; // Set .items to have the FastList() render them.

            let listContent = this.parentElement.parentElement;
            let listContainer = listContent.parentElement;
            let itemContainer = this;

            let itemHeightCache = {} // Small problem: Scroll pos is not preserved after a page reload because we loose the itemHeightCache. [Nov 2025]

            let renderItems = () => {

                //if (itemContainer.innerHTML !== "") return;
                itemContainer.innerHTML = "";

                let accumulatedHeight = 0;
                let i = 0

                // Find first visible item
                if (1) {
                    // Take property-accesses out of the hot loop
                    //  Very noticeable optimization at 1'000'000 items on Chrome [Nov 2025]
                    let _listContainer_scrollTop = listContainer.scrollTop;
                    let _this_items_length       = this.items.length;
                    let _this_items                       = this.items;
                    for (; i < _this_items_length; i++) {
                        if (itemHeightCache[i] === undefined) itemHeightCache[i] = estimateHeight(_this_items[i]);
                        let itemHeight = itemHeightCache[i];
                        if (accumulatedHeight + itemHeight >= (_listContainer_scrollTop - preloadSize)) { break; }
                        accumulatedHeight += itemHeight;
                    }
                }

                // Render visible items.
                let firstVisibleI = i;
                for (; i < this.items.length; i++) {

                    function htmlElementFromString(s) {
                        let wrapper = document.createElement('div');
                        wrapper.innerHTML = s;
                        let renderedItemRoots = wrapper.children;
                        console.assert(renderedItemRoots.length === 1);
                        return renderedItemRoots[0];
                    }

                    let renderedItem = htmlElementFromString(render(this.items[i]));


                    renderedItem.style.position = 'absolute';
                    renderedItem.style.left = '0';
                    renderedItem.style.top = `${accumulatedHeight}px`;

                    itemContainer.appendChild(renderedItem);

                    accumulatedHeight += renderedItem.offsetHeight;
                    let heightShift = renderedItem.offsetHeight - itemHeightCache[i]
                    itemHeightCache[i] = renderedItem.offsetHeight;

                    if (heightShift) {

                        console.log(`shiftstuff: ${[heightShift, listContainer.scrollTop, renderedItem.offsetTop]}`)
                        let itemWasScrolledInFromTop = listContainer.scrollTop > renderedItem.offsetTop;
                        if (itemWasScrolledInFromTop) {
                            listContainer.scrollTop += heightShift;
                        }
                    }
                    //console.log(`shiftstuff end`)
                    //console.log(`Rendered item: (${renderedItem.offsetTop} | ${renderedItem.offsetHeight})`)

                    if (1) {
                        if (accumulatedHeight > (listContainer.scrollTop + listContainer.offsetHeight + preloadSize))
                            break;
                    }
                }

                if ((1)) {
                    console.log(dedent(`x
                    Rendered elements: ${firstVisibleI}..${i}
                        Conditions: ${accumulatedHeight} > (${listContainer.scrollTop} + ${listContainer.offsetHeight})
                `));
                }

                if (1) {
                    // Estimate height of remaining items

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

            observe(this, 'items', () => {
                renderItems();
            })

            listen(listContainer, 'scroll', () => {
                renderItems();
            });
        }
    })

    return html;
}