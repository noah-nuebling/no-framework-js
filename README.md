
Writing simple web stuff.
Also see `Idea - quote-unquote-framework` in our notes repo.

Couldn't get any of the VSCode plugins for inline-HTML autocomplete to work properly - In Webstorm this all works super well out of the box. (
This is very useful for the quote-unquote-framework) [Nov 2025] 

Running:

- Open Chrome like this:
    open -a /Applications/Google\ Chrome.app/ --args --allow-file-access-from-files
- Then just open index.html

Additional notes on NoFramework [Dec 2025]

    - This Reddit thread sounds like **there is interest** in something like this:
        https://www.reddit.com/r/AskProgramming/comments/1puhkhg/why_is_the_modern_web_so_slow/

    - Recently been thinking: Biggest downside to current NoFramework is **no hot reloading**
        - Experience: For the MMF website I did layout debugging + design directly in the browser thanks to hot-reloading + inline CSS (tailwind) 
            -> Very valuable!
        - Doubts: How easy is this to implement on top of NoFramework? Do you need a "components are a function of state"-type component system with shadow DOM and stuff to make this work? Is this where the React/Vue model really starts making sense?
        -> SOLUTION:
            After thinking it through – You can get very ergonomic hot-reloading experience on top of NoFramework! There are two parts to the solution:
                1. Simple persistentModel() helper, that wraps window.localStorage
                2. Dev server that reloads when any files change (e.g. Python's `livereload`)
            
            -> More details: See Claude's summary titled "Hot Reloading for Minimal Web Component Framework" at the end of this conversation: https://claude.ai/share/ddce4efb-81b6-4fcd-8fbb-89972786632d

    - Recently heard Adam Wathan (Tailwind creator) talk about something similar - a framework that uses web components to give you much of the same ergonomics of react. i think he said it only made economical sense to sell it and keep it closed source. Was only listening with one ear. [Dec 25 2025]


[Jan 2026] Comments here are full of people recommending WebComponents over React:
https://m.youtube.com/watch?v=AmrBpxAtPrI