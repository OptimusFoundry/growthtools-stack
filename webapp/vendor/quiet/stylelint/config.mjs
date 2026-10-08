// Stylelint config for an app's own CSS/SCSS on quiet (vendored or installed):
//   // stylelint.config.mjs
//   export default { extends: ["@optimusfoundry/quiet/stylelint/config"], ignoreFiles: ["vendor/quiet/**"] };
// It needs `stylelint` and `stylelint-declaration-strict-value` in the app's devDependencies.
//   - quiet/known-tokens: every var(--q-…) is a token quiet declares; the app invents none.
//   - no raw design values: colour, space, radius, type, duration and z-index come from tokens.
//   - custom properties: the app's own are --app-*, component locals --_*; --q-* only to set
//     quiet's tokens (a product theme).
// Class names are the app's choice; add a selector-class-pattern to enforce its own prefix.
import { strictValue } from "./tokenised.mjs";

export default {
	plugins: ["stylelint-declaration-strict-value", "./index.mjs"],
	rules: {
		"quiet/known-tokens": true,
		"scale-unlimited/declaration-strict-value": strictValue,
		"custom-property-pattern": [
			/^(q-[a-z0-9-]+|app-[a-z0-9-]+|_[a-z0-9-]+)$/,
			{ message: (p) => `--${p}: the app's own custom properties are --app-*, locals --_*` },
		],
	},
};
