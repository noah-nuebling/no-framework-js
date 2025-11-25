

import {wrapInCustomElement, observe, debounce} from "./mini-framework.js";
import { dedent, mflog } from "./utils.js"

// TODO: Make this work when this.items contains multiple identical objects.
// TODO: Maybe allow items having a `key` attribute which they are identified by instead of relying on object-equality ?
// TODO: Consider if the automatic tracking of the items array is even worth the complexity. Why not have NSTableView style
//      reloadItems(), insertItems() etc. APIs? (Although the insert stuff is kind of annoying since you have to do diffing yourself IIRC? [Nov 2025])
// TODO: Maybe mention that if users want to track updates to item contents and update the DOM accordingly, they can use wrapInCustomElement()
//      (Exactly the same pattern as when declaring components)

/** @typedef { HTMLElement & { items: any[] } List */
export function List(renderItem) {

    let html = ""
    html = wrapInCustomElement(html, {
        dbgname: "List",

        /** @this {List} */
        connected() {

            this.items = [];

            observe(this, 'items', () => {

                // FOOTGUN PROTECTION
                if (!(this.items instanceof Array))             throw error_List_notanarray(this.items);
                if (!this.items.__mfobservableProxy_Callbacks)  throw error_List_notobservable();

                // Call render
                render.bind(this)();

                // Call render when the items array is mutated.
                this.items.__mfobservableProxy_Callbacks.push(() => {
                    debounce(`List() observation (${this.dataset.instanceid})`, 0, () => { // debounce because Array.shift() triggers and observation callback for every element in the array. || TODO: Accessing instanceid here is hacky
                        render.bind(this)()                                 // TODO: Our tests in render-interactive-stuff.js should still work with this disabled.
                    })
                })

            }, false);

            let item2DOMNodeCache = new Map();
            let item2ElementCache = new Map();

            /** @this {List} */
            function render() {

                // Update the DOM to match this.items

                mflog(`List: RENDER`);

                if ((0)) {

                    // Simple implementation – just re-render everything

                    let newHTML = '';
                    for (let item of this.items)
                        newHTML += renderItem(item);
                    this.innerHTML = newHTML;
                }

                if ((1)) {

                    // Complex implementation – diff to find out which items in the model have been inserted / moved / removed,
                    //      and then apply those same modifications to the DOM nodes.
                    //      (Necessary to preserve the <select> selection in my testing – maybe other things) [Nov 2025]

                    // Make the DOM match this.items.
                    {
                        for (let i = 0; i < this.items.length; i++) {
                            if (item2DOMNodeCache.get(this.items[i])) {
                                if (item2DOMNodeCache.get(this.items[i]) === this.children[i]) {
                                    mflog(`List: sameee (${i}) (${this.items.map(x => x.id)})`); // The existing node is already at the right index – do nothing
                                }
                                else {
                                    this.insertBefore(item2DOMNodeCache.get(this.items[i]), this.children[i]); // Move the existing node to i
                                    mflog(`List: move (${i}) (${this.items.map(x => x.id)})`);
                                }
                            }
                            else {
                                this.insertBefore(_renderHTML(renderItem(this.items[i])), this.children[i]); // Insert the new node at i
                                mflog(`List: insert (${i}) (${this.items.map(x => x.id)})`);
                            }
                        }
                        while (this.children.length > this.items.length) {
                            this.lastChild.remove(); // Remove nodes who no longer have corresponding entries in this.items
                            mflog(`List: remove`);
                        }
                    }

                    // Update cache
                    item2DOMNodeCache = new Map();
                    for (let i = 0; i < this.children.length; i++)
                        item2DOMNodeCache.set(this.items[i], this.children[i]);
                }
            }
        },
    })

    return html;
}

List.wrapArrayInObservableProxy = (arr) => {

    if (arr.__mfobservableProxy_Callbacks) return arr;

    let proxy = new Proxy(arr, {
        set(target, p, newValue) { // TODO: Maybe add the same setTimeout() and equality checking that we're doing in observe() to handle recursion edge-cases. [Nov 2025]
            target[p] = newValue;
            if (p !== "length")  for (let cb of arr.__mfobservableProxy_Callbacks) cb();
            return true;
        },
        deleteProperty(target, p) {
            delete target[p];
            for (let cb of arr.__mfobservableProxy_Callbacks) cb();
            return true;
        }

    })

    arr.__mfobservableProxy_Callbacks = [];

    return proxy;
}

function error_List_notobservable(items) {
    return new Error(dedent( // TODO: Probably shorten this. Maybe clean up terminology. Maybe make it a warning if this frequently forces you to use List.wrapArrayInObservableProxy() when you don't actually need mutation callbacks. [Nov 2025]
        `
       
        The .items array is not observable. 
       
        Call 'List.wrapArrayInObservableProxy(itemsArray)' to make your .items array observable.
        
        Example:
            observe(model, 'modelItems', () => { 
                model.modelItems = List.wrapArrayInObservableProxy(model.modelItems);
                list.items = model.modelItems;
            });
            
            After this
                model.modelItems.push(newItem);
            Will automatically update the List() instance 'list'.
                
            You can also use 
                list.observeItems(model, 'modelItems') 
            as a shorthand.
        
        Explanation:
            This is necessary because the simple observe() function can not track insertions or deletions into an array.
            To allow the List() instance to update itself when its .items array is mutated, you need to wrap 
            it in a 'Proxy' object first. That's what List.wrapArrayInObservableProxy() does.
        
            If you do not need the List() instance to automatically update when entries are added / removed from the 
            .items array, you can ignore / disable this error.
    `))
}

function error_List_notanarray(items) {
    return new Error(dedent(`
        Trying to render List() component but the .items property is not an array. (is ${typeof items})
        
        Making this an error cause when doing 
            list.items += { label: "New Item" } 
        it just converts the whole array into a string.
        And that's kind of a footgun. 
        Use 
            list.items.push({ label: "New Item" })
        instead.
        
        (It's not hard to debug just annoying so maybe this shouldn't be an error. 
        Also javascript pros won't make that mistake.) 
        [Nov 2025]
    `))
}

// Internal helpers

function _renderHTML(htmlString) {
    let div = document.createElement('div');
    div.innerHTML = htmlString;
    console.assert(div.children.length === 1);
    return div.firstChild;
}