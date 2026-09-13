import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { replaceAll } from "./helpers";

const DID = "did:plc:test";
const RKEY = "3abc";
const URI = `at://${DID}/app.bsky.feed.post/${RKEY}`;
const TEXT = "My favourite: A man, a plan, a canal: Panama! #palindrome";

const tagStart = TEXT.indexOf("#palindrome");
const post = {
  uri: URI,
  cid: "cid",
  author: { did: DID, handle: "pal.bsky.social", displayName: "Pal" },
  record: {
    $type: "app.bsky.feed.post",
    text: TEXT,
    createdAt: "2026-09-08T00:00:00.000Z",
    facets: [
      {
        index: {
          byteStart: Buffer.byteLength(TEXT.slice(0, tagStart)),
          byteEnd: Buffer.byteLength(TEXT),
        },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "palindrome" }],
      },
    ],
  },
  labels: [],
  likeCount: 1,
  repostCount: 0,
  replyCount: 0,
};

// Everything the app fetches from Bluesky is stubbed, so the suite is
// offline and deterministic. The embed iframe is served a blank page so it
// never reaches embed.bsky.app.
const stubEmbed = (page: Page) =>
  page.route("https://embed.bsky.app/**", (route) =>
    route.fulfill({ body: "<!doctype html><title>embed</title>", contentType: "text/html" }),
  );

const stubGetPosts = (page: Page, posts: unknown[]) =>
  page.route("**/xrpc/app.bsky.feed.getPosts*", (route) => route.fulfill({ json: { posts } }));

const stubSearch = (page: Page, posts: unknown[], cursor?: string) =>
  page.route("**/xrpc/app.bsky.feed.searchPosts*", (route) =>
    route.fulfill({ json: cursor ? { posts, cursor } : { posts } }),
  );

const stubResolveHandle = (page: Page) =>
  page.route("**/xrpc/com.atproto.identity.resolveHandle*", (route) =>
    route.fulfill({ json: { did: DID } }),
  );

const stubBluesky = async (page: Page) => {
  await stubGetPosts(page, [post]);
  await stubSearch(page, [post], "next");
  await stubResolveHandle(page);
  await stubEmbed(page);
};

const viewer = (page: Page) => page.getByRole("region", { name: "Shared palindrome" });

test("a #b= link embeds the post and shows only its palindrome", async ({ page }) => {
  await stubBluesky(page);
  await page.goto(`/p#b=${encodeURIComponent(URI)}`);

  await expect(
    page.locator(`iframe[src*="/embed/${DID}/app.bsky.feed.post/${RKEY}"]`),
  ).toBeVisible();
  await expect(viewer(page)).toContainText("A man, a plan, a canal: Panama");
  await expect(viewer(page)).not.toContainText("My favourite");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the empty card checks a pasted post link in place", async ({ page }) => {
  await stubBluesky(page);
  await page.goto("/p");

  await expect(page.getByRole("heading", { name: "Nothing shared here" })).toBeVisible();
  await page
    .getByRole("textbox", { name: /post/ })
    .fill(`https://bsky.app/profile/pal.bsky.social/post/${RKEY}`);
  await page.getByRole("button", { name: "Show palindrome" }).click();

  // same route, new hash: the reader must re-render, not sit on the empty card
  await expect(viewer(page)).toContainText("A man, a plan, a canal: Panama");
  expect(page.url()).toContain("b=");
  // the resolved post moves focus into the viewer (announced by its
  // accessible name), so a screen reader learns the page changed
  await expect(viewer(page)).toBeFocused();
});

test("Explore lists tagged posts and opens one in the viewer", async ({ page }) => {
  await stubBluesky(page);
  await page.goto("/explore");

  await expect(page.getByRole("heading", { name: "Palindromes on Bluesky" })).toBeVisible();
  const check = page.getByRole("button", { name: "Check palindrome" }).first();
  await expect(check).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await check.click();
  await expect(viewer(page)).toContainText("A man, a plan, a canal: Panama");
});

test("Explore reports a throttle and offers a retry", async ({ page }) => {
  await stubEmbed(page);
  await page.route("**/xrpc/app.bsky.feed.searchPosts*", (route) =>
    route.fulfill({ status: 403, body: "" }),
  );
  await page.goto("/explore");

  await expect(page.getByText(/rate-limiting/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("Explore reports a rejected search distinctly", async ({ page }) => {
  await stubEmbed(page);
  await page.route("**/xrpc/app.bsky.feed.searchPosts*", (route) =>
    route.fulfill({ status: 400, body: "" }),
  );
  await page.goto("/explore");

  await expect(page.getByText(/couldn’t process this search/i)).toBeVisible();
});

test("Explore reports an empty page", async ({ page }) => {
  await stubEmbed(page);
  await stubSearch(page, []);
  await page.goto("/explore");

  await expect(page.getByText("No posts found right now.")).toBeVisible();
});

test("a post with no palindrome keeps the embed and says so", async ({ page }) => {
  await stubEmbed(page);
  await stubGetPosts(page, [{ ...post, record: { ...post.record, text: "spoon" } }]);
  await page.goto(`/p#b=${encodeURIComponent(URI)}`);

  await expect(page.getByText("No palindrome found in this post.")).toBeVisible();
  await expect(page.locator(`iframe[src*="/embed/${DID}/"]`)).toBeVisible();
});

test("a restricted post is not extracted", async ({ page }) => {
  await stubEmbed(page);
  await stubGetPosts(page, [{ ...post, labels: [{ val: "porn" }] }]);
  await page.goto(`/p#b=${encodeURIComponent(URI)}`);

  await expect(page.getByText(/logged-out viewers/)).toBeVisible();
  await expect(page.locator('[role="region"]')).toHaveCount(0);
});

test("the editor posts the palindrome to Bluesky", async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = [];
    (window as unknown as { __opened: string[] }).__opened = opened;
    window.open = ((url?: string | URL) => {
      opened.push(url instanceof URL ? url.href : String(url ?? ""));
      return null;
    }) as typeof window.open;
  });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Share" });
  await expect(trigger).toBeEnabled();
  await expect(trigger).toHaveAttribute("title", /Share this palindrome/);
  await trigger.click();

  const post = page.getByRole("button", { name: "Post to Bluesky" });
  await expect(post).toHaveAttribute("title", /Open Bluesky/);
  await post.click();

  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(1);
  expect(opened[0]).toContain("https://bsky.app/intent/compose?text=");
  expect(decodeURIComponent(opened[0])).toContain("/p#t=");

  // no longer a palindrome: the trigger disables with the shared reason
  await replaceAll(page, "hello world");
  await expect(trigger).toBeDisabled();
  await expect(trigger).toHaveAttribute("title", /Finish the palindrome/);
});
