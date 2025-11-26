import {mflog} from "./utils";
import {getOutlet, observe} from "./NoFramework/NoFramework";
import {FlexibleList} from "./OtherComponents/FlexibleList";

let html = `
        <label for="pet-select">Choose a pet:</label>
        <select name="pets" id="pet-select">
            ${FlexibleList((item) => `<option value=${item.id}>${item.label}</option>` ).outlet('petlist')}
        </select>
        
        <div>
            <style> @scope {
                :scope {
                    display: flex; flex-direction: column;
                    background-image: linear-gradient(0deg, blue, blueviolet);
                    border-radius: 10px;
                } 
                .item {
                    color: white; padding: 10px 10px 10px 10px; border: 1px black solid;
                    view-transition-name: var(--vt-name);
                }
            } </style>
            ${FlexibleList((item) => `<div class="item" style="--vt-name: item-${item.id}">${item.label}</div>`).outlet('petdivs')}
        </div>
`

let model = {}
{
    model.pets = [
        {id: "", label: "-Please choose an option--"},
        {id: "dog", label: "Dog"},
        {id: "cat", label: "Cat"},
        {id: "hamster", label: "Hamster"},
        {id: "parrot", label: "Parrot"},
        {id: "goldfish", label: "Goldfish"},
        {id: "spider", label: "Spider"},
    ]

    let state = 0;
    let removedAnimal = {id: 'orangutan', label: "Orangutan"};
    setInterval(() => {
        if (state === 0) {
            model.pets.push(removedAnimal);
            mflog(`pushed: ${model.pets.map(x => x.id)}`);
        }
        if (state === 2) {
            removedAnimal = model.pets.pop();
            mflog(`pppped: ${model.pets.map(x => x.id)}`);
        }
        if (state === 1) {
            let popped = model.pets.pop();
            mflog(`popped: ${popped.id}`);
            model.pets.unshift(popped);
        }
        state = (state + 1) % 3;
    }, 1000);
    doLater(() => {
        mflog(`model.pets.push`)

    }, 1000);
}

observe(model, 'pets', () => {
    mflog(`observe pets fired!`);
    model.pets = FlexibleList.wrapArrayInObservableProxy(model.pets);
    getOutlet('petlist').items = model.pets
    getOutlet('petdivs').items = model.pets;
}, true);