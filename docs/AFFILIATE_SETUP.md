# Affiliate Link Setup Guide

Color Commentary includes "Find on..." buttons that link to external platforms. You can monetize these with affiliate programs.

## Amazon Associates

1. **Sign up**: [affiliate-program.amazon.com](https://affiliate-program.amazon.com/)
2. **Get your tag**: After approval, you'll get a tracking ID like `colorcommentary-20`
3. **Configure**: In `src/utils/mediaLinks.js`, set the `AFFILIATE_TAG` constant:
   ```javascript
   const AFFILIATE_TAG = 'colorcommentary-20'
   ```
4. **How it works**: All Amazon links will automatically append `&tag=colorcommentary-20`
5. **Commission**: 1-10% depending on product category (books: 4.5%, digital video: 2.5%)

## Bookshop.org (Indie Bookstores)

1. **Sign up**: [bookshop.org/affiliates](https://bookshop.org/info/about-bookshop-affiliates)
2. **Get your ID**: You'll receive an affiliate ID number
3. **Configure**: In `src/utils/mediaLinks.js`, set the `BOOKSHOP_ID` constant:
   ```javascript
   const BOOKSHOP_ID = '12345'
   ```
4. **How it works**: Links will use `bookshop.org/a/12345/search?keywords=...`
5. **Commission**: 10% of the cover price
6. **Why Bookshop.org**: Supports independent bookstores. Users love this option.

## Apple Services Performance Partners

1. **Sign up**: [performance-partners.apple.com](https://performance-partners.apple.com/)
2. **Get approved**: Apple reviews applications manually
3. **Generate links**: Use their link generator tool or append your affiliate token to URLs
4. **Covers**: Apple Music, Apple TV+, Apple Books, Apple Podcasts
5. **Commission**: Varies by service and region

## Spotify

- Spotify does **not** have a traditional affiliate program
- However, linking to Spotify drives engagement and is good for users
- Consider joining the [Spotify for Developers](https://developer.spotify.com/) program for API access to show real-time data (now playing, album art, etc.)

## Implementation Notes

- All affiliate links open in new tabs (`target="_blank"`)
- The `rel="noopener noreferrer"` attribute is included for security
- Links use search URLs rather than direct product URLs, so they work without API integration
- Future enhancement: Use Spotify/TMDB/Google Books APIs to link directly to specific items

## Disclosure Requirements

**FTC requires disclosure** when using affiliate links. Add a small note in your app footer or about page:

> "Some links on this site are affiliate links. We may earn a small commission if you purchase through them, at no extra cost to you."

This is legally required in the US and good practice globally.
