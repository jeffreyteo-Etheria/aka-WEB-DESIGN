/* Retired AKA platform names → current names. The platform was renamed
   (SocialMind → SocialOS, GeoMind → DiscoveryOS, AdsMind → PerformanceOS,
   CRMMind → GrowthOS), but older CMS content (case studies, blog posts)
   lives in the CMS store and still says the old names. This runs over every
   built page so the live site only ever shows the current names.

   Case-sensitive on purpose: product subdomains such as
   socialmind.akadigital.net are lowercase and must not be rewritten. */

const RENAMES = [
  [/\bSocialMind\b/g, 'SocialOS'],
  [/\bSOCIALMIND\b/g, 'SOCIALOS'],
  [/\bGeoMind\b/g, 'DiscoveryOS'],
  [/\bGEOMIND\b/g, 'DISCOVERYOS'],
  [/\bAdsMind\b/g, 'PerformanceOS'],
  [/\bADSMIND\b/g, 'PERFORMANCEOS'],
  [/\bCRMMind\b/g, 'GrowthOS'],
  [/\bCRMMIND\b/g, 'GROWTHOS'],
];

function applyBrandNames(html) {
  if (typeof html !== 'string') return html;
  for (const [re, name] of RENAMES) html = html.replace(re, name);
  return html;
}

module.exports = { applyBrandNames };
