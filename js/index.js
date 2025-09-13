$(document).ready(function() {
    // Publication hover effects
    $('.publication-mousecell').mouseover(function() {
        $(this).find('video').css('display', 'inline-block');
        $(this).find('img').css('display', 'none');
    });
    $('.publication-mousecell').mouseout(function() {
        $(this).find('video').css('display', 'none');
        $(this).find('img').css('display', 'inline-block');
    });

    // Simple mobile navbar toggle
    $('.navbar-burger').click(function() {
        $('.navbar-burger').toggleClass('is-active');
        $('.navbar-menu').toggleClass('is-active');
    });

    // Close mobile menu when clicking on a link
    $('.navbar-item').click(function() {
        $('.navbar-burger').removeClass('is-active');
        $('.navbar-menu').removeClass('is-active');
    });
})

// Image of the Day functionality
function showImageOfDay() {
    // Array of images from the image-of-day folder
    const images = [
        { src: './images/image-of-day/1.jpg', caption: 'Image 1' },
        { src: './images/image-of-day/2.jpg', caption: 'Image 2' },
        { src: './images/image-of-day/3.jpg', caption: 'Image 3' },
        { src: './images/image-of-day/4.jpg', caption: 'Image 4' },
        { src: './images/image-of-day/5.jpg', caption: 'Image 5' },
        { src: './images/image-of-day/6.jpg', caption: 'Image 6' },
        { src: './images/image-of-day/7.jpg', caption: 'Image 7' },
        { src: './images/image-of-day/8.jpg', caption: 'Image 8' },
        { src: './images/image-of-day/9.jpg', caption: 'Image 9' },
        { src: './images/image-of-day/10.jpg', caption: 'Image 10' },
        { src: './images/image-of-day/11.jpg', caption: 'Image 11' },
        { src: './images/image-of-day/12.jpg', caption: 'Image 12' },
        { src: './images/image-of-day/13.jpg', caption: 'Image 13' },
        { src: './images/image-of-day/14.jpg', caption: 'Image 14' },
        { src: './images/image-of-day/15.jpg', caption: 'Image 15' },
        { src: './images/image-of-day/16.jpg', caption: 'Image 16' },
        { src: './images/image-of-day/17.jpg', caption: 'Image 17' },
        { src: './images/image-of-day/18.jpg', caption: 'Image 18' },
        { src: './images/image-of-day/19.jpg', caption: 'Image 19' }
    ];
    
    // Get today's date and use it to select an image
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const imageIndex = dayOfYear % images.length;
    const todaysImage = images[imageIndex];
    
    // Add some debugging
    console.log('Day of year:', dayOfYear);
    console.log('Image index:', imageIndex);
    console.log('Selected image:', todaysImage);
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal is-active" id="imageOfDayModal">
            <div class="modal-background" onclick="closeImageOfDay()"></div>
            <div class="modal-content">
                <div class="box">
                    <h3 class="title is-4">Image of the Day</h3>
                    <p class="has-text-centered mb-3">Day ${dayOfYear} of ${new Date().getFullYear()}</p>
                    <figure class="image">
                        <img src="${todaysImage.src}" 
                             alt="${todaysImage.caption}" 
                             style="max-height: 70vh; object-fit: contain; width: 100%;"
                             onload="console.log('Image loaded successfully')"
                             onerror="console.error('Failed to load image:', this.src); this.style.display='none'; this.parentNode.innerHTML='<p>Image not found</p>';">
                    </figure>
                    <p class="has-text-centered mt-3" style="font-style: italic; font-size: 0.875rem; color: #666;">
                        © Tara K. Jain 2025. All rights reserved. Use for AI/ML training prohibited.
                    </p>
                </div>
            </div>
            <button class="modal-close is-large" onclick="closeImageOfDay()"></button>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeImageOfDay() {
    const modal = document.getElementById('imageOfDayModal');
    if (modal) {
        modal.remove();
    }
}
