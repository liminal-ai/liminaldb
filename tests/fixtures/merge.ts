export const MERGE_FIXTURES = {
	/** Content with two distinct fields */
	twoFields: {
		content: "Write {{code}} in {{language}}",
		mergeFields: ["code", "language"],
	},
	/** Content with duplicate field */
	duplicateField: {
		content: "{{language}} is great. I love {{language}}.",
		mergeFields: ["language"],
	},
	/** Content with no fields */
	noFields: {
		content: "Just a plain prompt with no merge fields.",
		mergeFields: [],
	},
	/** Empty content */
	emptyContent: {
		content: "",
		mergeFields: [],
	},
	/** Content with literal placeholder-like text (collision guard) */
	literalPlaceholder: {
		content: "Do not replace %%%MERGE_0_name%%% in output. Field: {{name}}",
		mergeFields: ["name"],
	},
	/** Content with edge cases */
	edgeCases: {
		content:
			"Valid: {{a}}, {{_b}}, {{c_1}}. Invalid: {{}}, {{ x }}, {{foo.bar}}",
		mergeFields: ["a", "_b", "c_1"],
	},
} as const;
