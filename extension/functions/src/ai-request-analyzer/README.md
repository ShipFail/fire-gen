# AI Request Analyzer

This README.md file's purpose is only to use JSDoc to describe main function of the module in this directory.

## JSDoc

```js
/**
 * Processes the user prompt to generate a FreGen Job Request and reasoning Contexts.
 *  Uses semantic understanding rather than keyword matching.
 *  Utilizes `zod` for schema validation.
 *
 * @function analyzePrompt
 * @param {string} prompt - The user input prompt to be analyzed.
 * @returns {{ request: object, reasons: string[] }} - An object containing the FireGen Job Request and an array of reasons.
 */
```