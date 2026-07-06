module.exports = function (eleventyConfig) {
  // Pass through static assets — map public/* contents to dist root, not dist/public/
  eleventyConfig.addPassthroughCopy({ "public": "." });
  eleventyConfig.addPassthroughCopy({ "locales": "locales" });

  // Watch CSS source for changes during dev
  eleventyConfig.addWatchTarget("src/styles/");

  // Filter: format a date for display
  eleventyConfig.addFilter("dateFormat", function (dateVal) {
    return new Date(dateVal).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Filter: find a solution by slug from the solutions array
  eleventyConfig.addFilter("findBySlug", function (arr, slug) {
    return (arr || []).find((item) => item.slug === slug);
  });

  // Filter: where — filter array by truthy key (replaces Jinja2 selectattr)
  eleventyConfig.addFilter("where", function (arr, key) {
    return (arr || []).filter((item) => item[key]);
  });

  // Filter: first — get first N elements (default 1, returns element not array)
  eleventyConfig.addFilter("first", function (arr, count) {
    if (count !== undefined) return (arr || []).slice(0, count);
    return (arr || [])[0];
  });

  // Filter: publishedOnly — hides draft content (blogs/case studies/events/
  // jobs) from every public listing, feed, and sitemap. Individual detail
  // pages gate separately since they look up by slug, not by iterating.
  eleventyConfig.addFilter("publishedOnly", function (arr) {
    return (arr || []).filter((item) => item.status === "published");
  });

  // Filter: event card date line. Most events just have a real date + location,
  // formatted automatically; a few historical entries only ever had an
  // approximate label ("2023", "Webinar") with no real date, so date_label
  // overrides rather than showing a manufactured, falsely-precise date.
  eleventyConfig.addFilter("eventDateDisplay", function (ev) {
    if (ev.date_label) return ev.date_label;
    const d = ev.date ? new Date(ev.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
    return ev.location ? `${d} — ${ev.location}` : d;
  });

  // Shortcode: current year for footer copyright
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
