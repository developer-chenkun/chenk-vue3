import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);
  return createRoot(parseChildren(context, new Array()));
}

function parseChildren(context, ancestors: any[]) {
  console.log("children", ancestors);

  const nodes: any[] = [];
  while (!isEnd(context, ancestors)) {
    let node;
    if (context.source.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (context.source[0] === "<") {
      if (/[a-z]/i.test(context.source[1])) {
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      node = parseText(context);
    }
    nodes.push(node);
  }
  return nodes;
}

function isEnd(context, ancestors) {
  const s = context.source;
  // 2.当遇到结束标签的时候
  if (s.startsWith("</")) {
    for (let i = 0; i < ancestors.length; i++) {
      const tag = ancestors[i].tag;
      if (s.slice(2, 2 + tag.length) === tag) {
        return true;
      }
    }
  }
  // 1.当source有值得时候
  return !s;
}

function parseTextData(context, length) {
  return context.source.slice(0, length);
}

function parseText(context: any): any {
  let endIndex = context.source.length;
  let endTokens = ["{{", "<"];
  for (let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i]);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  const content = parseTextData(context, endIndex);
  advanceBy(context, content.length);
  return {
    type: NodeTypes.TEXT,
    content,
  };
}

function parseElement(context: any, ancestors) {
  const element: any = parseTag(context);

  console.log("--------", ancestors);

  ancestors.push(element);
  element.children = parseChildren(context, ancestors);
  ancestors.pop();

  if (context.source.slice(2, 2 + element.tag.length) === element.tag) {
    parseTag(context);
  } else {
    throw new Error(`缺少结束标签:${element.tag}`);
  }

  return element;
}

function parseTag(context: any) {
  let match: any = /^<\/?([a-z]*)/i.exec(context.source);

  const tag = match && match[1];

  // 删除处理完成的代码
  advanceBy(context, match && match[0].length);
  advanceBy(context, 1);

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

function parseInterpolation(context) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";

  const closeIndex = context.source.indexOf(closeDelimiter, closeDelimiter.length);

  advanceBy(context, openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length;

  const rawContent = parseTextData(context, rawContentLength);

  const content = rawContent.trim();
  // context.source = content.source.slice(rawContentLength + closeDelimiter.length);
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
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
