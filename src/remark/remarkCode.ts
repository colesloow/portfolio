// Remark plugin: transforms fenced code blocks in MDX into <CodeBlock> component instances.
// Skips GLSL blocks with meta="live", which are handled by remarkShader instead.
// If any code block is found and CodeBlock is not already imported, an import declaration
// is injected at the top of the MDX file's ESM section.

// Wraps a string value in the AST structure required for an MDX JSX attribute expression.
// This is needed because MDX attributes cannot use plain string values for dynamic content;
// they require an ESTree-compatible expression node.
function makeStringExpression(value: string) {
    return {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(value),
        data: {
            estree: {
                type: "Program",
                body: [
                    {
                        type: "ExpressionStatement",
                        expression: {
                            type: "Literal",
                            value,
                            raw: JSON.stringify(value),
                        },
                    },
                ],
                sourceType: "module",
            },
        },
    };
}

export default function remarkCode() {
    return (tree: any) => {
        let found = false;

        const visit = (node: any, parent: any) => {
            const isLiveShader = node.lang === "glsl" && (node.meta ?? "").split(" ").includes("live");
            if (node.type === "code" && !isLiveShader) {
                found = true;
                parent.children[parent.children.indexOf(node)] = {
                    type: "mdxJsxFlowElement",
                    name: "CodeBlock",
                    attributes: [
                        {
                            type: "mdxJsxAttribute",
                            name: "code",
                            value: makeStringExpression(node.value),
                        },
                        {
                            type: "mdxJsxAttribute",
                            name: "lang",
                            value: node.lang || "text",
                        },
                    ],
                    children: [],
                };
            }

            if (node.children) {
                node.children.forEach((child: any) => visit(child, node));
            }
        };

        visit(tree, null);

        if (found) {
            // Avoid duplicate imports if the MDX file already imports CodeBlock manually
            const alreadyImported = tree.children.some(
                (n: any) =>
                    n.type === "mdxjsEsm" &&
                    n.data?.estree?.body?.some(
                        (s: any) =>
                            s.type === "ImportDeclaration" &&
                            s.specifiers?.some((sp: any) => sp.local?.name === "CodeBlock")
                    )
            );

            if (!alreadyImported) {
                tree.children.unshift({
                    type: "mdxjsEsm",
                    value: "import CodeBlock from '../../components/CodeBlock.astro'",
                    data: {
                        estree: {
                            type: "Program",
                            body: [
                                {
                                    type: "ImportDeclaration",
                                    specifiers: [
                                        {
                                            type: "ImportDefaultSpecifier",
                                            local: { type: "Identifier", name: "CodeBlock" },
                                        },
                                    ],
                                    source: {
                                        type: "Literal",
                                        value: "../../components/CodeBlock.astro",
                                        raw: "'../../components/CodeBlock.astro'",
                                    },
                                },
                            ],
                            sourceType: "module",
                        },
                    },
                });
            }
        }
    };
}
