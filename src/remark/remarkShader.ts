// Remark plugin: transforms fenced GLSL code blocks marked with meta="live" in MDX
// into <ShaderPlayground> component instances.
// Only blocks matching both lang="glsl" and meta="live" are processed; all others are
// left for remarkCode to handle.
// If any such block is found, a ShaderPlayground import is injected at the top of the file.

// Wraps a string value in the AST structure required for an MDX JSX attribute expression.
// See remarkCode.ts for a full explanation.
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

export default function remarkShader() {
    return (tree: any) => {
        let found = false;

        const visit = (node: any, parent: any) => {
            const tokens: string[] = (node.meta ?? "").split(" ");
            if (node.type === "code" && node.lang === "glsl" && tokens.includes("live")) {
                found = true;
                const attributes: any[] = [
                    {
                        type: "mdxJsxAttribute",
                        name: "code",
                        value: makeStringExpression(node.value),
                    },
                ];
                if (tokens.includes("tall")) {
                    attributes.push({
                        type: "mdxJsxAttribute",
                        name: "previewRatio",
                        value: makeStringExpression("1 / 2"),
                    });
                }
                parent.children[parent.children.indexOf(node)] = {
                    type: "mdxJsxFlowElement",
                    name: "ShaderPlayground",
                    attributes,
                    children: [],
                };
            }

            if (node.children) {
                node.children.forEach((child: any) => visit(child, node));
            }
        };

        visit(tree, null);

        if (found) {
            // Avoid duplicate imports if ShaderPlayground is already imported manually
            const alreadyImported = tree.children.some(
                (n: any) =>
                    n.type === "mdxjsEsm" &&
                    n.data?.estree?.body?.some(
                        (s: any) =>
                            s.type === "ImportDeclaration" &&
                            s.specifiers?.some((sp: any) => sp.local?.name === "ShaderPlayground")
                    )
            );

            if (!alreadyImported) {
                tree.children.unshift({
                    type: "mdxjsEsm",
                    value: "import ShaderPlayground from '../../components/ShaderPlayground.astro'",
                    data: {
                        estree: {
                            type: "Program",
                            body: [
                                {
                                    type: "ImportDeclaration",
                                    specifiers: [
                                        {
                                            type: "ImportDefaultSpecifier",
                                            local: { type: "Identifier", name: "ShaderPlayground" },
                                        },
                                    ],
                                    source: {
                                        type: "Literal",
                                        value: "../../components/ShaderPlayground.astro",
                                        raw: "'../../components/ShaderPlayground.astro'",
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
