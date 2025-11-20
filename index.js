console.log("hellohellohellooo");
import { renderComponentStuff } from "./render-component-stuff.js";
import { renderInteractiveStuff } from "./render-interactive-stuff.js"

if (1) {
    document.body.innerHTML += `
        <style>
            body {
                font-family: sans-serif;
            }
        </style>
        ${renderComponentStuff()}
    `
}

/// OOP with inheritance using low-level prototype-inheritance primitives, instead of the `new` or `class` features. (They are syntax sugar / abstractions around the same thing as far as I understand.)
/// Supports JSDoc/autocomplete pretty nicely as well.
/// [Nov 2025]
if (0)
{    
    let _getOrCreateInstance = function (_this, proto) { /** Helper function for .new() in our JS OOP pattern. Create new instance when .new() is called directly, but use existing `this` when called by a 'subclass' to init the 'superclass'. */
        return _this === proto ? { __proto__: proto } : _this;
    }

    /** @typedef {{ name: string, eat: () => void }} Animal */
    let AnimalProto = {
    
        /** @returns {Animal} */
        new (name) {
            let obj = _getOrCreateInstance(this, AnimalProto);
            obj.name = name;
            return obj;
        },
        eat() {
            console.log(this.name + ' eats!')
        }
    }

    /** @typedef {{ breed: string, bark: () => void } & Animal} Dog */
    let DogProto = {
        __proto__: AnimalProto,

        /** @returns {Dog} */
        new (name, breed) {
            let obj = _getOrCreateInstance(this, DogProto)
            AnimalProto.new.call(obj, name);
            obj.breed = breed;
            return obj;
        },
        bark() {
            console.log(this.name + ' barks!')
        }
    }
    
    let dog = DogProto.new('Fido', 'Labradoodle')

    console.log(`tha dawg: ${dog.name} | ${dog.breed}`)
    dog.bark()
    dog.eat()
}

if (1) {
    
    
    const html = (strings, ...values) => { /* Helper for lit-html / lit-plugin ... */
        return strings.map((str, i) => str + (values[i] ?? '')).join('');
    };
    
    let interp = "TEMPLOITE STROINGS";

    document.body.innerHTML += `
        <div>
            <style> @scope {
                * { 
                    color: oklch(100% 100% 180);
                }
            } </style>
            <h1 style="display: flex;">
                DA ${interp} ARE OUTTA
            </h1>
            <p >
                CONTROLL
            </p>
        </div>
        <a href="https://google.com"></a>
        <p> llll </p>
    `;
}

if (1) {
    document.body.innerHTML += renderInteractiveStuff();
}