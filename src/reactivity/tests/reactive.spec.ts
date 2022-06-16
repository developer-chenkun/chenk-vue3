import { isReactive, isReadOnly, reactive, readonly } from "../reactive";
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
    expect(isReadOnly(original)).toBe(false);
    expect(isReadOnly(observe)).toBe(true);
  });
});
