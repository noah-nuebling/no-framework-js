
// Simplest possible component for rendering dynamically-sized things (that is, when the view-model is an array)
//  Good enough for anything I did on the mac-mouse-fix-website I think.
//  Limits:
//      - If you need a scrolling list with many dozens or hundreds of items this might be too slow, and you should look into optimizations
//          (Exploration of that in FastList.js)
//          [Nov 2025]
//      - If you want the rendered list items to preserve transient state (like textfield focus) when inserting / removing / reordering items, you'd need more fine-grained mutation logic  (this implementation simply re-renders all the items)
//          (Implementation of one solution – automatic diffing – in FlexibleList.js)
//          [Nov 2025]
//      - If you want the DOM to update automatically when you insert / remove / reorder items in this.items, you'd need a more powerful observation mechanism.
//          (Implementation of one solution – using Proxy() – in FlexibleList.js)
//          [Nov 2025]
// 

import {wrapInCustomElement, observe} from "../NoFramework.js";

export function SimpleList(renderItem) {
    
    let html = '';
    
    html = wrapInCustomElement(html, {
        dbgname: "SimpleList",
        init() {
            this.items = [];
            observe(this, "items", () => {
                let newHTML = '';
                for (let item of this.items) newHTML += renderItem(item);
                this.innerHTML = newHTML;
            }, false);
        }
    })
    
    return html;

}