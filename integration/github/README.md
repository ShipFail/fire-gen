# Install From GitHub

Use this flow to install the FireGen extension directly from a GitHub repository while it is under active development.

1. Push the `extension/` directory to a GitHub repo that your Firebase project can access.
2. In the Firebase console, open **Extensions → Create from source** and provide the raw `extension` folder URL (for example the zip download URL for the branch).
3. Confirm that `extension.yaml` resolves the `functions` source to the compiled `lib/` directory and that required IAM roles exist in your project before installing.
4. After every local change run `npm run build` in `extension/functions` and push the updated `lib/` output.
5. Reinstall or update the extension from the console when you need to test the new version.
