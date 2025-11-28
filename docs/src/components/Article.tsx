// I could use FrontMatter, but I just prefer to use a component in mdx. Seems simpler to me.
// See: https://www.josephrex.me/frontmatter-with-nextjs-and-mdx/

export default function Article({
  children,
  title,
  author,
  authorLink,
  date,
}: {
  children: React.ReactNode;
  title: string;
  author: string;
  authorLink: string;
  date: Date;
}) {
  return (
    <article
      className={[
        "mx-auto my-24 max-w-[65ch] px-2 pb-40",
        "prose lg:text-xl",
        // dark:prose-invert sm:prose-lg md:prose-xl",
        "prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-default-muted",
      ].join(" ")}
    >
      {/* https://stackoverflow.com/a/7295013/10476393 */}
      <header>
        <h1>{title}</h1>
        <div className="byline vcard">
          <address className="author">
            By{" "}
            <a rel="author" className="url fn n" href={authorLink}>
              {author}
            </a>
          </address>
          <time dateTime={date.toLocaleDateString()}>
            {date.toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </div>
      </header>
      {children}
    </article>
  );
}
