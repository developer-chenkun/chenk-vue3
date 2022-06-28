import { isReactive, isReadonly, reactive, readonly } from "../reactive";
describe("reactive", () => {
  it("happy path", () => {
    const original = { foo: 1 };
    const observe = reactive(original);
    expect(observe).not.toBe(original);
    // console.log(observe.foo);

    // expect(observe.foo).toBe(1);
  });

  it("isReactive", () => {
    const original = { foo: 1 };
    const observe = reactive(original);
    expect(isReactive(original)).toBe(false);
    expect(isReactive(observe)).toBe(true);
  });

  it("isReadOnly", () => {
    const original = { foo: 1 };
    const observe = readonly(original);
    expect(isReadonly(original)).toBe(false);
    expect(isReadonly(observe)).toBe(true);
  });

  test("nested reactive", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });
});
