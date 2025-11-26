

import {wrapInCustomElement, observe, debounce} from "../NoFramework/NoFramework.js";
import { dedent, mflog } from "../utils.js"


// Comparison with SimpleList.js
//
//      -> This is overengineered for anything I'd wanna do on mac-mouse-fix-website. Just use SimpleList.js instead.
//              I'd probably also publish SimpleList() with the NoFramework (if I ever publish it)
//
// Comparison with FastList.js
//    The FastList() pros:
//      - Has great optimizations for scrolling lists (items that are not on screen are not added to the DOM.)
//    But FlexibleList() pros:
//      - Is more 'flexible' since it simply renders the HTML for each item into the DOM – instead of  manually calculating a vertical layout.
//          -> Supports flexbox, grid or even <select> – anything that HTML/CSS can do.
//      - Simpler implementation
//      - Tracks updates to this.items and updates the DOM automatically.
//
//    (It would be more

// TODO: Make this work when this.items contains multiple identical objects.
//      (items cannot be keys of the (modelItem<->DOM-child) association – See __MFListChild)
// TODO: Maybe allow items having a `key` attribute which they are identified by instead of only relying on object-equality for diffing?
// TODO: Consider if the automatic tracking/diffing of the items array is even worth the complexity. Why not have NSTableView style procedural API?
//      In most cases, just reloadItems() to reload everything is fine. (Enough for anything on the mac-mouse-fix website.)
//      If you do need granular updates while preserving item state and stuff you can have insertItem() or things like that
//          Counter:
//              The insert stuff in NSTableView *is* kind of annoying since you have to do diffing yourself if you want animations IIRC? [Nov 2025]
//              ... But this thing also won't do animations it seems, except with `document.startViewTransition()` which caused ghosting and weirdness on the whole page in my testing.
//      -> Maybe this is overengineered and should just rerender all the items when this.items is set, but without deep observation.
//
// TODO: Maybe mention in `Idea - quote-unquote-framework` that if users want to track updates to item contents and update the items in the DOM accordingly, they can use wrapInCustomElement()
//      (Exactly the same pattern as when declaring components!)

/** @typedef { HTMLElement & { items: any[], observeItems: (model: any, prop: string) => void}} FlexibleList */
export function FlexibleList(renderItem) {

    let html = ""
    html = wrapInCustomElement(html, {

        dbgname: "List",
        /** @this {FlexibleList} */connected() {

            this.items = [];

            this.observeItems = (model, prop) => { // Convenience macro for common pattern
                observe(model, prop, () => {
                    model[prop] = FlexibleList.wrapArrayInObservableProxy(model[prop]);
                    this.items = model[prop];
                }, true)
            }

            observe(this, 'items', () => {

                // FOOTGUN PROTECTION
                if (!(this.items instanceof Array))             throw error_List_notanarray(this.items);
                if (!this.items.__mfobservableProxy_Callbacks)  throw error_List_notobservable();

                // Call render
                render.bind(this)();

                // Call render when the items array is mutated.
                this.items.__mfobservableProxy_Callbacks.push(() => {
                    debounce(`List() observation (${this.dataset.instanceid})`, 0, () => { // debounce because Array.shift() triggers and observation callback for every element in the array. || TODO: Accessing instanceid here is hacky
                        //document.startViewTransition(() => { // TODO; Maybe make this configurable || This breaks interactions and creates ghosting on the whole page. [Nov 2025]
                            render.bind(this)();
                        //});
                    })
                })

            }, false);

            /** @this {FlexibleList} */
            function render() {
                for (let i = 0; i < this.items.length; i++) {
                    if (this.items[i].__MFListChild)        this.insertBefore(this.items[i].__MFListChild,            this.children[i]); // Move the existing node to i
                    else                                    this.insertBefore(_renderHTML(renderItem(this.items[i])), this.children[i]); // Insert the new node at i
                    this.items[i].__MFListChild = this.children[i];
                }
                while (this.children.length > this.items.length) this.lastChild.remove(); // Remove nodes who no longer have corresponding entries in this.items                }
            }
        },
    })
    return html;
}

FlexibleList.wrapArrayInObservableProxy = (arr) => {

    if (arr.__mfobservableProxy_Callbacks) return arr;

    let proxy = new Proxy(arr, {
        set(target, p, newValue) { // TODO: Maybe add the same doLater() and equality checking that we're doing in observe() to handle recursion edge-cases. [Nov 2025]
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