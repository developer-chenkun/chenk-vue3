import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

describe("Parse", () => {
  describe("interpolation", () => {
    test("simple interpolation", () => {
      const ast = baseParse("{{message}}");

      expect(ast.children[0]).toStrictEqual({
        type: "interpolation",
        content: {
          type: "simple_expression",
          content: "message",
        },
      });
    });
  });

  describe("element", () => {
    it("simple element div", () => {
      const ast = baseParse("<div></div>");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: "div",
        children: [],
      });
    });
  });

  describe("text", () => {
    it("simple text", () => {
      const ast = baseParse("some text");

      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: "some text",
      });
    });
  });
});

test("hello world", () => {
  const ast = baseParse("<div>Hi,{{message}}</div>");

  expect(ast.children[0]).toStrictEqual({
    type: NodeTypes.ELEMENT,
    tag: "div",
    children: [
      {
        type: NodeTypes.TEXT,
        content: "Hi,",
      },
      {
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: "message",
        },
      },
    ],
  });
});

test.only("should throw error when lack end tag", () => {
  // baseParse("<div><span></div>");
  expect(() => {
    baseParse("<div><span></div>");
  }).toThrow("缺少结束标签:span");
});
