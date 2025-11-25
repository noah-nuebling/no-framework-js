// Implementation of the `Idea - quote-unquote-framework` (See our notes repo, [Nov 2025])

// MARK: Sugar for finding elements in the DOM

    export const qs = (...args) => {
        if (args.length >= 2) return args[0].querySelector(args[1]);
        else                 return document.querySelector(args[0]);
    };

     /* outlet() is meant for components since you can't define ids/classes on the <mf-component> root node directly from the outside.
        Usage:
            - Give the component an identifier in your declarative UI:
                let html = `...<htmlstuff>${ MyComponent().outlet('my-component-id') }</htmlstuff>...`
            - After the component has been rendered in the DOM, get a reference, so you can observe its properties etc.
                let myComponent = getOutlet('my-component-id')
            [Nov 2025]
        TODO:
            -> Maybe move this into the `Idea - quote-unquote-framework` doc.
    */
    String.prototype.outlet = function (id) {
        return `<div class="outlet ${id}" style="display: contents">${this}</div>` /// LLM told me to use `style="display: contents"`. Possibly paranoia/overengineering.
    }

    export const getOutlet = (...args) => {
        if (args.length >= 2) return qs(args[0], `.outlet.${args[1]} > *`);
        else                  return qs(document, `.outlet.${args[0]} > *`);
    }

// MARK: wrapInCustomElement – component primitive

    const connectedCallbacksProvidedByUser = {};
    let instanceCounter = 0;

    export function wrapInCustomElement(innerHtml, { connected, dbgname }) {

        const instanceid = `${instanceCounter++}`;

        connectedCallbacksProvidedByUser[instanceid] = connected; // TODO: Rename to init() or reconsider the __mfIsInitialized stuff.

        if (!window.customElements.get('mf-component')) {

            let pendingConnectedCallbacks = [];

            window.customElements.define('mf-component', class extends HTMLElement {
                connectedCallback() {

                    if (this.__mfIsInitialized) return;
                    pendingConnectedCallbacks.push(this); // Call connectedCallback() in reverse order per each runLoop iteration, so that child-components are initialized before their parents. () [Nov 2025]

                    debounce("connectedCallback", 0, () => {
                        for (let this_ of pendingConnectedCallbacks.toReversed()) {

                            if (!connectedCallbacksProvidedByUser[this_.dataset.instanceid]) throw error_wrapInCustomElement_footgun1(this_);  // FOOTGUN PROTECTION
                            connectedCallbacksProvidedByUser[this_.dataset.instanceid].call(this_);
                            delete connectedCallbacksProvidedByUser[this_.dataset.instanceid];

                            // Mark object as initialized so we don't try to call the connectedCallbacksProvidedByUser again
                            //      when the object is removed and re-added to the DOM. (Not sure if good or necessary. LLM told me. [Nov 2025])
                            this_.__mfIsInitialized = true;
                        }
                        pendingConnectedCallbacks = [];
                    });
                }
            });
        }

        return `<mf-component data-dbgname="${dbgname}" data-instanceid="${instanceid}" style="display: contents">${innerHtml}</mf-component>`;
    }


// MARK: 'Reactive' primitives for UI <-> model syncing

    export const listen = function (obj, eventname, callback, triggerImmediately) { 
        obj.addEventListener(eventname, () => callback())
        if (triggerImmediately) callback();
    }

    export const observe = function (obj, prop, callback, triggerImmediately) {

        if (!obj[`__mf-observers_${prop}__`]) { // First time observing this property
            obj[`__mf-observers_${prop}__`] = [];

            // FOOTGUN PROTECTION
            {
                //  Catch footgun of trying to observe a computed property, like `HTMLSelectElement.value`
                {
                    // Look up the propertyDescriptor of obj.prop
                    let desc;
                    for (let o = obj; o; o = Object.getPrototypeOf(o)) {
                        if (Object.getOwnPropertyDescriptor(o, prop)) {
                            desc = Object.getOwnPropertyDescriptor(o, prop);
                            break;
                        }
                    }

                    // Check if there's already a getter/setter for obj.prop
                    if (desc && (desc.get || desc.set)) // Not sure if this should be an Error or a Warning. I think we might be breaking things by overriding existing setters without calling the original setter from the override??
                        throw new error_observe_footgun1();

                }
                // Check types
                //      Just adding errors for problems I actually run into
                if (!(callback instanceof Function))
                    throw new error_observe_notafunction(callback);
            }

            // Actually install the observation
            {
                let value = obj[prop];
                
                Object.defineProperty(obj, prop, {
                    get: () => value,
                    set: (newVal) => {
                        if (value === newVal) return;
                        value = newVal;
                        setTimeout(() => { // Edgecase: Do callbacks in the next runLoop iteration so that when an obj.x observation callback triggers another obj.x update, the original obj.x callback can finish its logic before the callback for the second update runs. Otherwise, after the second callback returns, the "remainder" of the original obj.x callback will run and may revert some of the changes of the second callback. (Not sure this actually happens, but theoretically I think it can) [Nov 2025]
                            for (let cb of obj[`__mf-observers_${prop}__`])
                                cb(obj[prop]);
                        }, 0);
                    },
                });
            }
        }

        obj[`__mf-observers_${prop}__`].push(callback);

        if (triggerImmediately) callback(obj[prop]);
    }

    /**
        There is no 'observeMultiple()' or 'combineCallbacks()' primitive. Instead you can just use this pattern:

            {
                observe(obj,     'prop1', cb, false),
                observe(obj,     'prop2', cb, false),
                listen(pickerEl, 'input', cb, false),
                cb();
                function cb() {
                    mflog(`prop1 or prop2 or pickerEl changed!`);
                }
            }

            -> Super clean and easy.

            TODO: Maybe add this to `Idea - quote-unquote-framework`

        Discussion of triggerImmediately arg:
            The user will usually want `triggerImmediately = true` for observe(), but not when using it in combineCallbacks().
            The user will usually want `triggerImmediately = false` for listen(),
            -> We're not using default values to reduce footguns and keep consistency. (Not sure if that's the right choice)
    */

// MARK: Errors

function error_observe_notafunction(callback) {
    return new Error(dedent(`
        observe():
        The 'callback' argument (${callback}) is not a function.
    `))
}

function error_observe_footgun1() {
    
    return new Error(dedent(`
        observe():
        Property '${prop}' on object '${obj}' already has a getter/setter and may not be observable.
        
        Tip: For HTMLElements, you may have to listen() for 'input', 'change', etc. instead of observing properties such as 'value' directly.
    `));

}

function error_wrapInCustomElement_footgun1(this_) {

    return new Error(dedent( // TODO: Clean up the terminology. Maybe shorten this.
        `
        
        No initialization closure found for mf-component instance with id ${this_.dataset.instanceid}.

        ---

        This can happen if you try to add the HTML string returned 
        by ${wrapInCustomElement.name} to the DOM more than once.
        The first time that the HTML string is added to the DOM, 
        the browser parses it into an HTMLElement object, and then the initialization 
        closure that was passed to ${wrapInCustomElement.name} runs
        to initialize that object. 
        After that, the initialization closure is deleted to avoid memory leaks.

        When the same HTML string is added to the DOM a second time, 
        a new object is instantiated and it would need 
        the initialization closure to run again to become initialized.
        However, the initialization closure will already have been deleted. 
        That's the situation that triggers this error.
        
        ---

        Common trigger: 'document.body.innerHTML += newHTML'. 
        -> This deletes all the HTMLElement objects from document.body 
            before recreating them from the (innerHTML+newHTML) string. 
        
        But there are easy solutions in this case:

        Instead of '.innerHTML +=', you can use: 
            document.body.insertAdjacentHTML('beforeend', newHTML);
        or 
            document.body.appendChild(newHTML_renderedToObjects)
        
        This lets you manipulate the document.body without having 
        all the objects from the old HTML string be re-rendered.
        
        Or recreate the HTML string 'properly' instead of reusing the old HTML string:
            Bad: 
                let storedCounterHTML = counterContainer.innerHTML;
                counterContainer.innerHTML = '';
                // ... Later
                counterContainer.innerHTML = storedCounterHTML;
            Good: 
                let storedCount = counterContainer.firstChild.count;
                counterContainer.innerHTML = '';
                // ... Later:
                counterContainer.innerHTML = Counter({ initialCount: storedCount }); 
                // ^ The Counter() component-function calls ${wrapInCustomElement.name} and passes it a fresh initialization closure.
            
        ---
        
        General principle:
        The HTML strings returned by ${wrapInCustomElement.name} are single use!
        They can only be rendered once.
        Either manipulate the DOM objects directly 
        ('document.body.appendChild()' etc.)
        Or run the original code that generated the HTML string
        (and called ${wrapInCustomElement.name}) again before adding that string. 
        You can't remove an HTML string from the DOM, then store it/manipulate it and add it 
        back later.
        
        Discussion: 
        It's maybe a bit annoying, but I think it allows to keep the rest of the mini-framework.js 
        API more simple and practical.
        
        I think it'll be fine in practice. 
        Relating this to AppKit/UIKit, it the restriction here 
        is analogous to not allowing views to be serialized as interface builder files and 
        back by the user. Which is something you never do.
        It's just a bit easier to do this accidentally in webdev due to APIs like .innerHTML,
        But I don't think it's ever necessary.

        Alternative solutions:
            We do the instance-specific initialization closures so that when you have a
            MyComponent(a, b, c) function, you can use a, b, and c in the initialization 
            closure that MyComponent passes to ${wrapInCustomElement.name}.
            
            If you made the initialization functions component-function-specific, then you could just store 
            them globally and not worry about leaking too much memory, but then if you capture
            a, b, or c in the closure, that's a footgun, because a, b, and c will only 
            be captured the first time that MyComponent() is called.
            You would then probably have people define the initialization closure outside of 
            the main MyComponent() function to avoid this accidental capturing of the args.
            But that makes everything less local and more annoying to write in 
            the common case. Feels like the cost isn't worth it.

            You could also maybe just not have arguments for the component functions to 
            avoid the footgun. I'm not sure how you would warn people if they're
            'doing it wrong' though and it might also be an annoying restriction in practise.

            You could keep the instance-specific initialization closures and just store them
            globally and mark them as 'has run already' and give the user a 'flush' function
            if they take up too much memory. But then the same problems can appear after they've
            flushed things. Not sure how this would play out in practise.

            Everything kinda seems worse than what we currently have:
            Instance-specific initialization closures that auto-cleanup 
            after they are run. And when the instance is added to the DOM 
            a second time we can easily detect that and immediately throw 
            an informative error.

            ... More ideas:

            Don't make MyComponent() functions return HTML, make them return rendered objects instead. 
                -> They would store their data and not need to be re-initialized.
                However, then you wouldn't have the nice mixing of writing plain HTML with 
                components interpolated in between.
                You'd have to write everything as a DSL of nested component-functions.
                Also you loose the nice 'progressive complexity' where simple components can 
                just be functions that return HTML strings and nothing else.

            Just leak all the closures.
                Maybe the memory use is so negligible that it never matters. 
                (I haven't tested this.)
                ... But with the virtual scrolling we implemented in FastList(), we could leak millions of items very easily – I don't think that's good.

        ---

        "The real issue is that when the browser re-parses the HTML string, it creates a new object that needs the now-deleted closure"
        ...  
    `)); 
}

// MARK: Internal helpers

    import { dedent } from "./utils.js"; // TODO: Organize these internal helpers.
    let debounceTimers = {}
    export const debounce = (key, delay, fn) => {
        clearTimeout(debounceTimers[key]);
        debounceTimers[key] = setTimeout(fn, delay);
    };
