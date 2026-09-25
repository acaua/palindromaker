import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import AccountForm from "@/components/account-form";
import { BSKY_DID } from "@/test/bluesky-post";

afterEach(cleanup);

const submit = (value: string) => {
  cleanup();
  const onSubmitAccount = vi.fn();
  render(<AccountForm onSubmitAccount={onSubmitAccount} />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
  return onSubmitAccount;
};

describe("AccountForm", () => {
  test("normalizes supported account forms", () => {
    expect(submit("Alice.bsky.social")).toHaveBeenCalledWith("alice.bsky.social");
    expect(submit("@Alice.bsky.social")).toHaveBeenCalledWith("alice.bsky.social");
    expect(submit("https://bsky.app/profile/alice.bsky.social")).toHaveBeenCalledWith(
      "alice.bsky.social",
    );
    expect(submit(BSKY_DID)).toHaveBeenCalledWith(BSKY_DID);
  });

  test("shows an error for invalid input", () => {
    const onSubmitAccount = submit("not an account");
    expect(onSubmitAccount).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("account");
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
  });
});
