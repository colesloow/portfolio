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
            // Skip blocks handled by remarkShader
            if (node.type === "code" && !(node.lang === "glsl" && node.meta === "live")) {
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
