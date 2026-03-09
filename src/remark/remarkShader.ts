export default function remarkShader() {
    return (tree: any) => {
        const visit = (node: any, parent: any) => {
            if (node.type === "code" && node.lang === "glsl" && node.meta === "live") {
                parent.children[parent.children.indexOf(node)] = {
                    type: "mdxJsxFlowElement",
                    name: "ShaderPlayground",
                    attributes: [
                        {
                            type: "mdxJsxAttribute",
                            name: "code",
                            value: node.value,
                        },
                    ],
                };
            }

            if (node.children) {
                node.children.forEach((child: any) => visit(child, node));
            }
        };

        visit(tree, null);
    };
}
