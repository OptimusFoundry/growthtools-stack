import "../src/index.css";
import { showcaseDecorator } from "../src/proto-design-system/storybook/showcaseDecorator";

const preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	decorators: [showcaseDecorator],
};

export default preview;
