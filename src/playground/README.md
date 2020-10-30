# Playground
This is intended for developing features.
Instead of writing out server logic or even tests you can quickly run little snippets of code as you get the initial logic in.

# Building
This is configured to not be part of the build in tsconfig.
If you would like to run things from the transpiled javascript you will have to remove the exclude line.
Also make sure not to forget to remove the comma above!
## Change
```json
"exclude": [
    "node_modules",
    "**/*.test.ts",
    "src/playground"
]
```
## To
```json
"exclude": [
    "node_modules",
    "**/*.test.ts"
]
```