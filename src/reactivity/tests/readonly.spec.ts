import { readonly } from "../reactive";

describe("readonly", () => {
  it("happy path", () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const dummy = readonly(original);
    expect(dummy).not.toBe(original);
    expect(dummy.foo).toBe(1);
  });

  it("warn when call set", () => {
    console.warn = jest.fn();

    const user = readonly({ age: 10 });
    expect(user.age).toBe(10);
    user.age = 11;
    expect(console.warn).toBeCalled();
  });
});
