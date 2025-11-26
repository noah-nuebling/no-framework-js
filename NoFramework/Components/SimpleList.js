
// Simplest possible component for rendering dynamically-sized things (that is, when the data-model is an array)
//  Good enough for anything we did on the mac-mouse-fix-website I think.

import {wrapInCustomElement, observe} from "../NoFramework.js";

export function SimpleList(renderItem) {
    
    let html = '';
    
    html = wrapInCustomElement(html, {
        dbgname: "SimpleList",
        /** @this {HTMLElement} */ connected() {
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