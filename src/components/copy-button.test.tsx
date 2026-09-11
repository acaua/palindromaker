import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import CopyButton from "@/components/copy-button";
import { stubClipboard } from "@/test/stub-clipboard";

afterEach(cleanup);
afterEach(() => {
  vi.useRealTimers();
});

const renderCopyButton = (getText: () => string) =>
  render(
    <CopyButton
      label="Copy text"
      title="Copy it"
      copiedLabel="Copied!"
      getText={getText}
      icon={<span aria-hidden="true">icon</span>}
    />,
  );

describe("CopyButton", () => {
  test("copies getText() and flashes the copied label", async () => {
    const written: string[] = [];
    stubClipboard(async (text) => {
      written.push(text);
    });
    renderCopyButton(() => " palindrome ");

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(written).toEqual([" palindrome "]);
    // the live region announces the feedback for screen readers
    expect(screen.getByRole("status").textContent).toBe("Copied!");
  });

  test("reverts to the resting label after two seconds", async () => {
    vi.useFakeTimers();
    stubClipboard(async () => {});
    renderCopyButton(() => "text");

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByRole("button").textContent).toContain("Copied!");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button").textContent).toContain("Copy text");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("leaves the label alone when the write fails", async () => {
    stubClipboard(async () => {
      throw new Error("denied");
    });
    renderCopyButton(() => "text");

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByRole("button").textContent).toContain("Copy text");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("never writes when disabled", async () => {
    const write = vi.fn();
    stubClipboard(write);
    render(
      <CopyButton
        label="Share"
        title="not now"
        copiedLabel="Copied!"
        getText={() => "text"}
        icon={null}
        disabled
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(write).not.toHaveBeenCalled();
    expect(screen.getByRole("button").textContent).toContain("Share");
    expect(screen.getByRole("button").getAttribute("title")).toBe("not now");
  });
});
