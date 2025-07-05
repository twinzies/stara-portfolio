# Image of the Day Collection

This folder contains images that can be displayed in the "Image of the Day" feature on the portfolio website.

## Current Images

- `1.jpg` - Image 1
- `2.jpg` - Image 2
- `3.jpg` - Image 3
- `4.jpg` - Image 4
- `5.jpg` - Image 5
- `6.jpg` - Image 6
- `7.jpg` - Image 7
- `8.jpg` - Image 8
- `9.jpg` - Image 9
- `10.jpg` - Image 10
- `11.jpg` - Image 11
- `12.jpg` - Image 12
- `13.jpg` - Image 13
- `14.jpg` - Image 14
- `15.jpg` - Image 15

## Adding New Images

1. **Add image files** to this folder (`/images/image-of-day/`)
2. **Update the JavaScript** in `/js/index.js` by adding new entries to the `images` array:

```javascript
{ src: './images/image-of-day/your-new-image.jpg', caption: 'Your image description' }
```

## Image Requirements

- **Formats**: JPG, PNG, WebP
- **Size**: Optimally 800-1200px wide for good quality and fast loading
- **Aspect Ratio**: Any, the modal will handle different ratios gracefully
- **File Size**: Keep under 2MB for good performance

## How It Works

The "Image of the Day" feature selects an image based on the current day of the year, ensuring the same image is shown consistently throughout each day but rotates daily. The formula used is:

```javascript
const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
const imageIndex = dayOfYear % images.length;
```

This means with 15 images, the rotation cycle is 15 days.
