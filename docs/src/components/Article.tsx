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
        "wysiwyg dark:wysiwyg-invert sm:wysiwyg-lg md:wysiwyg-xl mx-auto my-24 px-2 pb-40",
        "wysiwyg-blockquote:font-normal wysiwyg-blockquote:not-italic wysiwyg-blockquote:text-default-muted",
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
