// Generated from ListWithCategories.tsx. Run npm run build:shared after editing.
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function NativeLink({ className, children, ...props }) {
  return /* @__PURE__ */ jsx("a", { ...props, className: ["break-words", className].filter(Boolean).join(" "), children });
}
function formatNoteDate(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("zh-Hant-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date(date)).map((part) => [part.type, part.value])
  );
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}
const formatDate = (date, locale) => new Intl.DateTimeFormat(locale, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC"
}).format(new Date(date));
function Pagination({ totalPages, currentPage, basePath, hrefForPage }) {
  const Link = "a";
  const pageHref = hrefForPage || ((page) => page === 1 ? `/${basePath}/` : `/${basePath}/page/${page}`);
  const prevPage = currentPage - 1 > 0;
  const nextPage = currentPage + 1 <= totalPages;
  return /* @__PURE__ */ jsx("div", { className: "space-y-2 pt-6 pb-8 md:space-y-5", children: /* @__PURE__ */ jsxs("nav", { className: "flex justify-between", children: [
    !prevPage && /* @__PURE__ */ jsx("button", { className: "cursor-auto disabled:opacity-50", disabled: !prevPage, children: "\u4E0A\u4E00\u9801" }),
    prevPage && /* @__PURE__ */ jsx(Link, { href: pageHref(currentPage - 1), rel: "prev", children: "\u4E0A\u4E00\u9801" }),
    /* @__PURE__ */ jsxs("span", { children: [
      currentPage,
      "/",
      totalPages
    ] }),
    !nextPage && /* @__PURE__ */ jsx("button", { className: "cursor-auto disabled:opacity-50", disabled: !nextPage, children: "\u4E0B\u4E00\u9801" }),
    nextPage && /* @__PURE__ */ jsx(Link, { href: pageHref(currentPage + 1), rel: "next", children: "\u4E0B\u4E00\u9801" })
  ] }) });
}
function ListWithCategories({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
  categories,
  activeTag = "",
  rootHref,
  rootLabel,
  rootActive = false,
  rssHref,
  rssTitle,
  locale = "zh-Hant-TW",
  LinkComponent = NativeLink,
  TagComponent
}) {
  const Link = LinkComponent;
  const Tag = TagComponent || (({ text }) => {
    const tag = categories.find((item) => item.displayName === text);
    return tag ? /* @__PURE__ */ jsx(
      "a",
      {
        href: tag.href,
        className: "text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 mr-3 text-sm font-medium uppercase",
        children: text
      }
    ) : null;
  });
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts;
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 pt-6 pb-6", children: [
      /* @__PURE__ */ jsx("h1", { className: "heading-accent text-3xl leading-9 font-extrabold tracking-tight sm:hidden sm:text-4xl sm:leading-10 md:text-6xl md:leading-14", children: title }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          href: rssHref,
          type: "application/rss+xml",
          className: "hover:text-primary-500 dark:hover:text-primary-400 ml-auto inline-flex items-center gap-2 font-medium text-gray-600 transition-colors dark:text-gray-300",
          "aria-label": rssTitle,
          children: [
            /* @__PURE__ */ jsxs(
              "svg",
              {
                className: "h-5 w-5",
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                children: [
                  /* @__PURE__ */ jsx("path", { fill: "none", d: "M4 11a9 9 0 0 1 9 9" }),
                  /* @__PURE__ */ jsx("path", { fill: "none", d: "M4 4a16 16 0 0 1 16 16" }),
                  /* @__PURE__ */ jsx("circle", { fill: "none", cx: "5", cy: "19", r: "1" })
                ]
              }
            ),
            rssTitle
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex sm:space-x-24", children: [
      /* @__PURE__ */ jsx("div", { className: "hidden h-full max-h-screen max-w-[280px] min-w-[280px] flex-wrap overflow-auto rounded-sm bg-gray-100 pt-5 shadow-md sm:flex dark:bg-gray-800/70 dark:shadow-gray-800/40", children: /* @__PURE__ */ jsxs("div", { className: "px-6 py-4", children: [
        rootActive ? /* @__PURE__ */ jsx("h3", { className: "text-primary-500 font-bold uppercase", children: rootLabel }) : /* @__PURE__ */ jsx(
          Link,
          {
            href: rootHref,
            className: "hover:text-primary-500 dark:hover:text-primary-500 font-bold text-gray-700 uppercase dark:text-gray-300",
            children: rootLabel
          }
        ),
        /* @__PURE__ */ jsx("ul", { children: categories.map(({ id, displayName, count, href }) => {
          return /* @__PURE__ */ jsx("li", { className: "my-3", children: activeTag === id ? /* @__PURE__ */ jsx("h3", { className: "text-primary-500 inline px-3 py-2 text-sm font-bold uppercase", children: `${displayName} (${count})` }) : /* @__PURE__ */ jsx(
            Link,
            {
              href,
              className: "hover:text-primary-500 dark:hover:text-primary-500 px-3 py-2 text-sm font-medium text-gray-500 uppercase dark:text-gray-300",
              "aria-label": `\u6AA2\u8996\u985E\u5225 ${displayName}`,
              children: `${displayName} (${count})`
            }
          ) }, id);
        }) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("ul", { children: displayPosts.map((post) => {
          const { path, href, date, title: title2, subtitle, summary, html, tags, noteId } = post;
          return /* @__PURE__ */ jsx("li", { className: "py-5", children: /* @__PURE__ */ jsxs("article", { className: "flex flex-col space-y-2 xl:space-y-0", "data-note-id": noteId, children: [
            /* @__PURE__ */ jsxs("dl", { children: [
              /* @__PURE__ */ jsx("dt", { className: "sr-only", children: "\u767C\u4F48\u65BC" }),
              /* @__PURE__ */ jsx("dd", { className: "text-base leading-6 font-medium text-gray-500 dark:text-gray-400", children: /* @__PURE__ */ jsx("time", { dateTime: date, suppressHydrationWarning: true, children: noteId ? formatNoteDate(date) : formatDate(date, locale) }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h2", { className: "text-2xl leading-8 font-bold tracking-tight", children: /* @__PURE__ */ jsx(Link, { href, className: "title-link", children: title2 }) }),
                subtitle && /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg leading-7 font-semibold text-gray-700 dark:text-gray-300", children: subtitle }),
                /* @__PURE__ */ jsx("div", { className: "flex flex-wrap", children: tags?.map((tag) => /* @__PURE__ */ jsx(Tag, { text: tag }, tag)) })
              ] }),
              html !== void 0 ? /* @__PURE__ */ jsx(
                "div",
                {
                  className: "prose dark:prose-invert max-w-none text-gray-500 dark:text-gray-400",
                  dangerouslySetInnerHTML: { __html: html }
                }
              ) : /* @__PURE__ */ jsx("div", { className: "prose dark:prose-invert max-w-none text-gray-500 dark:text-gray-400", children: summary })
            ] })
          ] }) }, path);
        }) }),
        pagination && pagination.totalPages > 1 && /* @__PURE__ */ jsx(
          Pagination,
          {
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            basePath: pagination.basePath,
            hrefForPage: pagination.hrefForPage
          }
        )
      ] })
    ] })
  ] }) });
}
export {
  ListWithCategories as default,
  formatNoteDate
};
