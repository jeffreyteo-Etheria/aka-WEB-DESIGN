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
