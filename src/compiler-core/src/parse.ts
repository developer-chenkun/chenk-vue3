export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context));
}

function parseChildren(context) {
  const nodes: any[] = [];
  const node = parseInterpolation(context);
  nodes.push(node);
  return nodes;
}

function parseInterpolation(context) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(closeDelimiter, closeDelimiter.length);

  advanceBy(context, openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length;

  const content = context.source.slice(0, rawContentLength);

  // context.source = content.source.slice(rawContentLength + closeDelimiter.length);
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: "interpolation",
    content: {
      type: "simple_expression",
      content: "message",
    },
  };
}

function advanceBy(context, length: number) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return {
    children,
  };
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}
